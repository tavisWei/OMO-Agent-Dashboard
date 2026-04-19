import os from 'node:os';
import path from 'node:path';

export function getHomeDir(): string {
  return os.homedir();
}

export function getPlatform(): string {
  return os.platform();
}

export function getConfigDir(): string {
  const platform = getPlatform();
  const home = getHomeDir();

  if (platform === 'win32') {
    return path.join(process.env.APPDATA || home, 'opencode');
  }

  return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'opencode');
}

export function getDataDir(): string {
  const platform = getPlatform();
  const home = getHomeDir();

  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || home, 'opencode');
  }

  return path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'opencode');
}

export function getOpenAgentPath(): string {
  return process.env.OH_MY_OPENAGENT_CONFIG_PATH || path.join(getConfigDir(), 'oh-my-openagent.json');
}

export function getOpencodePath(): string {
  return process.env.OPENCODE_CONFIG_PATH || path.join(getConfigDir(), 'opencode.json');
}

export function getOmoPath(): string {
  return process.env.OH_MY_OPENCODE_CONFIG_PATH || path.join(getConfigDir(), 'oh-my-opencode.jsonc');
}

export function getDbPath(): string {
  return process.env.OPENCODE_DB_PATH || path.join(getDataDir(), 'opencode.db');
}

export function getAllPaths(): {
  openAgentPath: string;
  opencodePath: string;
  omoPath: string;
  dbPath: string;
  configDir: string;
  dataDir: string;
  homeDir: string;
  platform: string;
} {
  return {
    openAgentPath: getOpenAgentPath(),
    opencodePath: getOpencodePath(),
    omoPath: getOmoPath(),
    dbPath: getDbPath(),
    configDir: getConfigDir(),
    dataDir: getDataDir(),
    homeDir: getHomeDir(),
    platform: getPlatform(),
  };
}
