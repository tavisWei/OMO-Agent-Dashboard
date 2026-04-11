/**
 * OMO Agent Dashboard - Configuration Writer Module
 * 
 * Saves agent configurations to OMO format:
 * ~/.config/opencode/oh-my-opencode.jsonc
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import os from 'os';
import { AgentConfig, OMOConfig, getConfigPath } from './omo-reader.js';

/**
 * Result of saving OMO configuration
 */
export interface SaveConfigResult {
  success: boolean;
  error?: string;
  path?: string;
}

/**
 * Save an updated agent configuration to OMO config file
 * Updates the agent with the given name, or adds new if not exists
 * 
 * @param agent - Agent configuration to save
 * @param configPath - Optional custom path to config file
 * @returns SaveConfigResult with success status or error
 */
export function saveAgentConfig(agent: AgentConfig, configPath?: string): SaveConfigResult {
  const path = configPath || getConfigPath();
  
  try {
    let config: OMOConfig = { agents: [] };

    if (existsSync(path)) {
      const { readOMOConfig } = require('./omo-reader.js');
      const result = readOMOConfig(path);
      
      if (result.success && result.config) {
        config = result.config;
        if (!config.agents) {
          config.agents = [];
        }
        
        const existingIndex = config.agents.findIndex((a) => a.name === agent.name);
        if (existingIndex >= 0) {
          config.agents[existingIndex] = agent;
        } else {
          config.agents.push(agent);
        }
      } else {
        config.agents = [agent];
      }
    } else {
      const dir = `${os.homedir()}/.config/opencode`;
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      config.agents = [agent];
    }

    const formattedJsonc = JSON.stringify(config, null, 2);
    writeFileSync(path, formattedJsonc, 'utf-8');

    return {
      success: true,
      path,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save config: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Save multiple agent configurations at once
 * 
 * @param agents - Array of agent configurations to save
 * @param configPath - Optional custom path to config file
 * @returns SaveConfigResult with success status or error
 */
export function saveAllAgents(agents: AgentConfig[], configPath?: string): SaveConfigResult {
  const path = configPath || getConfigPath();

  try {
    const dir = `${os.homedir()}/.config/opencode`;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const config: OMOConfig = { agents };

    const formattedJsonc = JSON.stringify(config, null, 2);
    writeFileSync(path, formattedJsonc, 'utf-8');

    return {
      success: true,
      path,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save config: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Delete an agent from OMO configuration by name
 * 
 * @param agentName - Name of agent to delete
 * @param configPath - Optional custom path to config file
 * @returns SaveConfigResult with success status or error
 */
export function deleteAgent(agentName: string, configPath?: string): SaveConfigResult {
  const path = configPath || getConfigPath();

  try {
    if (!existsSync(path)) {
      return {
        success: false,
        error: `Config file not found: ${path}`,
      };
    }

    const { readOMOConfig } = require('./omo-reader.js');
    const result = readOMOConfig(path);

    if (!result.success || !result.config || !result.config.agents) {
      return {
        success: false,
        error: 'No agents to delete',
      };
    }

    const filteredAgents = result.config.agents.filter((a: AgentConfig) => a.name !== agentName);

    if (filteredAgents.length === result.config.agents.length) {
      return {
        success: false,
        error: `Agent not found: ${agentName}`,
      };
    }

    result.config.agents = filteredAgents;

    const formattedJsonc = JSON.stringify(result.config, null, 2);
    writeFileSync(path, formattedJsonc, 'utf-8');

    return {
      success: true,
      path,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete agent: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
