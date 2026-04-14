import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import { runMigrations } from './migrations.js';
import type { Project, Agent, Model, Task, TaskAgentAssignment, TaskDependency, TaskOrchestration, TaskOrchestrationAgentOrderEntry, CostRecord, ActivityLog } from './schema.js';

const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export interface TaskQueryFilters {
  project_id?: number;
  status?: Task['status'];
  priority?: Task['priority'];
  agent_id?: number;
  parent_task_id?: number | null;
}

export interface TaskAssignmentInput {
  agent_id: number;
  role?: TaskAgentAssignment['role'];
}

export interface TaskDependencyInput {
  depends_on_task_id: number;
  dependency_type?: TaskDependency['dependency_type'];
}

export interface TaskOrchestrationInput {
  pattern: TaskOrchestration['pattern'];
  agent_order: TaskOrchestration['agent_order'];
  current_step?: number;
  status?: TaskOrchestration['status'];
}

const DB_PATH = join(process.cwd(), 'data', 'dashboard.db');

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  const dataDir = dirname(DB_PATH);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  runMigrations(db);
  saveDatabase();

  return db;
}

export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// Project CRUD
export function createProject(name: string, description: string = ''): Project {
  const database = getDatabaseSync();
  database.run(
    'INSERT INTO projects (name, description) VALUES (?, ?)',
    [name, description]
  );
  const lastId = database.exec('SELECT last_insert_rowid() as id');
  const id = lastId[0]?.values[0]?.[0] as number;
  const result = database.exec('SELECT * FROM projects WHERE id = ?', [id]);
  if (!result[0]) throw new Error('Failed to insert project');
  return rowToObj(result[0].columns, result[0].values[0]);
}

export function getAllProjects(): Project[] {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM projects ORDER BY created_at DESC');
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => rowToObj(result[0].columns, row));
}

export function getProject(id: number): Project | null {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM projects WHERE id = ?', [id]);
  if (!result[0]?.values[0]) return null;
  return rowToObj(result[0].columns, result[0].values[0]);
}

export function updateProject(id: number, name: string, description: string): boolean {
  const database = getDatabaseSync();
  database.run(
    'UPDATE projects SET name = ?, description = ?, updated_at = datetime("now") WHERE id = ?',
    [name, description, id]
  );
  saveDatabase();
  return database.getRowsModified() > 0;
}

export function deleteProject(id: number): boolean {
  const database = getDatabaseSync();
  database.run('DELETE FROM projects WHERE id = ?', [id]);
  saveDatabase();
  return database.getRowsModified() > 0;
}

// Agent CRUD
export function createAgent(
  name: string,
  projectId: number | null,
  model: string = 'gpt-4',
  config?: Partial<Agent>
): Agent {
  const database = getDatabaseSync();
  database.run(
    `INSERT INTO agents (name, project_id, model_id, model, temperature, top_p, max_tokens, status, config_path, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      projectId,
      config?.model_id ?? null,
      model,
      config?.temperature ?? 0.7,
      config?.top_p ?? 0.9,
      config?.max_tokens ?? 4096,
      config?.status ?? 'idle',
      config?.config_path ?? null,
      config?.source ?? 'ui_created'
    ]
  );
  const lastId = database.exec('SELECT last_insert_rowid() as id');
  const id = lastId[0]?.values[0]?.[0] as number;
  const result = database.exec('SELECT * FROM agents WHERE id = ?', [id]);
  if (!result[0]?.values[0]) {
    throw new Error('Failed to insert agent');
  }
  saveDatabase();
  return rowToObj(result[0].columns, result[0].values[0]);
}

export function getAllAgents(): Agent[] {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM agents ORDER BY created_at DESC');
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => rowToObj(result[0].columns, row));
}

export function getAgent(id: number): Agent | null {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM agents WHERE id = ?', [id]);
  if (!result[0]?.values[0]) return null;
  return rowToObj(result[0].columns, result[0].values[0]);
}

export function getAgentsByProject(projectId: number): Agent[] {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM agents WHERE project_id = ?', [projectId]);
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => rowToObj(result[0].columns, row));
}

export function updateAgent(id: number, updates: Partial<Agent>): boolean {
  const database = getDatabaseSync();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.project_id !== undefined) { fields.push('project_id = ?'); values.push(updates.project_id); }
  if (updates.model_id !== undefined) { fields.push('model_id = ?'); values.push(updates.model_id); }
  if (updates.model !== undefined) { fields.push('model = ?'); values.push(updates.model); }
  if (updates.temperature !== undefined) { fields.push('temperature = ?'); values.push(updates.temperature); }
  if (updates.top_p !== undefined) { fields.push('top_p = ?'); values.push(updates.top_p); }
  if (updates.max_tokens !== undefined) { fields.push('max_tokens = ?'); values.push(updates.max_tokens); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.last_heartbeat !== undefined) { fields.push('last_heartbeat = ?'); values.push(updates.last_heartbeat); }
  if (updates.config_path !== undefined) { fields.push('config_path = ?'); values.push(updates.config_path); }
  if (updates.source !== undefined) { fields.push('source = ?'); values.push(updates.source); }

  if (fields.length === 0) return false;

  fields.push('updated_at = datetime("now")');
  values.push(id);

  database.run(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`, values);
  const modifiedRows = database.getRowsModified();
  saveDatabase();
  return modifiedRows > 0;
}

export function deleteAgent(id: number): boolean {
  const database = getDatabaseSync();
  database.run('DELETE FROM agents WHERE id = ?', [id]);
  const modifiedRows = database.getRowsModified();
  saveDatabase();
  return modifiedRows > 0;
}

export function clearAgents(source?: Agent['source']): void {
  const database = getDatabaseSync();
  if (source) {
    database.run('DELETE FROM agents WHERE source = ?', [source]);
  } else {
    database.run('DELETE FROM agents');
  }
  saveDatabase();
}

export function createModel(model: Omit<Model, 'id' | 'created_at' | 'updated_at'>): Model {
  const database = getDatabaseSync();
  database.run(
    `INSERT INTO models (name, provider, model_id, description, pricing_input, pricing_output, max_tokens, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      model.name,
      model.provider,
      model.model_id,
      model.description,
      model.pricing_input,
      model.pricing_output,
      model.max_tokens,
      model.is_active ? 1 : 0,
    ]
  );
  const lastId = database.exec('SELECT last_insert_rowid() as id');
  const id = lastId[0]?.values[0]?.[0] as number;
  const result = database.exec('SELECT * FROM models WHERE id = ?', [id]);
  if (!result[0]?.values[0]) {
    throw new Error('Failed to insert model');
  }
  saveDatabase();
  return modelRowToObj(result[0].columns, result[0].values[0]);
}

export function getAllModels(provider?: string): Model[] {
  const database = getDatabaseSync();
  const result = provider
    ? database.exec('SELECT * FROM models WHERE provider = ? ORDER BY created_at DESC', [provider])
    : database.exec('SELECT * FROM models ORDER BY created_at DESC');
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => modelRowToObj(result[0].columns, row));
}

export function getModel(id: number): Model | null {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM models WHERE id = ?', [id]);
  if (!result[0]?.values[0]) return null;
  return modelRowToObj(result[0].columns, result[0].values[0]);
}

export function updateModel(id: number, updates: Partial<Model>): boolean {
  const database = getDatabaseSync();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.provider !== undefined) { fields.push('provider = ?'); values.push(updates.provider); }
  if (updates.model_id !== undefined) { fields.push('model_id = ?'); values.push(updates.model_id); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.pricing_input !== undefined) { fields.push('pricing_input = ?'); values.push(updates.pricing_input); }
  if (updates.pricing_output !== undefined) { fields.push('pricing_output = ?'); values.push(updates.pricing_output); }
  if (updates.max_tokens !== undefined) { fields.push('max_tokens = ?'); values.push(updates.max_tokens); }
  if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active ? 1 : 0); }

  if (fields.length === 0) return false;

  fields.push('updated_at = datetime("now")');
  values.push(id);

  database.run(`UPDATE models SET ${fields.join(', ')} WHERE id = ?`, values);
  const modifiedRows = database.getRowsModified();
  saveDatabase();
  return modifiedRows > 0;
}

export function deleteModel(id: number): boolean {
  const database = getDatabaseSync();
  database.run('DELETE FROM models WHERE id = ?', [id]);
  const modifiedRows = database.getRowsModified();
  saveDatabase();
  return modifiedRows > 0;
}

export function getModelAgentUsageCount(id: number): number {
  const database = getDatabaseSync();
  const result = database.exec(
    `SELECT COUNT(*) as count
     FROM agents
     WHERE model_id = ?
        OR model = (
          SELECT model_id
          FROM models
          WHERE id = ?
        )`,
    [id, id]
  );

  return (result[0]?.values[0]?.[0] as number | undefined) ?? 0;
}

// Task CRUD
export function createTask(
  title: string,
  projectId: number | null = null,
  agentId: number | null = null,
  description: string = '',
  status: string = 'backlog',
  options: Partial<Pick<Task, 'parent_task_id' | 'depends_on' | 'priority' | 'labels' | 'due_date' | 'estimated_tokens' | 'assigned_agents'>> = {}
): Task {
  const database = getDatabaseSync();
  const maxPosResult = database.exec(
    'SELECT COALESCE(MAX(position), -1) + 1 FROM tasks WHERE project_id IS ?',
    [projectId]
  );
  const position = maxPosResult[0]?.values[0]?.[0] as number ?? 0;
  const normalizedAssignedAgents = dedupeIntegers([
    ...(options.assigned_agents ?? []),
    ...(agentId !== null ? [agentId] : []),
  ]);
  const normalizedDependsOn = dedupeIntegers(options.depends_on ?? []);

  database.run(
    `INSERT INTO tasks (
      title,
      project_id,
      agent_id,
      parent_task_id,
      description,
      status,
      position,
      depends_on,
      priority,
      labels,
      due_date,
      estimated_tokens,
      assigned_agents
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      projectId,
      agentId,
      options.parent_task_id ?? null,
      description,
      status,
      position,
      serializeNumberArray(normalizedDependsOn),
      normalizeTaskPriority(options.priority),
      serializeStringArray(options.labels),
      options.due_date ?? null,
      options.estimated_tokens ?? null,
      serializeNumberArray(normalizedAssignedAgents),
    ]
  );
  const lastId = database.exec('SELECT last_insert_rowid() as id');
  const id = lastId[0]?.values[0]?.[0] as number;
  replaceTaskAssignments(
    id,
    buildDefaultTaskAssignments(agentId, normalizedAssignedAgents),
    database,
    false,
  );
  replaceTaskDependencies(
    id,
    normalizedDependsOn.map((dependsOnTaskId) => ({
      depends_on_task_id: dependsOnTaskId,
      dependency_type: 'requires',
    })),
    database,
    false,
  );
  const result = database.exec('SELECT * FROM tasks WHERE id = ?', [id]);
  saveDatabase();
  return taskRowToObj(result[0].columns, result[0].values[0]);
}

export function getAllTasks(filters: TaskQueryFilters = {}): Task[] {
  const database = getDatabaseSync();
  const clauses: string[] = [];
  const values: Array<number | string | null> = [];

  if (filters.project_id !== undefined) {
    clauses.push('project_id = ?');
    values.push(filters.project_id);
  }

  if (filters.status !== undefined) {
    clauses.push('status = ?');
    values.push(filters.status);
  }

  if (filters.priority !== undefined) {
    clauses.push('priority = ?');
    values.push(filters.priority);
  }

  if (filters.parent_task_id !== undefined) {
    if (filters.parent_task_id === null) {
      clauses.push('parent_task_id IS NULL');
    } else {
      clauses.push('parent_task_id = ?');
      values.push(filters.parent_task_id);
    }
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = database.exec(
    `SELECT * FROM tasks ${whereClause} ORDER BY position ASC, created_at DESC`,
    values,
  );
  if (!result[0]) return [];
  const tasks = result[0].values.map((row: any[]) => taskRowToObj(result[0].columns, row));

  if (filters.agent_id === undefined) {
    return tasks;
  }

  return tasks.filter((task) => (
    task.agent_id === filters.agent_id
    || task.assigned_agents.includes(filters.agent_id as number)
    || getTaskAssignments(task.id).some((assignment) => assignment.agent_id === filters.agent_id)
  ));
}

export function getTask(id: number): Task | null {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM tasks WHERE id = ?', [id]);
  if (!result[0]?.values[0]) return null;
  return taskRowToObj(result[0].columns, result[0].values[0]);
}

export function getTasksByProject(projectId: number): Task[] {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM tasks WHERE project_id = ? ORDER BY position', [projectId]);
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => taskRowToObj(result[0].columns, row));
}

export function getTasksByAgent(agentId: number): Task[] {
  return getAllTasks({ agent_id: agentId });
}

export function getTaskSubtasks(taskId: number): Task[] {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY position ASC, created_at DESC', [taskId]);
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => taskRowToObj(result[0].columns, row));
}

export function getTaskAssignments(taskId: number): TaskAgentAssignment[] {
  const database = getDatabaseSync();
  const result = database.exec(
    'SELECT * FROM task_agent_assignments WHERE task_id = ? ORDER BY assigned_at ASC, agent_id ASC, role ASC',
    [taskId],
  );
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => rowToObj<TaskAgentAssignment>(result[0].columns, row));
}

export function getTaskDependencies(taskId: number): TaskDependency[] {
  const database = getDatabaseSync();
  const result = database.exec(
    'SELECT * FROM task_dependencies WHERE task_id = ? ORDER BY depends_on_task_id ASC, dependency_type ASC',
    [taskId],
  );
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => rowToObj<TaskDependency>(result[0].columns, row));
}

export function getDependentTasks(taskId: number): TaskDependency[] {
  const database = getDatabaseSync();
  const result = database.exec(
    'SELECT * FROM task_dependencies WHERE depends_on_task_id = ? ORDER BY task_id ASC, dependency_type ASC',
    [taskId],
  );
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => rowToObj<TaskDependency>(result[0].columns, row));
}

export function createTaskOrchestration(
  taskId: number,
  input: TaskOrchestrationInput,
): TaskOrchestration {
  const database = getDatabaseSync();

  database.run('DELETE FROM task_orchestrations WHERE task_id = ?', [taskId]);
  database.run(
    `INSERT INTO task_orchestrations (task_id, pattern, agent_order, current_step, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      taskId,
      input.pattern,
      serializeTaskOrchestrationAgentOrder(input.agent_order),
      input.current_step ?? 0,
      input.status ?? 'pending',
    ],
  );

  saveDatabase();

  const orchestration = getTaskOrchestration(taskId);
  if (!orchestration) {
    throw new Error(`Failed to create orchestration for task ${taskId}`);
  }

  return orchestration;
}

export function getTaskOrchestration(taskId: number): TaskOrchestration | null {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM task_orchestrations WHERE task_id = ?', [taskId]);
  if (!result[0]?.values[0]) return null;
  return taskOrchestrationRowToObj(result[0].columns, result[0].values[0]);
}

export function updateTaskOrchestration(
  taskId: number,
  updates: Partial<Pick<TaskOrchestration, 'pattern' | 'agent_order' | 'current_step' | 'status'>>,
): TaskOrchestration | null {
  const database = getDatabaseSync();
  const fields: string[] = [];
  const values: Array<number | string> = [];

  if (updates.pattern !== undefined) {
    fields.push('pattern = ?');
    values.push(updates.pattern);
  }

  if (updates.agent_order !== undefined) {
    fields.push('agent_order = ?');
    values.push(serializeTaskOrchestrationAgentOrder(updates.agent_order));
  }

  if (updates.current_step !== undefined) {
    fields.push('current_step = ?');
    values.push(updates.current_step);
  }

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }

  if (fields.length === 0) {
    return getTaskOrchestration(taskId);
  }

  fields.push('updated_at = datetime("now")');
  values.push(taskId);

  database.run(`UPDATE task_orchestrations SET ${fields.join(', ')} WHERE task_id = ?`, values);

  if (database.getRowsModified() === 0) {
    return null;
  }

  saveDatabase();
  return getTaskOrchestration(taskId);
}

export function replaceTaskAssignments(
  taskId: number,
  assignments: TaskAssignmentInput[],
  database = getDatabaseSync(),
  persist = true,
): TaskAgentAssignment[] {
  const normalizedAssignments = dedupeTaskAssignments(assignments).map((assignment) => ({
    agent_id: assignment.agent_id,
    role: assignment.role ?? 'worker',
  }));
  const primaryAgentId = selectPrimaryAgentId(normalizedAssignments);
  const assignedAgents = dedupeIntegers(normalizedAssignments.map((assignment) => assignment.agent_id));

  database.run('DELETE FROM task_agent_assignments WHERE task_id = ?', [taskId]);

  for (const assignment of normalizedAssignments) {
    database.run(
      `INSERT INTO task_agent_assignments (task_id, agent_id, role)
       VALUES (?, ?, ?)`,
      [taskId, assignment.agent_id, assignment.role],
    );
  }

  database.run(
    `UPDATE tasks
     SET agent_id = ?, assigned_agents = ?, updated_at = datetime("now")
     WHERE id = ?`,
    [primaryAgentId, serializeNumberArray(assignedAgents), taskId],
  );

  if (persist) {
    saveDatabase();
  }

  return getTaskAssignments(taskId);
}

export function replaceTaskDependencies(
  taskId: number,
  dependencies: TaskDependencyInput[],
  database = getDatabaseSync(),
  persist = true,
): TaskDependency[] {
  const normalizedDependencies = dedupeTaskDependencies(dependencies).map((dependency) => ({
    depends_on_task_id: dependency.depends_on_task_id,
    dependency_type: dependency.dependency_type ?? 'requires',
  }));
  const dependsOn = dedupeIntegers(normalizedDependencies.map((dependency) => dependency.depends_on_task_id));

  database.run('DELETE FROM task_dependencies WHERE task_id = ?', [taskId]);

  for (const dependency of normalizedDependencies) {
    database.run(
      `INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type)
       VALUES (?, ?, ?)`,
      [taskId, dependency.depends_on_task_id, dependency.dependency_type],
    );
  }

  database.run(
    `UPDATE tasks
     SET depends_on = ?, updated_at = datetime("now")
     WHERE id = ?`,
    [serializeNumberArray(dependsOn), taskId],
  );

  if (persist) {
    saveDatabase();
  }

  return getTaskDependencies(taskId);
}

export function updateTask(id: number, updates: Partial<Task>): boolean {
  const database = getDatabaseSync();
  const fields: string[] = [];
  const values: any[] = [];
  const nextAgentId = updates.agent_id !== undefined ? updates.agent_id : undefined;
  const nextAssignedAgents = updates.assigned_agents !== undefined ? dedupeIntegers(updates.assigned_agents) : undefined;
  const nextDependsOn = updates.depends_on !== undefined ? dedupeIntegers(updates.depends_on) : undefined;

  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.position !== undefined) { fields.push('position = ?'); values.push(updates.position); }
  if (updates.agent_id !== undefined) { fields.push('agent_id = ?'); values.push(updates.agent_id); }
  if (updates.project_id !== undefined) { fields.push('project_id = ?'); values.push(updates.project_id); }
  if (updates.parent_task_id !== undefined) { fields.push('parent_task_id = ?'); values.push(updates.parent_task_id); }
  if (updates.depends_on !== undefined) { fields.push('depends_on = ?'); values.push(serializeNumberArray(nextDependsOn)); }
  if (updates.priority !== undefined) { fields.push('priority = ?'); values.push(normalizeTaskPriority(updates.priority)); }
  if (updates.labels !== undefined) { fields.push('labels = ?'); values.push(serializeStringArray(updates.labels)); }
  if (updates.due_date !== undefined) { fields.push('due_date = ?'); values.push(updates.due_date); }
  if (updates.estimated_tokens !== undefined) { fields.push('estimated_tokens = ?'); values.push(updates.estimated_tokens); }
  if (updates.assigned_agents !== undefined) { fields.push('assigned_agents = ?'); values.push(serializeNumberArray(nextAssignedAgents)); }

  if (fields.length === 0) return false;

  fields.push('updated_at = datetime("now")');
  values.push(id);

  database.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
  const modifiedRows = database.getRowsModified();

  if (modifiedRows > 0 && (nextAgentId !== undefined || nextAssignedAgents !== undefined)) {
    const currentTask = getTask(id);
    if (currentTask) {
      replaceTaskAssignments(
        id,
        buildDefaultTaskAssignments(currentTask.agent_id, currentTask.assigned_agents),
        database,
        false,
      );
    }
  }

  if (modifiedRows > 0 && nextDependsOn !== undefined) {
    replaceTaskDependencies(
      id,
      nextDependsOn.map((dependsOnTaskId) => ({
        depends_on_task_id: dependsOnTaskId,
        dependency_type: 'requires',
      })),
      database,
      false,
    );
  }

  saveDatabase();
  return modifiedRows > 0;
}

export function deleteTask(id: number): boolean {
  return deleteTaskCascade(id);
}

export function deleteTaskCascade(id: number): boolean {
  const database = getDatabaseSync();
  const task = getTask(id);
  if (!task) {
    return false;
  }

  deleteTaskCascadeInternal(database, id, new Set<number>());
  const modifiedRows = database.getRowsModified();
  saveDatabase();
  return modifiedRows > 0;
}

// Cost Record CRUD
export function createCostRecord(
  agentId: number | null,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cost: number
): CostRecord {
  const database = getDatabaseSync();
  database.run(
    `INSERT INTO cost_records (agent_id, model, input_tokens, output_tokens, cost)
     VALUES (?, ?, ?, ?, ?)`,
    [agentId, model, inputTokens, outputTokens, cost]
  );
  const lastId = database.exec('SELECT last_insert_rowid() as id');
  const id = lastId[0]?.values[0]?.[0] as number;
  const result = database.exec('SELECT * FROM cost_records WHERE id = ?', [id]);
  return rowToObj(result[0].columns, result[0].values[0]);
}

export function getCostRecordsByAgent(agentId: number, limit: number = 100): CostRecord[] {
  const database = getDatabaseSync();
  const result = database.exec(
    'SELECT * FROM cost_records WHERE agent_id = ? ORDER BY recorded_at DESC LIMIT ?',
    [agentId, limit]
  );
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => rowToObj(result[0].columns, row));
}

export function getCostRecordsByDateRange(startDate: string, endDate: string): CostRecord[] {
  const database = getDatabaseSync();
  const result = database.exec(
    'SELECT * FROM cost_records WHERE recorded_at BETWEEN ? AND ? ORDER BY recorded_at DESC',
    [startDate, endDate]
  );
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => rowToObj(result[0].columns, row));
}

export function getTotalCostByAgent(agentId: number): { totalCost: number; totalInput: number; totalOutput: number } {
  const database = getDatabaseSync();
  const result = database.exec(
    `SELECT COALESCE(SUM(cost), 0), COALESCE(SUM(input_tokens), 0), COALESCE(SUM(output_tokens), 0)
     FROM cost_records WHERE agent_id = ?`,
    [agentId]
  );
  const row = result[0]?.values[0];
  return {
    totalCost: row?.[0] as number ?? 0,
    totalInput: row?.[1] as number ?? 0,
    totalOutput: row?.[2] as number ?? 0
  };
}

// Activity Log CRUD
export function createActivityLog(agentId: number | null, action: string, details: string = ''): ActivityLog {
  const database = getDatabaseSync();
  let agentName: string | null = null;

  if (agentId !== null) {
    const agentResult = database.exec('SELECT name FROM agents WHERE id = ?', [agentId]);
    agentName = (agentResult[0]?.values[0]?.[0] as string | undefined) ?? null;
  }

  database.run(
    'INSERT INTO activity_logs (agent_id, agent_name, action, details) VALUES (?, ?, ?, ?)',
    [agentId, agentName, action, details]
  );
  const lastId = database.exec('SELECT last_insert_rowid() as id');
  const id = lastId[0]?.values[0]?.[0] as number;
  const result = database.exec('SELECT * FROM activity_logs WHERE id = ?', [id]);
  return rowToObj(result[0].columns, result[0].values[0]);
}

export function getActivityLogsByAgent(agentId: number, limit: number = 50): ActivityLog[] {
  const database = getDatabaseSync();
  const result = database.exec(
    'SELECT * FROM activity_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?',
    [agentId, limit]
  );
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => rowToObj(result[0].columns, row));
}

export function getRecentActivityLogs(limit: number = 50): ActivityLog[] {
  const database = getDatabaseSync();
  const result = database.exec(
    'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => rowToObj(result[0].columns, row));
}

function getDatabaseSync(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call getDatabase() first.');
  }
  return db;
}

function rowToObj<T>(columns: string[], values: any[]): T {
  const obj: any = {};
  columns.forEach((col: string, i: number) => { obj[col] = values[i]; });
  return obj as T;
}

function modelRowToObj(columns: string[], values: any[]): Model {
  const model = rowToObj<Model>(columns, values);
  return {
    ...model,
    is_active: Boolean(model.is_active),
  };
}

function taskRowToObj(columns: string[], values: any[]): Task {
  const task = rowToObj<Omit<Task, 'depends_on' | 'labels' | 'assigned_agents' | 'priority'> & {
    depends_on: string | number[] | null;
    labels: string[] | string | null;
    assigned_agents: number[] | string | null;
    priority: string | null;
  }>(columns, values);

  return {
    ...task,
    depends_on: parseJsonArray<number>(task.depends_on, isIntegerValue),
    priority: normalizeTaskPriority(task.priority),
    labels: parseJsonArray<string>(task.labels, (value): value is string => typeof value === 'string'),
    assigned_agents: normalizeAssignedAgents(task.assigned_agents, task.agent_id),
    due_date: task.due_date ?? null,
    estimated_tokens: task.estimated_tokens ?? null,
    parent_task_id: task.parent_task_id ?? null,
  };
}

function taskOrchestrationRowToObj(columns: string[], values: any[]): TaskOrchestration {
  const orchestration = rowToObj<Omit<TaskOrchestration, 'agent_order' | 'current_step'> & {
    agent_order: string | TaskOrchestrationAgentOrderEntry[] | null;
    current_step: number | null;
  }>(columns, values);

  return {
    ...orchestration,
    agent_order: parseTaskOrchestrationAgentOrder(orchestration.agent_order),
    current_step: typeof orchestration.current_step === 'number' && orchestration.current_step >= 0
      ? orchestration.current_step
      : 0,
  };
}

function normalizeTaskPriority(priority: unknown): Task['priority'] {
  return typeof priority === 'string' && TASK_PRIORITIES.includes(priority as typeof TASK_PRIORITIES[number])
    ? priority as Task['priority']
    : 'medium';
}

function buildDefaultTaskAssignments(
  agentId: number | null | undefined,
  assignedAgents: number[] | undefined,
): TaskAssignmentInput[] {
  const normalizedAssignedAgents = dedupeIntegers([
    ...(assignedAgents ?? []),
    ...(agentId !== null && agentId !== undefined ? [agentId] : []),
  ]);

  return normalizedAssignedAgents.map((assignedAgentId) => ({
    agent_id: assignedAgentId,
    role: agentId === assignedAgentId ? 'lead' : 'worker',
  }));
}

function dedupeIntegers(values: number[]): number[] {
  const uniqueValues = new Set<number>();

  values.forEach((value) => {
    if (Number.isInteger(value)) {
      uniqueValues.add(value);
    }
  });

  return Array.from(uniqueValues.values());
}

function dedupeTaskAssignments(assignments: TaskAssignmentInput[]): TaskAssignmentInput[] {
  const uniqueAssignments = new Map<string, TaskAssignmentInput>();

  assignments.forEach((assignment) => {
    if (!Number.isInteger(assignment.agent_id)) {
      return;
    }

    const role = assignment.role ?? 'worker';
    uniqueAssignments.set(`${assignment.agent_id}:${role}`, {
      agent_id: assignment.agent_id,
      role,
    });
  });

  return Array.from(uniqueAssignments.values());
}

function dedupeTaskDependencies(dependencies: TaskDependencyInput[]): TaskDependencyInput[] {
  const uniqueDependencies = new Map<string, TaskDependencyInput>();

  dependencies.forEach((dependency) => {
    if (!Number.isInteger(dependency.depends_on_task_id)) {
      return;
    }

    const dependencyType = dependency.dependency_type ?? 'requires';
    uniqueDependencies.set(`${dependency.depends_on_task_id}:${dependencyType}`, {
      depends_on_task_id: dependency.depends_on_task_id,
      dependency_type: dependencyType,
    });
  });

  return Array.from(uniqueDependencies.values());
}

function selectPrimaryAgentId(assignments: TaskAssignmentInput[]): number | null {
  const leadAssignment = assignments.find((assignment) => assignment.role === 'lead');
  if (leadAssignment) {
    return leadAssignment.agent_id;
  }

  return assignments[0]?.agent_id ?? null;
}

function deleteTaskCascadeInternal(database: Database, taskId: number, visited: Set<number>): void {
  if (visited.has(taskId)) {
    return;
  }

  visited.add(taskId);

  const childResult = database.exec('SELECT id FROM tasks WHERE parent_task_id = ?', [taskId]);
  const childIds = (childResult[0]?.values ?? []).map((row) => row[0]).filter((value): value is number => typeof value === 'number');

  for (const childId of childIds) {
    deleteTaskCascadeInternal(database, childId, visited);
  }

  database.run('DELETE FROM tasks WHERE id = ?', [taskId]);
}

function serializeNumberArray(value: number[] | undefined, fallback: number[] = []): string {
  const source = Array.isArray(value) ? value : fallback;
  return JSON.stringify(source.filter((item): item is number => Number.isInteger(item)));
}

function serializeTaskOrchestrationAgentOrder(
  value: TaskOrchestrationAgentOrderEntry[] | undefined,
  fallback: TaskOrchestrationAgentOrderEntry[] = [],
): string {
  const source = Array.isArray(value) ? value : fallback;
  return JSON.stringify(source
    .filter((entry): entry is TaskOrchestrationAgentOrderEntry => (
      entry !== null
      && typeof entry === 'object'
      && Number.isInteger(entry.agent_id)
      && typeof entry.role === 'string'
      && typeof entry.label === 'string'
    ))
    .map((entry) => ({
      agent_id: entry.agent_id,
      role: entry.role,
      label: entry.label,
    })));
}

function serializeStringArray(value: string[] | undefined, fallback: string[] = []): string {
  const source = Array.isArray(value) ? value : fallback;
  return JSON.stringify(source.filter((item): item is string => typeof item === 'string'));
}

function parseJsonArray<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
  if (Array.isArray(value)) {
    return value.filter(guard);
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(guard) : [];
  } catch {
    return [];
  }
}

function parseTaskOrchestrationAgentOrder(value: unknown): TaskOrchestrationAgentOrderEntry[] {
  const parsedEntries = parseJsonArray<TaskOrchestrationAgentOrderEntry>(
    value,
    (entry): entry is TaskOrchestrationAgentOrderEntry => (
      entry !== null
      && typeof entry === 'object'
      && Number.isInteger((entry as TaskOrchestrationAgentOrderEntry).agent_id)
      && typeof (entry as TaskOrchestrationAgentOrderEntry).role === 'string'
      && typeof (entry as TaskOrchestrationAgentOrderEntry).label === 'string'
    ),
  );

  return parsedEntries.map((entry) => ({
    agent_id: entry.agent_id,
    role: entry.role,
    label: entry.label,
  }));
}

function normalizeAssignedAgents(value: unknown, agentId: number | null): number[] {
  const assignedAgents = parseJsonArray<number>(value, isIntegerValue);
  if (assignedAgents.length > 0) {
    return assignedAgents;
  }

  return agentId !== null ? [agentId] : [];
}

function isIntegerValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}
