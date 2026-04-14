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
  model_id INTEGER,
  model TEXT DEFAULT 'gpt-4',
  temperature REAL DEFAULT 0.7,
  top_p REAL DEFAULT 0.9,
  max_tokens INTEGER DEFAULT 4096,
  status TEXT DEFAULT 'idle',
  last_heartbeat TEXT,
  config_path TEXT,
  source TEXT NOT NULL DEFAULT 'ui_created',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE SET NULL
);
`;

export const CREATE_MODELS_TABLE = `
CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  description TEXT DEFAULT '',
  pricing_input REAL DEFAULT 0,
  pricing_output REAL DEFAULT 0,
  max_tokens INTEGER DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(provider, model_id)
);
`;

// Task table - work items
export const CREATE_TASKS_TABLE = `
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  agent_id INTEGER,
  parent_task_id INTEGER,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'backlog',
  position INTEGER DEFAULT 0,
  depends_on TEXT DEFAULT '[]',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  labels TEXT DEFAULT '[]',
  due_date INTEGER,
  estimated_tokens INTEGER,
  assigned_agents TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);
`;

export const CREATE_TASK_AGENT_ASSIGNMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS task_agent_assignments (
  task_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('lead', 'worker', 'reviewer')),
  assigned_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (task_id, agent_id, role),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
`;

export const CREATE_TASK_DEPENDENCIES_TABLE = `
CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id INTEGER NOT NULL,
  depends_on_task_id INTEGER NOT NULL,
  dependency_type TEXT NOT NULL DEFAULT 'requires' CHECK (dependency_type IN ('blocks', 'requires')),
  PRIMARY KEY (task_id, depends_on_task_id, dependency_type),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
`;

export const CREATE_TASK_ORCHESTRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS task_orchestrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL UNIQUE,
  pattern TEXT NOT NULL CHECK (pattern IN ('sequential', 'parallel', 'pipeline')),
  agent_order TEXT NOT NULL DEFAULT '[]',
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'step_complete', 'completed', 'failed')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
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
  agent_name TEXT,
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
`;

// Indexes for better query performance
export const CREATE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_agents_project_id ON agents(project_id);
CREATE INDEX IF NOT EXISTS idx_agents_model_id ON agents(model_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider);
CREATE INDEX IF NOT EXISTS idx_models_is_active ON models(is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_cost_records_agent_id ON cost_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_cost_records_recorded_at ON cost_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_agent_id ON activity_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_task_agent_assignments_task_id ON task_agent_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_agent_assignments_agent_id ON task_agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_task_agent_assignments_role ON task_agent_assignments(role);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on_task_id ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_dependency_type ON task_dependencies(dependency_type);
CREATE INDEX IF NOT EXISTS idx_task_orchestrations_task_id ON task_orchestrations(task_id);
CREATE INDEX IF NOT EXISTS idx_task_orchestrations_status ON task_orchestrations(status);
CREATE INDEX IF NOT EXISTS idx_task_orchestrations_pattern ON task_orchestrations(pattern);
`;

// All schema definitions combined
export const ALL_SCHEMA = [
  CREATE_PROJECTS_TABLE,
  CREATE_MODELS_TABLE,
  CREATE_AGENTS_TABLE,
  CREATE_TASKS_TABLE,
  CREATE_TASK_AGENT_ASSIGNMENTS_TABLE,
  CREATE_TASK_DEPENDENCIES_TABLE,
  CREATE_TASK_ORCHESTRATIONS_TABLE,
  CREATE_COST_RECORDS_TABLE,
  CREATE_ACTIVITY_LOGS_TABLE,
].join('\n');

// TypeScript types for database records
export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Agent extends AppAgent {
  id: number;
  name: string;
  project_id: number | null;
  model_id: number | null;
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  status: AgentStatus;
  last_heartbeat: string | null;
  config_path: string | null;
  source: AgentSource;
  created_at: string;
  updated_at: string;
}

export interface Model extends AppModel {}

export interface Task extends AppTask {}

export interface CostRecord extends AppCostRecord {}

export interface ActivityLog extends AppActivityLog {}
import type {
  Agent as AppAgent,
  AgentSource,
  AgentStatus,
  Model as AppModel,
  CostRecord as AppCostRecord,
  Task as AppTask,
  TaskAgentAssignment as AppTaskAgentAssignment,
  TaskOrchestration as AppTaskOrchestration,
  TaskOrchestrationAgentOrderEntry as AppTaskOrchestrationAgentOrderEntry,
  TaskDependency as AppTaskDependency,
  ActivityLog as AppActivityLog,
} from '../types';

export interface TaskAgentAssignment extends AppTaskAgentAssignment {}

export interface TaskOrchestrationAgentOrderEntry extends AppTaskOrchestrationAgentOrderEntry {}

export interface TaskOrchestration extends AppTaskOrchestration {}

export interface TaskDependency extends AppTaskDependency {}
