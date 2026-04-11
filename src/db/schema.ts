/**
 * Database Schema Definitions
 * OMO Agent Dashboard
 * 
 * Tables:
 * - projects: Organization unit for agents and tasks
 * - agents: OMO agent configurations and status
 * - tasks: Work items assigned to agents
 * - cost_records: Token usage and cost tracking
 * - activity_logs: Agent activity history
 */

// Project table - organization unit for agents and tasks
export const CREATE_PROJECTS_TABLE = `
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

// Agent table - OMO agent configurations
export const CREATE_AGENTS_TABLE = `
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  project_id INTEGER,
  model TEXT DEFAULT 'gpt-4',
  temperature REAL DEFAULT 0.7,
  top_p REAL DEFAULT 0.9,
  max_tokens INTEGER DEFAULT 4096,
  status TEXT DEFAULT 'idle',
  last_heartbeat TEXT,
  config_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);
`;

// Task table - work items
export const CREATE_TASKS_TABLE = `
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  agent_id INTEGER,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'backlog',
  position INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
);
`;

// Cost records table - token usage tracking
export const CREATE_COST_RECORDS_TABLE = `
CREATE TABLE IF NOT EXISTS cost_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost REAL DEFAULT 0,
  recorded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
`;

// Activity logs table - agent activity history
export const CREATE_ACTIVITY_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER,
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
`;

// Indexes for better query performance
export const CREATE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_agents_project_id ON agents(project_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_cost_records_agent_id ON cost_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_cost_records_recorded_at ON cost_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_agent_id ON activity_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
`;

// All schema definitions combined
export const ALL_SCHEMA = [
  CREATE_PROJECTS_TABLE,
  CREATE_AGENTS_TABLE,
  CREATE_TASKS_TABLE,
  CREATE_COST_RECORDS_TABLE,
  CREATE_ACTIVITY_LOGS_TABLE,
  CREATE_INDEXES,
].join('\n');

// TypeScript types for database records
export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: number;
  name: string;
  project_id: number | null;
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  status: 'idle' | 'running' | 'error' | 'stopped';
  last_heartbeat: string | null;
  config_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  project_id: number | null;
  agent_id: number | null;
  title: string;
  description: string;
  status: 'backlog' | 'in_progress' | 'done' | 'failed';
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CostRecord {
  id: number;
  agent_id: number | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  recorded_at: string;
}

export interface ActivityLog {
  id: number;
  agent_id: number | null;
  action: string;
  details: string;
  created_at: string;
}
