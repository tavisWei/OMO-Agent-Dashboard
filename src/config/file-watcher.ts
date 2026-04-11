/**
 * OMO Agent Dashboard - File Watcher Module
 * 
 * Monitors OMO configuration file changes and syncs to database.
 * File: ~/.config/opencode/oh-my-opencode.jsonc
 * 
 * Features:
 * - Debounced processing (500ms) to avoid duplicate triggers
 * - Automatic database sync on config changes
 * - WebSocket broadcast to notify frontend
 */

import chokidar, { FSWatcher } from 'chokidar';
import { getConfigPath, getAgents, type AgentConfig } from './omo-reader.js';
import { getDatabase, saveDatabase, getAllAgents, createAgent, updateAgent, deleteAgent } from '../db/index.js';

let watcher: FSWatcher | null = null;
let debounceTimer: NodeJS.Timeout | null = null;

const DEBOUNCE_MS = 500;

async function syncAgentsToDatabase(agents: AgentConfig[]): Promise<void> {
  await getDatabase();
  
  const existingAgents = getAllAgents();
  const existingByName = new Map(existingAgents.map(a => [a.name, a]));
  const configNames = new Set(agents.map(a => a.name));
  
  for (const agentConfig of agents) {
    const existing = existingByName.get(agentConfig.name);
    const defaults = { model: 'gpt-4', temperature: 0.7, top_p: 0.9, max_tokens: 4096 };
    
    if (existing) {
      const hasChanges = 
        existing.model !== (agentConfig.model || defaults.model) ||
        existing.temperature !== (agentConfig.temperature ?? defaults.temperature) ||
        existing.top_p !== (agentConfig.top_p ?? defaults.top_p) ||
        existing.max_tokens !== (agentConfig.max_tokens ?? defaults.max_tokens);
      
      if (hasChanges) {
        updateAgent(existing.id, {
          model: agentConfig.model || defaults.model,
          temperature: agentConfig.temperature ?? defaults.temperature,
          top_p: agentConfig.top_p ?? defaults.top_p,
          max_tokens: agentConfig.max_tokens ?? defaults.max_tokens,
        });
      }
    } else {
      createAgent(
        agentConfig.name,
        null,
        agentConfig.model || defaults.model,
        {
          temperature: agentConfig.temperature ?? defaults.temperature,
          top_p: agentConfig.top_p ?? defaults.top_p,
          max_tokens: agentConfig.max_tokens ?? defaults.max_tokens,
          status: 'idle',
          config_path: getConfigPath(),
        }
      );
    }
  }
  
  for (const existing of existingAgents) {
    if (!configNames.has(existing.name)) {
      deleteAgent(existing.id);
    }
  }
  
  saveDatabase();
}

/**
 * Broadcast config change event to connected WebSocket clients
 */
async function broadcastConfigChange(): Promise<void> {
  try {
    const websocketModule = await import('../server/websocket.js').catch(() => null);
    if (websocketModule?.broadcast) {
      websocketModule.broadcast({
        type: 'config_change',
        payload: { agents: getAgents() },
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.warn('[FileWatcher] Failed to broadcast:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Handle config file change event (debounced)
 */
async function onConfigChange(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  
  debounceTimer = setTimeout(async () => {
    try {
      console.log('[FileWatcher] Config changed, syncing...');
      const agents = getAgents();
      await syncAgentsToDatabase(agents);
      await broadcastConfigChange();
      console.log(`[FileWatcher] Synced ${agents.length} agents to database`);
    } catch (error) {
      console.error('[FileWatcher] Error syncing config:', error instanceof Error ? error.message : String(error));
    }
  }, DEBOUNCE_MS);
}

export function startWatcher(): boolean {
  const configPath = getConfigPath();
  
  if (watcher) {
    console.log('[FileWatcher] Already watching');
    return true;
  }
  
  try {
    watcher = chokidar.watch(configPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });
    
    watcher.on('change', () => {
      console.log('[FileWatcher] Detected config change');
      onConfigChange();
    });
    
    watcher.on('error', (error: unknown) => {
      console.error('[FileWatcher] Watcher error:', error);
    });
    
    watcher.on('unlink', () => {
      console.warn('[FileWatcher] Config file deleted');
      onConfigChange();
    });
    
    console.log(`[FileWatcher] Started watching: ${configPath}`);
    return true;
  } catch (error) {
    console.error('[FileWatcher] Failed to start watcher:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export function stopWatcher(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('[FileWatcher] Stopped watching');
  }
}

export function isWatcherActive(): boolean {
  return watcher !== null;
}