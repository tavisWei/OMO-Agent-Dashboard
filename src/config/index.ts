/**
 * OMO Agent Dashboard - Configuration Module
 * 
 * Public API exports for reading and writing OMO configuration
 */

export {
  type AgentConfig,
  type OMOConfig,
  type ReadConfigResult,
  getConfigPath,
  readOMOConfig,
  getAgents,
  getAgentByName,
} from './omo-reader.js';

export {
  type SaveConfigResult,
  saveAgentConfig,
  saveAllAgents,
  deleteAgent,
} from './omo-writer.js';
