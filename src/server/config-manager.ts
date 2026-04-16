import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyEdits, modify, parse } from 'jsonc-parser';
import type { DashboardConfigSnapshot } from '../types/domain.js';

type JsonObject = Record<string, unknown>;

export interface ConfigManagerError {
  code: 'CONFIG_NOT_FOUND' | 'CONFIG_PARSE_FAILED' | 'CONFIG_WRITE_FAILED';
  message: string;
  path: string;
}

export interface ConfigManagerResult<T> {
  data: T;
  error: ConfigManagerError | null;
}

export interface ConfigPaths {
  openAgentPath: string;
  opencodePath: string;
  omoPath: string;
}

export interface AgentModelUpdate {
  model: string;
  variant?: string;
}

export type RawConfigTarget = 'openagent' | 'opencode' | 'omo';

function getBaseConfigDir(): string {
  return path.join(os.homedir(), '.config', 'opencode');
}

export function getConfigPaths(): ConfigPaths {
  const baseDir = getBaseConfigDir();
  return {
    openAgentPath: process.env.OH_MY_OPENAGENT_CONFIG_PATH || path.join(baseDir, 'oh-my-openagent.json'),
    opencodePath: process.env.OPENCODE_CONFIG_PATH || path.join(baseDir, 'opencode.json'),
    omoPath: process.env.OH_MY_OPENCODE_CONFIG_PATH || path.join(baseDir, 'oh-my-opencode.jsonc'),
  };
}

function readJsonFile(filePath: string): ConfigManagerResult<JsonObject | null> {
  if (!existsSync(filePath)) {
    return {
      data: null,
      error: { code: 'CONFIG_NOT_FOUND', message: 'Config file not found', path: filePath },
    };
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return { data: JSON.parse(content) as JsonObject, error: null };
  } catch (error) {
    return {
      data: null,
      error: { code: 'CONFIG_PARSE_FAILED', message: error instanceof Error ? error.message : String(error), path: filePath },
    };
  }
}

function readRawFile(filePath: string): ConfigManagerResult<string | null> {
  if (!existsSync(filePath)) {
    return {
      data: null,
      error: { code: 'CONFIG_NOT_FOUND', message: 'Config file not found', path: filePath },
    };
  }

  try {
    return { data: readFileSync(filePath, 'utf-8'), error: null };
  } catch (error) {
    return {
      data: null,
      error: { code: 'CONFIG_PARSE_FAILED', message: error instanceof Error ? error.message : String(error), path: filePath },
    };
  }
}

function readJsoncFile(filePath: string): ConfigManagerResult<JsonObject | null> {
  if (!existsSync(filePath)) {
    return {
      data: null,
      error: { code: 'CONFIG_NOT_FOUND', message: 'Config file not found', path: filePath },
    };
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return { data: parse(content) as JsonObject, error: null };
  } catch (error) {
    return {
      data: null,
      error: { code: 'CONFIG_PARSE_FAILED', message: error instanceof Error ? error.message : String(error), path: filePath },
    };
  }
}

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function writeJsonFile(filePath: string, data: JsonObject): ConfigManagerResult<boolean> {
  try {
    ensureDir(filePath);
    writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
    return { data: true, error: null };
  } catch (error) {
    return {
      data: false,
      error: { code: 'CONFIG_WRITE_FAILED', message: error instanceof Error ? error.message : String(error), path: filePath },
    };
  }
}

function writeJsoncPath(filePath: string, jsonPath: (string | number)[], value: unknown): ConfigManagerResult<boolean> {
  try {
    ensureDir(filePath);
    const current = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '{}\n';
    const edits = modify(current, jsonPath, value, {
      formattingOptions: {
        insertSpaces: true,
        tabSize: 2,
      },
      isArrayInsertion: false,
      getInsertionIndex: undefined,
    });
    const next = applyEdits(current, edits);
    writeFileSync(filePath, next, 'utf-8');
    return { data: true, error: null };
  } catch (error) {
    return {
      data: false,
      error: { code: 'CONFIG_WRITE_FAILED', message: error instanceof Error ? error.message : String(error), path: filePath },
    };
  }
}

function writeRawFile(filePath: string, content: string): ConfigManagerResult<boolean> {
  try {
    ensureDir(filePath);
    writeFileSync(filePath, content, 'utf-8');
    return { data: true, error: null };
  } catch (error) {
    return {
      data: false,
      error: { code: 'CONFIG_WRITE_FAILED', message: error instanceof Error ? error.message : String(error), path: filePath },
    };
  }
}

function resolveRawTarget(target: RawConfigTarget): string {
  const paths = getConfigPaths();
  if (target === 'openagent') return paths.openAgentPath;
  if (target === 'opencode') return paths.opencodePath;
  return paths.omoPath;
}

export function getConfigSnapshot(): ConfigManagerResult<DashboardConfigSnapshot | null> {
  const paths = getConfigPaths();
  const openAgent = readJsonFile(paths.openAgentPath);
  const opencode = readJsonFile(paths.opencodePath);
  readJsoncFile(paths.omoPath);
  const error = openAgent.error ?? opencode.error ?? null;

  const openAgentData = (openAgent.data ?? {}) as JsonObject;
  const agentsObject = (openAgentData.agents ?? {}) as Record<string, { model?: string; variant?: string }>;
  const categoriesObject = (openAgentData.categories ?? {}) as Record<string, { model?: string; variant?: string }>;
  const providerObject = ((opencode.data ?? {}).provider ?? {}) as Record<string, unknown>;
  const providerModels = Object.fromEntries(
    Object.entries(providerObject).map(([providerName, providerValue]) => {
      const models = typeof providerValue === 'object' && providerValue !== null && 'models' in providerValue
        ? Object.keys((providerValue as { models?: Record<string, unknown> }).models ?? {})
        : [];
      return [providerName, models];
    }),
  );

  const providerDetails = Object.fromEntries(
    Object.entries(providerObject).map(([providerName, providerValue]) => {
      const pv = (typeof providerValue === 'object' && providerValue !== null ? providerValue : {}) as Record<string, unknown>;
      const opts = (typeof pv.options === 'object' && pv.options !== null ? pv.options : {}) as Record<string, unknown>;
      const apiKeyRaw = typeof opts.apiKey === 'string' ? opts.apiKey : '';
      return [providerName, {
        name: typeof pv.name === 'string' ? pv.name : providerName,
        npm: typeof pv.npm === 'string' ? pv.npm : '',
        baseURL: typeof opts.baseURL === 'string' ? opts.baseURL : '',
        apiKeyMasked: apiKeyRaw.length > 8 ? `${apiKeyRaw.slice(0, 4)}...${apiKeyRaw.slice(-4)}` : apiKeyRaw.length > 0 ? '****' : '',
      }];
    }),
  );

  return {
    data: {
      openAgentPath: paths.openAgentPath,
      opencodePath: paths.opencodePath,
      omoPath: paths.omoPath,
      agents: Object.entries(agentsObject).map(([key, value]) => ({ key, model: value.model ?? '', variant: value.variant })),
      categories: Object.entries(categoriesObject).map(([key, value]) => ({ key, model: value.model ?? '', variant: value.variant })),
      providers: Object.keys(providerObject),
      providerModels,
      providerDetails,
    },
    error,
  };
}

export function getRawConfig(target: RawConfigTarget): ConfigManagerResult<string | null> {
  return readRawFile(resolveRawTarget(target));
}

export function saveRawConfig(target: RawConfigTarget, content: string): ConfigManagerResult<boolean> {
  const filePath = resolveRawTarget(target);

  try {
    if (target === 'omo') {
      parse(content);
    } else {
      JSON.parse(content);
    }
  } catch (error) {
    return {
      data: false,
      error: {
        code: 'CONFIG_PARSE_FAILED',
        message: error instanceof Error ? error.message : String(error),
        path: filePath,
      },
    };
  }

  return writeRawFile(filePath, content);
}

export function updateAgentModel(agentName: string, update: AgentModelUpdate): ConfigManagerResult<boolean> {
  const paths = getConfigPaths();
  const existing = readJsonFile(paths.openAgentPath);
  const root = ((existing.data ?? {}) as JsonObject);
  const agents = ((root.agents ?? {}) as Record<string, JsonObject>);
  const nextAgent = { ...(agents[agentName] ?? {}), model: update.model } as JsonObject;
  if (update.variant !== undefined) {
    nextAgent.variant = update.variant;
  }
  agents[agentName] = nextAgent;
  root.agents = agents;
  return writeJsonFile(paths.openAgentPath, root);
}

export function updateCategoryModel(categoryName: string, update: AgentModelUpdate): ConfigManagerResult<boolean> {
  const paths = getConfigPaths();
  const existing = readJsonFile(paths.openAgentPath);
  const root = ((existing.data ?? {}) as JsonObject);
  const categories = ((root.categories ?? {}) as Record<string, JsonObject>);
  const nextCategory = { ...(categories[categoryName] ?? {}), model: update.model } as JsonObject;
  if (update.variant !== undefined) {
    nextCategory.variant = update.variant;
  }
  categories[categoryName] = nextCategory;
  root.categories = categories;
  return writeJsonFile(paths.openAgentPath, root);
}

export function updateLegacyOmoAgent(agentName: string, update: AgentModelUpdate): ConfigManagerResult<boolean> {
  const paths = getConfigPaths();
  const current = readJsoncFile(paths.omoPath);
  const config = current.data ?? {};
  const agents = Array.isArray(config.agents) ? config.agents as Array<Record<string, unknown>> : [];
  const agentIndex = agents.findIndex((agent) => agent.name === agentName);
  if (agentIndex === -1) {
    agents.push({ name: agentName, model: update.model });
    config.agents = agents;
    return writeJsonFile(paths.omoPath, config);
  }

  const modelWrite = writeJsoncPath(paths.omoPath, ['agents', agentIndex, 'model'], update.model);
  if (modelWrite.error) {
    return modelWrite;
  }

  if (update.variant !== undefined) {
    return writeJsoncPath(paths.omoPath, ['agents', agentIndex, 'variant'], update.variant);
  }

  return { data: true, error: null };
}

export function addProviderModel(provider: string, modelId: string, modelName: string): ConfigManagerResult<boolean> {
  const paths = getConfigPaths();
  const existing = readJsonFile(paths.opencodePath);
  const root = (existing.data ?? {}) as JsonObject;
  const providerObj = (root.provider ?? {}) as Record<string, JsonObject>;
  if (!providerObj[provider]) {
    return { data: false, error: { code: 'CONFIG_WRITE_FAILED', message: `Provider "${provider}" not found in opencode.json`, path: paths.opencodePath } };
  }
  const models = ((providerObj[provider].models ?? {}) as Record<string, JsonObject>);
  models[modelId] = { name: modelName };
  providerObj[provider].models = models;
  root.provider = providerObj;
  return writeJsonFile(paths.opencodePath, root);
}

export function deleteProviderModel(provider: string, modelId: string): ConfigManagerResult<boolean> {
  const paths = getConfigPaths();
  const existing = readJsonFile(paths.opencodePath);
  const root = (existing.data ?? {}) as JsonObject;
  const providerObj = (root.provider ?? {}) as Record<string, JsonObject>;
  if (!providerObj[provider]) {
    return { data: false, error: { code: 'CONFIG_WRITE_FAILED', message: `Provider "${provider}" not found`, path: paths.opencodePath } };
  }
  const models = ((providerObj[provider].models ?? {}) as Record<string, JsonObject>);
  delete models[modelId];
  providerObj[provider].models = models;
  root.provider = providerObj;
  return writeJsonFile(paths.opencodePath, root);
}

export interface ProviderConfig {
  key: string;
  name?: string;
  npm?: string;
  baseURL: string;
  apiKey: string;
}

export function addProvider(cfg: ProviderConfig): ConfigManagerResult<boolean> {
  const paths = getConfigPaths();
  const existing = readJsonFile(paths.opencodePath);
  const root = (existing.data ?? {}) as JsonObject;
  const providerObj = (root.provider ?? {}) as Record<string, JsonObject>;
  if (providerObj[cfg.key]) {
    return { data: false, error: { code: 'CONFIG_WRITE_FAILED', message: `Provider "${cfg.key}" already exists`, path: paths.opencodePath } };
  }
  const entry: JsonObject = {
    options: { baseURL: cfg.baseURL, apiKey: cfg.apiKey },
    models: {},
  };
  if (cfg.name) entry.name = cfg.name;
  if (cfg.npm) entry.npm = cfg.npm;
  providerObj[cfg.key] = entry;
  root.provider = providerObj;
  return writeJsonFile(paths.opencodePath, root);
}

export function updateProvider(key: string, cfg: Partial<Omit<ProviderConfig, 'key'>>): ConfigManagerResult<boolean> {
  const paths = getConfigPaths();
  const existing = readJsonFile(paths.opencodePath);
  const root = (existing.data ?? {}) as JsonObject;
  const providerObj = (root.provider ?? {}) as Record<string, JsonObject>;
  if (!providerObj[key]) {
    return { data: false, error: { code: 'CONFIG_WRITE_FAILED', message: `Provider "${key}" not found`, path: paths.opencodePath } };
  }
  const current = providerObj[key];
  if (cfg.name !== undefined) current.name = cfg.name;
  if (cfg.npm !== undefined) current.npm = cfg.npm;
  const opts = (current.options ?? {}) as JsonObject;
  if (cfg.baseURL !== undefined) opts.baseURL = cfg.baseURL;
  if (cfg.apiKey !== undefined) opts.apiKey = cfg.apiKey;
  current.options = opts;
  providerObj[key] = current;
  root.provider = providerObj;
  return writeJsonFile(paths.opencodePath, root);
}

export function deleteProvider(key: string): ConfigManagerResult<boolean> {
  const paths = getConfigPaths();
  const existing = readJsonFile(paths.opencodePath);
  const root = (existing.data ?? {}) as JsonObject;
  const providerObj = (root.provider ?? {}) as Record<string, JsonObject>;
  if (!providerObj[key]) {
    return { data: false, error: { code: 'CONFIG_WRITE_FAILED', message: `Provider "${key}" not found`, path: paths.opencodePath } };
  }
  delete providerObj[key];
  root.provider = providerObj;
  return writeJsonFile(paths.opencodePath, root);
}
