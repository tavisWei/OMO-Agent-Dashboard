import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import initSqlJs, { Database } from 'sql.js';
import { runMigrations } from './migrations.js';

let db: Database | null = null;

async function createTestDatabase(): Promise<Database> {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  runMigrations(db);
  return db;
}

function getTestDb(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

describe('Database Schema', () => {
  beforeEach(async () => {
    if (db) {
      db.close();
      db = null;
    }
    await createTestDatabase();
  });

  afterEach(() => {
    if (db) {
      db.close();
      db = null;
    }
  });

  describe('Projects Table', () => {
    it('creates a project', () => {
      const database = getTestDb();
      database.run("INSERT INTO projects (name, description) VALUES ('Test Project', 'A test description')");
      const result = database.exec('SELECT * FROM projects WHERE name = ?', ['Test Project']);
      expect(result[0]).toBeDefined();
      expect(result[0].values[0][1]).toBe('Test Project');
      expect(result[0].values[0][2]).toBe('A test description');
    });

    it('gets all projects', () => {
      const database = getTestDb();
      database.run("INSERT INTO projects (name) VALUES ('Project 1')");
      database.run("INSERT INTO projects (name) VALUES ('Project 2')");
      const result = database.exec('SELECT * FROM projects');
      expect(result[0]).toBeDefined();
      expect(result[0].values.length).toBe(2);
    });

    it('gets a single project by id', () => {
      const database = getTestDb();
      database.run("INSERT INTO projects (name) VALUES ('Test Project')");
      const result = database.exec('SELECT * FROM projects WHERE id = 1');
      expect(result[0]).toBeDefined();
      expect(result[0].values[0][1]).toBe('Test Project');
    });

    it('returns empty for non-existent project', () => {
      const database = getTestDb();
      const result = database.exec('SELECT * FROM projects WHERE id = 9999');
      expect(result[0]).toBeUndefined();
    });

    it('updates a project', () => {
      const database = getTestDb();
      database.run("INSERT INTO projects (name) VALUES ('Original Name')");
      database.run('UPDATE projects SET name = ?, description = ? WHERE id = ?', ['Updated Name', 'New description', 1]);
      const result = database.exec('SELECT * FROM projects WHERE id = 1');
      expect(result[0].values[0][1]).toBe('Updated Name');
      expect(result[0].values[0][2]).toBe('New description');
    });

    it('deletes a project', () => {
      const database = getTestDb();
      database.run("INSERT INTO projects (name) VALUES ('To Delete')");
      database.run('DELETE FROM projects WHERE id = ?', [1]);
      const result = database.exec('SELECT * FROM projects WHERE id = 1');
      expect(result[0]).toBeUndefined();
    });
  });

  describe('Agents Table', () => {
    it('creates an agent', () => {
      const database = getTestDb();
      database.run(
        "INSERT INTO agents (name, project_id, model, temperature, top_p, max_tokens, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['Test Agent', null, 'gpt-4', 0.8, 0.9, 4096, 'idle']
      );
      const result = database.exec('SELECT * FROM agents WHERE name = ?', ['Test Agent']);
      expect(result[0]).toBeDefined();
      expect(result[0].values[0][1]).toBe('Test Agent');
      expect(result[0].values[0][4]).toBe('gpt-4');
      expect(result[0].values[0][5]).toBe(0.8);
    });

    it('creates an agent with default values', () => {
      const database = getTestDb();
      database.run("INSERT INTO agents (name) VALUES ('Default Agent')");
      const result = database.exec('SELECT * FROM agents WHERE name = ?', ['Default Agent']);
      expect(result[0].values[0][4]).toBe('gpt-4');
      expect(result[0].values[0][5]).toBe(0.7);
      expect(result[0].values[0][6]).toBe(0.9);
      expect(result[0].values[0][7]).toBe(4096);
      expect(result[0].values[0][8]).toBe('idle');
    });

    it('gets all agents', () => {
      const database = getTestDb();
      database.run("INSERT INTO agents (name) VALUES ('Agent 1')");
      database.run("INSERT INTO agents (name) VALUES ('Agent 2')");
      const result = database.exec('SELECT * FROM agents');
      expect(result[0].values.length).toBe(2);
    });

    it('gets agents by project', () => {
      const database = getTestDb();
      database.run("INSERT INTO projects (name) VALUES ('Test Project')");
      database.run('INSERT INTO agents (name, project_id) VALUES (?, ?)', ['Agent 1', 1]);
      database.run('INSERT INTO agents (name, project_id) VALUES (?, ?)', ['Agent 2', 1]);
      database.run("INSERT INTO agents (name) VALUES ('Agent 3')");
      const result = database.exec('SELECT * FROM agents WHERE project_id = ?', [1]);
      expect(result[0].values.length).toBe(2);
    });

    it('updates an agent', () => {
      const database = getTestDb();
      database.run("INSERT INTO agents (name, status) VALUES ('Original Agent', 'idle')");
      database.run('UPDATE agents SET name = ?, status = ? WHERE id = ?', ['Updated Agent', 'running', 1]);
      const result = database.exec('SELECT * FROM agents WHERE id = 1');
      expect(result[0].values[0][1]).toBe('Updated Agent');
      expect(result[0].values[0][8]).toBe('running');
    });

    it('deletes an agent', () => {
      const database = getTestDb();
      database.run("INSERT INTO agents (name) VALUES ('To Delete')");
      database.run('DELETE FROM agents WHERE id = ?', [1]);
      const result = database.exec('SELECT * FROM agents WHERE id = 1');
      expect(result[0]).toBeUndefined();
    });
  });

  describe('Tasks Table', () => {
    it('creates a task', () => {
      const database = getTestDb();
      database.run(
        "INSERT INTO tasks (title, description, status, position) VALUES (?, ?, ?, ?)",
        ['Test Task', 'A test task', 'backlog', 0]
      );
      const result = database.exec('SELECT * FROM tasks WHERE title = ?', ['Test Task']);
      expect(result[0]).toBeDefined();
      expect(result[0].values[0][4]).toBe('Test Task');
      expect(result[0].values[0][5]).toBe('A test task');
      expect(result[0].values[0][6]).toBe('backlog');
    });

    it('auto-increments task position', () => {
      const database = getTestDb();
      database.run("INSERT INTO tasks (title, position) VALUES ('Task 1', 0)");
      database.run("INSERT INTO tasks (title, position) VALUES ('Task 2', 1)");
      database.run("INSERT INTO tasks (title, position) VALUES ('Task 3', 2)");
      const result = database.exec('SELECT position FROM tasks ORDER BY position');
      expect(result[0].values[0][0]).toBe(0);
      expect(result[0].values[1][0]).toBe(1);
      expect(result[0].values[2][0]).toBe(2);
    });

    it('updates a task', () => {
      const database = getTestDb();
      database.run("INSERT INTO tasks (title, description, status) VALUES ('Original Task', '', 'backlog')");
      database.run('UPDATE tasks SET title = ?, status = ? WHERE id = ?', ['Updated Task', 'in_progress', 1]);
      const result = database.exec('SELECT * FROM tasks WHERE id = 1');
      expect(result[0].values[0][4]).toBe('Updated Task');
      expect(result[0].values[0][6]).toBe('in_progress');
    });

    it('deletes a task', () => {
      const database = getTestDb();
      database.run("INSERT INTO tasks (title) VALUES ('To Delete')");
      database.run('DELETE FROM tasks WHERE id = ?', [1]);
      const result = database.exec('SELECT * FROM tasks WHERE id = 1');
      expect(result[0]).toBeUndefined();
    });
  });

  describe('Cost Records Table', () => {
    it('creates a cost record', () => {
      const database = getTestDb();
      database.run("INSERT INTO agents (name) VALUES ('Test Agent')");
      database.run(
        "INSERT INTO cost_records (agent_id, model, input_tokens, output_tokens, cost) VALUES (?, ?, ?, ?, ?)",
        [1, 'gpt-4', 1000, 500, 0.02]
      );
      const result = database.exec('SELECT * FROM cost_records WHERE agent_id = ?', [1]);
      expect(result[0]).toBeDefined();
      expect(result[0].values[0][3]).toBe(1000);
      expect(result[0].values[0][4]).toBe(500);
      expect(result[0].values[0][5]).toBe(0.02);
    });

    it('calculates total cost by agent', () => {
      const database = getTestDb();
      database.run("INSERT INTO agents (name) VALUES ('Test Agent')");
      database.run("INSERT INTO cost_records (agent_id, model, cost, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?)", [1, 'gpt-4', 0.02, 1000, 500]);
      database.run("INSERT INTO cost_records (agent_id, model, cost, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?)", [1, 'gpt-4', 0.04, 2000, 1000]);
      const result = database.exec('SELECT COALESCE(SUM(cost), 0), COALESCE(SUM(input_tokens), 0), COALESCE(SUM(output_tokens), 0) FROM cost_records WHERE agent_id = ?', [1]);
      expect(result[0].values[0][0]).toBe(0.06);
      expect(result[0].values[0][1]).toBe(3000);
      expect(result[0].values[0][2]).toBe(1500);
    });

    it('limits cost records', () => {
      const database = getTestDb();
      database.run("INSERT INTO agents (name) VALUES ('Test Agent')");
      database.run("INSERT INTO cost_records (agent_id, model, cost, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?)", [1, 'gpt-4', 0.01, 100, 50]);
      database.run("INSERT INTO cost_records (agent_id, model, cost, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?)", [1, 'gpt-4', 0.02, 200, 100]);
      database.run("INSERT INTO cost_records (agent_id, model, cost, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?)", [1, 'gpt-4', 0.03, 300, 150]);
      const result = database.exec('SELECT * FROM cost_records WHERE agent_id = ? ORDER BY id DESC LIMIT 2', [1]);
      expect(result[0].values.length).toBe(2);
    });
  });

  describe('Activity Logs Table', () => {
    it('creates an activity log', () => {
      const database = getTestDb();
      database.run("INSERT INTO agents (name) VALUES ('Test Agent')");
      database.run("INSERT INTO activity_logs (agent_id, action, details) VALUES (?, ?, ?)", [1, 'started', 'Agent started successfully']);
      const result = database.exec('SELECT * FROM activity_logs WHERE agent_id = ?', [1]);
      expect(result[0]).toBeDefined();
      expect(result[0].values[0][3]).toBe('started');
      expect(result[0].values[0][4]).toBe('Agent started successfully');
    });

    it('gets recent activity logs', () => {
      const database = getTestDb();
      database.run("INSERT INTO activity_logs (action) VALUES ('started')");
      database.run("INSERT INTO activity_logs (action) VALUES ('stopped')");
      database.run("INSERT INTO activity_logs (action) VALUES ('error')");
      const result = database.exec('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10');
      expect(result[0].values.length).toBe(3);
    });

    it('limits activity logs by parameter', () => {
      const database = getTestDb();
      database.run("INSERT INTO activity_logs (action) VALUES ('started')");
      database.run("INSERT INTO activity_logs (action) VALUES ('stopped')");
      database.run("INSERT INTO activity_logs (action) VALUES ('error')");
      const result = database.exec('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 2');
      expect(result[0].values.length).toBe(2);
    });

    it('creates activity log without agent', () => {
      const database = getTestDb();
      database.run("INSERT INTO activity_logs (agent_id, action, details) VALUES (?, ?, ?)", [null, 'system', 'System event']);
      const result = database.exec('SELECT * FROM activity_logs WHERE action = ?', ['system']);
      expect(result[0]).toBeDefined();
      expect(result[0].values[0][1]).toBeNull();
    });
  });
});
