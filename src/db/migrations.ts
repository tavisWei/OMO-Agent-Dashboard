import type { Database } from 'sql.js';
import { ALL_SCHEMA, CREATE_INDEXES } from './schema.js';

const DEFAULT_MODELS = [
  {
    name: 'GPT-4',
    provider: 'openai',
    model_id: 'gpt-4',
    description: 'OpenAI GPT-4 for general-purpose reasoning tasks.',
    pricing_input: 30,
    pricing_output: 60,
    max_tokens: 8192,
    is_active: 1,
  },
  {
    name: 'GPT-4o',
    provider: 'openai',
    model_id: 'gpt-4o',
    description: 'OpenAI GPT-4o multimodal flagship model.',
    pricing_input: 5,
    pricing_output: 15,
    max_tokens: 128000,
    is_active: 1,
  },
  {
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    model_id: 'claude-3-opus-20240229',
    description: 'Anthropic Claude 3 Opus for advanced analysis and planning.',
    pricing_input: 15,
    pricing_output: 75,
    max_tokens: 200000,
    is_active: 1,
  },
  {
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    model_id: 'claude-3-5-sonnet-20241022',
    description: 'Anthropic Claude 3.5 Sonnet balanced for speed and quality.',
    pricing_input: 3,
    pricing_output: 15,
    max_tokens: 200000,
    is_active: 1,
  },
  {
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    model_id: 'gemini-1.5-pro',
    description: 'Google Gemini 1.5 Pro for large-context reasoning workloads.',
    pricing_input: 3.5,
    pricing_output: 10.5,
    max_tokens: 2000000,
    is_active: 1,
  },
  {
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    model_id: 'gemini-1.5-flash',
    description: 'Google Gemini 1.5 Flash optimized for low-latency responses.',
    pricing_input: 0.35,
    pricing_output: 1.05,
    max_tokens: 1000000,
    is_active: 1,
  },
] as const;

export function runMigrations(db: Database): void {
  db.run(ALL_SCHEMA);
  ensureColumn(db, 'agents', 'source', "TEXT NOT NULL DEFAULT 'ui_created'");
  db.run("UPDATE agents SET source = 'ui_created' WHERE source IS NULL OR source = ''");
  ensureAgentsModelIdForeignKey(db);
  ensureTasksSchema(db);
  ensureTaskOrchestrationsSchema(db);

  ensureColumn(db, 'activity_logs', 'agent_name', 'TEXT');
  db.run(`
    UPDATE activity_logs
    SET agent_name = (
      SELECT name
      FROM agents
      WHERE agents.id = activity_logs.agent_id
    )
    WHERE agent_name IS NULL AND agent_id IS NOT NULL
  `);

  ensureColumn(db, 'models', 'description', "TEXT DEFAULT ''");
  ensureColumn(db, 'models', 'pricing_input', 'REAL DEFAULT 0');
  ensureColumn(db, 'models', 'pricing_output', 'REAL DEFAULT 0');
  ensureColumn(db, 'models', 'max_tokens', 'INTEGER DEFAULT 0');
  ensureColumn(db, 'models', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn(db, 'models', 'created_at', "TEXT DEFAULT (datetime('now'))");
  ensureColumn(db, 'models', 'updated_at', "TEXT DEFAULT (datetime('now'))");
  seedModels(db);
  db.run(CREATE_INDEXES);

  db.run("PRAGMA journal_mode=WAL;");
  db.run("PRAGMA foreign_keys=ON;");
}

export function initializeDatabase(db: Database): void {
  runMigrations(db);
}

function ensureColumn(db: Database, tableName: string, columnName: string, definition: string): void {
  const columns = db.exec(`PRAGMA table_info(${tableName})`)[0]?.values ?? [];
  const hasColumn = columns.some((column) => column[1] === columnName);

  if (!hasColumn) {
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function ensureAgentsModelIdForeignKey(db: Database): void {
  const columns = db.exec('PRAGMA table_info(agents)')[0]?.values ?? [];
  const hasModelIdColumn = columns.some((column) => column[1] === 'model_id');
  const foreignKeys = db.exec('PRAGMA foreign_key_list(agents)')[0]?.values ?? [];
  const hasModelIdForeignKey = foreignKeys.some((foreignKey) => foreignKey[3] === 'model_id' && foreignKey[2] === 'models');

  if (hasModelIdColumn && hasModelIdForeignKey) {
    return;
  }

  db.run('ALTER TABLE agents RENAME TO agents_old');
  db.run(`
    CREATE TABLE agents (
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
    )
  `);
  db.run(`
    INSERT INTO agents (
      id,
      name,
      project_id,
      model_id,
      model,
      temperature,
      top_p,
      max_tokens,
      status,
      last_heartbeat,
      config_path,
      source,
      created_at,
      updated_at
    )
    SELECT
      id,
      name,
      project_id,
      NULL,
      model,
      temperature,
      top_p,
      max_tokens,
      status,
      last_heartbeat,
      config_path,
      COALESCE(NULLIF(source, ''), 'ui_created'),
      created_at,
      updated_at
    FROM agents_old
  `);
  db.run('DROP TABLE agents_old');
  db.run('CREATE INDEX IF NOT EXISTS idx_agents_project_id ON agents(project_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_agents_model_id ON agents(model_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)');
}

function ensureTasksSchema(db: Database): void {
  ensureColumn(db, 'tasks', 'parent_task_id', 'INTEGER REFERENCES tasks(id) ON DELETE SET NULL');
  ensureColumn(db, 'tasks', 'depends_on', "TEXT DEFAULT '[]'");
  ensureColumn(db, 'tasks', 'priority', "TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical'))");
  ensureColumn(db, 'tasks', 'labels', "TEXT DEFAULT '[]'");
  ensureColumn(db, 'tasks', 'due_date', 'INTEGER');
  ensureColumn(db, 'tasks', 'estimated_tokens', 'INTEGER');
  ensureColumn(db, 'tasks', 'assigned_agents', "TEXT DEFAULT '[]'");

  db.run("UPDATE tasks SET depends_on = '[]' WHERE depends_on IS NULL OR TRIM(depends_on) = ''");
  db.run("UPDATE tasks SET priority = 'medium' WHERE priority IS NULL OR TRIM(priority) = ''");
  db.run("UPDATE tasks SET labels = '[]' WHERE labels IS NULL OR TRIM(labels) = ''");
  db.run("UPDATE tasks SET assigned_agents = '[]' WHERE assigned_agents IS NULL OR TRIM(assigned_agents) = ''");
}

function ensureTaskOrchestrationsSchema(db: Database): void {
  db.run(`
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
    )
  `);

  ensureColumn(db, 'task_orchestrations', 'agent_order', "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, 'task_orchestrations', 'current_step', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'task_orchestrations', 'status', "TEXT NOT NULL DEFAULT 'pending'");
  ensureColumn(db, 'task_orchestrations', 'created_at', "TEXT DEFAULT (datetime('now'))");
  ensureColumn(db, 'task_orchestrations', 'updated_at', "TEXT DEFAULT (datetime('now'))");

  db.run("UPDATE task_orchestrations SET agent_order = '[]' WHERE agent_order IS NULL OR TRIM(agent_order) = ''");
  db.run("UPDATE task_orchestrations SET current_step = 0 WHERE current_step IS NULL OR current_step < 0");
  db.run("UPDATE task_orchestrations SET status = 'pending' WHERE status IS NULL OR TRIM(status) = ''");
}

function seedModels(db: Database): void {
  for (const model of DEFAULT_MODELS) {
    db.run(
      `INSERT OR IGNORE INTO models (
        name,
        provider,
        model_id,
        description,
        pricing_input,
        pricing_output,
        max_tokens,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        model.name,
        model.provider,
        model.model_id,
        model.description,
        model.pricing_input,
        model.pricing_output,
        model.max_tokens,
        model.is_active,
      ]
    );
  }
}
