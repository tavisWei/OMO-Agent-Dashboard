// Agent data types matching the database schema
export type AgentStatus = 'idle' | 'running' | 'error' | 'stopped';

export interface Agent {
  id: number;
  name: string;
  project_id: number | null;
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  status: AgentStatus;
  last_heartbeat: string | null;
  config_path: string | null;
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

export interface AgentWithUsage extends Agent {
  totalTokens: number;
  totalCost: number;
}

export type DateRange = 'today' | 'week' | 'month' | 'custom';

export interface CostSummary {
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost: number;
  total_api_calls: number;
}

export interface AgentCostSummary {
  agent_id: number;
  agent_name: string;
  model: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost: number;
  api_calls: number;
}

export interface CostSummaryResponse {
  summary: CostSummary;
  by_agent: AgentCostSummary[];
  date_range: {
    startDate: string;
    endDate: string;
  };
}

export interface DailyCostData {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
}

export interface AgentDistributionData {
  name: string;
  value: number;
  cost: number;
  percentage: string;
}

// Task status type
export type TaskStatus = 'backlog' | 'in_progress' | 'done' | 'failed';

// Task interface for the Kanban board
export interface Task {
  id: number;
  project_id: number | null;
  agent_id: number | null;
  title: string;
  description: string;
  status: TaskStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

// Task creation input
export interface CreateTaskInput {
  title: string;
  description?: string;
  agent_id?: number | null;
  project_id?: number | null;
  status?: TaskStatus;
}

// Task update input
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  position?: number;
  agent_id?: number | null;
}

// Column definition for Kanban
export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  color: string;
}

// Activity Log types
export type ActivityType = 'started' | 'stopped' | 'error' | 'config_changed' | 'task_assigned' | 'task_completed';

export interface ActivityLog {
  id: number;
  agent_id: number | null;
  agent_name: string | null;
  action: ActivityType;
  details: string;
  created_at: string;
}

export interface ActivityLogsResponse {
  logs: ActivityLog[];
  hasMore: boolean;
  limit: number;
  offset: number;
}
