// Agent data types matching the database schema
export type AgentStatus = 'idle' | 'running' | 'error' | 'stopped' | 'thinking' | 'offline';

export type AgentSource = 'omo_config' | 'ui_created';

export interface Model {
  id: number;
  name: string;
  provider: string;
  model_id: string;
  description: string;
  pricing_input: number;
  pricing_output: number;
  max_tokens: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskAgentAssignmentRole = 'lead' | 'worker' | 'reviewer';

export type TaskDependencyType = 'blocks' | 'requires';

// Task interface for the Kanban board
export interface Task {
  id: number;
  project_id: number | null;
  agent_id: number | null;
  parent_task_id: number | null;
  title: string;
  description: string;
  status: TaskStatus;
  position: number;
  depends_on: number[];
  priority: TaskPriority;
  labels: string[];
  due_date: number | null;
  estimated_tokens: number | null;
  assigned_agents: number[];
  created_at: string;
  updated_at: string;
}

// Task creation input
export interface CreateTaskInput {
  title: string;
  description?: string;
  agent_id?: number | null;
  project_id?: number | null;
  parent_task_id?: number | null;
  status?: TaskStatus;
  depends_on?: number[];
  priority?: TaskPriority;
  labels?: string[];
  due_date?: number | null;
  estimated_tokens?: number | null;
  assigned_agents?: number[];
}

// Task update input
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  position?: number;
  agent_id?: number | null;
  project_id?: number | null;
  parent_task_id?: number | null;
  depends_on?: number[];
  priority?: TaskPriority;
  labels?: string[];
  due_date?: number | null;
  estimated_tokens?: number | null;
  assigned_agents?: number[];
}

export interface TaskAgentAssignment {
  task_id: number;
  agent_id: number;
  role: TaskAgentAssignmentRole;
  assigned_at: string;
}

export interface TaskDependency {
  task_id: number;
  depends_on_task_id: number;
  dependency_type: TaskDependencyType;
}

export type TaskOrchestrationPattern = 'sequential' | 'parallel' | 'pipeline';

export type TaskOrchestrationStatus = 'pending' | 'running' | 'step_complete' | 'completed' | 'failed';

export type TaskOrchestrationAction = 'start' | 'advance' | 'fail';

export type TaskOrchestrationEvent = 'started' | 'advanced' | 'completed' | 'failed';

export type TaskOrchestrationStepState = 'pending' | 'active' | 'completed' | 'failed';

export interface TaskOrchestrationAgentOrderEntry {
  agent_id: number;
  role: TaskAgentAssignmentRole;
  label: string;
}

export interface TaskOrchestration {
  id: number;
  task_id: number;
  pattern: TaskOrchestrationPattern;
  agent_order: TaskOrchestrationAgentOrderEntry[];
  current_step: number;
  status: TaskOrchestrationStatus;
  created_at: string;
  updated_at: string;
}

export interface TaskOrchestrationStep extends TaskOrchestrationAgentOrderEntry {
  index: number;
  state: TaskOrchestrationStepState;
  is_current: boolean;
  output_key: string | null;
  input_from_step: number | null;
}

export interface TaskOrchestrationProgress {
  total_steps: number;
  completed_steps: number;
  active_steps: number;
  pending_steps: number;
  completion_percentage: number;
}

export interface TaskOrchestrationSnapshot {
  task: Task;
  orchestration: TaskOrchestration;
  steps: TaskOrchestrationStep[];
  progress: TaskOrchestrationProgress;
  available_actions: TaskOrchestrationAction[];
}

export interface TaskFilters {
  project_id?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  agent_id?: number;
  parent_task_id?: number | null;
}

export interface TaskAssignmentInput {
  agent_id: number;
  role?: TaskAgentAssignmentRole;
}

export interface TaskDependencyInput {
  depends_on_task_id: number;
  dependency_type?: TaskDependencyType;
}

export interface TaskDependenciesMutationInput {
  add?: TaskDependencyInput[];
  remove?: TaskDependencyInput[];
}

export interface TaskDependencyDetail extends TaskDependency {
  task: Task | null;
}

export interface TaskDetailResponse {
  task: Task;
  project: Project | null;
  legacy_agent: Agent | null;
  assignments: TaskAgentAssignment[];
  assigned_agent_details: Agent[];
  dependencies: {
    blocking: TaskDependencyDetail[];
    dependents: TaskDependencyDetail[];
  };
  subtasks: Task[];
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
  agent_id: string | null;
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
