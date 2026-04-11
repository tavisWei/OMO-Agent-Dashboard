import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import { runMigrations } from './migrations.js';
import type { Project, Agent, Task, CostRecord, ActivityLog } from './schema.js';

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
    `INSERT INTO agents (name, project_id, model, temperature, top_p, max_tokens, status, config_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      projectId,
      model,
      config?.temperature ?? 0.7,
      config?.top_p ?? 0.9,
      config?.max_tokens ?? 4096,
      config?.status ?? 'idle',
      config?.config_path ?? null
    ]
  );
  const lastId = database.exec('SELECT last_insert_rowid() as id');
  const id = lastId[0]?.values[0]?.[0] as number;
  const result = database.exec('SELECT * FROM agents WHERE id = ?', [id]);
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
  if (updates.model !== undefined) { fields.push('model = ?'); values.push(updates.model); }
  if (updates.temperature !== undefined) { fields.push('temperature = ?'); values.push(updates.temperature); }
  if (updates.top_p !== undefined) { fields.push('top_p = ?'); values.push(updates.top_p); }
  if (updates.max_tokens !== undefined) { fields.push('max_tokens = ?'); values.push(updates.max_tokens); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.last_heartbeat !== undefined) { fields.push('last_heartbeat = ?'); values.push(updates.last_heartbeat); }
  if (updates.config_path !== undefined) { fields.push('config_path = ?'); values.push(updates.config_path); }

  if (fields.length === 0) return false;

  fields.push('updated_at = datetime("now")');
  values.push(id);

  database.run(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`, values);
  saveDatabase();
  return database.getRowsModified() > 0;
}

export function deleteAgent(id: number): boolean {
  const database = getDatabaseSync();
  database.run('DELETE FROM agents WHERE id = ?', [id]);
  saveDatabase();
  return database.getRowsModified() > 0;
}

// Task CRUD
export function createTask(
  title: string,
  projectId: number | null = null,
  agentId: number | null = null,
  description: string = '',
  status: string = 'backlog'
): Task {
  const database = getDatabaseSync();
  const maxPosResult = database.exec(
    'SELECT COALESCE(MAX(position), -1) + 1 FROM tasks WHERE project_id IS ?',
    [projectId]
  );
  const position = maxPosResult[0]?.values[0]?.[0] as number ?? 0;

  database.run(
    `INSERT INTO tasks (title, project_id, agent_id, description, status, position)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, projectId, agentId, description, status, position]
  );
  const lastId = database.exec('SELECT last_insert_rowid() as id');
  const id = lastId[0]?.values[0]?.[0] as number;
  const result = database.exec('SELECT * FROM tasks WHERE id = ?', [id]);
  return rowToObj(result[0].columns, result[0].values[0]);
}

export function getAllTasks(): Task[] {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM tasks ORDER BY position ASC');
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => rowToObj(result[0].columns, row));
}

export function getTask(id: number): Task | null {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM tasks WHERE id = ?', [id]);
  if (!result[0]?.values[0]) return null;
  return rowToObj(result[0].columns, result[0].values[0]);
}

export function getTasksByProject(projectId: number): Task[] {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM tasks WHERE project_id = ? ORDER BY position', [projectId]);
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => rowToObj(result[0].columns, row));
}

export function getTasksByAgent(agentId: number): Task[] {
  const database = getDatabaseSync();
  const result = database.exec('SELECT * FROM tasks WHERE agent_id = ? ORDER BY position', [agentId]);
  if (!result[0]) return [];
  return result[0].values.map((row: any[]) => rowToObj(result[0].columns, row));
}

export function updateTask(id: number, updates: Partial<Task>): boolean {
  const database = getDatabaseSync();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.position !== undefined) { fields.push('position = ?'); values.push(updates.position); }
  if (updates.agent_id !== undefined) { fields.push('agent_id = ?'); values.push(updates.agent_id); }
  if (updates.project_id !== undefined) { fields.push('project_id = ?'); values.push(updates.project_id); }

  if (fields.length === 0) return false;

  fields.push('updated_at = datetime("now")');
  values.push(id);

  database.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
  saveDatabase();
  return database.getRowsModified() > 0;
}

export function deleteTask(id: number): boolean {
  const database = getDatabaseSync();
  database.run('DELETE FROM tasks WHERE id = ?', [id]);
  saveDatabase();
  return database.getRowsModified() > 0;
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
  database.run(
    'INSERT INTO activity_logs (agent_id, action, details) VALUES (?, ?, ?)',
    [agentId, action, details]
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
