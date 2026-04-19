/**
 * OMO Agent Dashboard - Configuration Reader Module
 * 
 * Reads and parses OMO configuration from:
 * ~/.config/opencode/oh-my-opencode.jsonc
 */

import { readFileSync, existsSync } from 'fs';
import { parse as parseJsonc } from 'jsonc-parser';
import { getOmoPath } from '../utils/paths.js';

export interface AgentConfig {
  name: string;
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  description?: string;
}

export interface OMOConfig {
  agents?: AgentConfig[];
  [key: string]: unknown;
}

export interface ReadConfigResult {
  success: boolean;
  config?: OMOConfig;
  agents?: AgentConfig[];
  error?: string;
}

export function getConfigPath(): string {
  return getOmoPath();
}

/**
 * Read and parse OMO configuration file (JSONC format)
 * 
 * @param configPath - Optional custom path to config file
 * @returns ReadConfigResult with parsed config or error
 */
export function readOMOConfig(configPath?: string): ReadConfigResult {
  const path = configPath || getConfigPath();

  if (!existsSync(path)) {
    return {
      success: false,
      error: `Config file not found: ${path}`,
    };
  }

  try {
    const fileContent = readFileSync(path, 'utf-8');
    
    // Parse JSONC (JSON with Comments) - removes comments before parsing
    const parseErrors: any[] = [];
    const parsedConfig = parseJsonc(fileContent, parseErrors, {
      allowTrailingComma: true,
      disallowComments: false,
    });

    if (parseErrors.length > 0) {
      const firstError = parseErrors[0];
      return {
        success: false,
        error: `JSONC parse error at offset ${firstError.offset}: ${firstError.message}`,
      };
    }

    if (!parsedConfig || typeof parsedConfig !== 'object') {
      return {
        success: false,
        error: 'Invalid config format: expected object',
      };
    }

    const config = parsedConfig as OMOConfig;
    
    return {
      success: true,
      config,
      agents: config.agents || [],
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read config: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get list of agents from OMO configuration
 * 
 * @param configPath - Optional custom path to config file
 * @returns Array of AgentConfig or empty array on error
 */
export function getAgents(configPath?: string): AgentConfig[] {
  const result = readOMOConfig(configPath);
  return result.agents || [];
}

/**
 * Get a specific agent by name
 * 
 * @param name - Agent name to find
 * @param configPath - Optional custom path to config file
 * @returns AgentConfig or undefined if not found
 */
export function getAgentByName(name: string, configPath?: string): AgentConfig | undefined {
  const agents = getAgents(configPath);
  return agents.find((agent) => agent.name === name);
}
