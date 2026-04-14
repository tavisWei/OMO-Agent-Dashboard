import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  advanceTaskOrchestration,
  failTaskOrchestration,
  getTaskOrchestrationSnapshot,
  startTaskOrchestration,
} from './orchestrator.js';
import {
  createTaskOrchestration,
  getAllAgents,
  getTask,
  getTaskAssignments,
  getTaskDependencies,
  getTaskOrchestration,
  updateTask,
  updateTaskOrchestration,
} from '../db/index.js';

vi.mock('../db/index.js');
vi.mock('./websocket.js', () => ({
  broadcastAll: vi.fn(),
  createWSMessage: vi.fn((type: string, payload: unknown) => ({ type, payload, timestamp: 0 })),
}));

const task = {
  id: 1,
  title: 'Orchestrated Task',
  description: '',
  status: 'backlog' as const,
  position: 0,
  project_id: null,
  agent_id: null,
  parent_task_id: null,
  depends_on: [],
  priority: 'medium' as const,
  labels: [],
  due_date: null,
  estimated_tokens: null,
  actual_tokens: null,
  assigned_agents: [10],
  created_at: '',
  updated_at: '',
};

const orchestration = {
  id: 1,
  task_id: 1,
  pattern: 'sequential' as const,
  agent_order: [{ agent_id: 10, role: 'lead' as const, label: 'Agent 10' }],
  current_step: 0,
  status: 'running' as const,
  created_at: '',
  updated_at: '',
};

describe('orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTask).mockReturnValue(task);
    vi.mocked(getTaskAssignments).mockReturnValue([{ task_id: 1, agent_id: 10, role: 'lead', assigned_at: '' }]);
    vi.mocked(getAllAgents).mockReturnValue([{ id: 10, name: 'Agent 10', model_id: null, model: 'gpt-4', status: 'idle', project_id: null, temperature: 0.7, top_p: 0.9, max_tokens: 4096, last_heartbeat: null, config_path: null, source: 'ui_created', created_at: '', updated_at: '' }]);
    vi.mocked(getTaskDependencies).mockReturnValue([]);
  });

  it('starts orchestration', () => {
    vi.mocked(createTaskOrchestration).mockReturnValue(orchestration);
    vi.mocked(updateTaskOrchestration).mockReturnValue(orchestration);
    const result = startTaskOrchestration(1, { pattern: 'sequential' });
    expect('event' in result && result.event).toBe('started');
    expect(updateTask).toHaveBeenCalled();
  });

  it('returns snapshot', () => {
    vi.mocked(getTaskOrchestration).mockReturnValue(orchestration);
    const snapshot = getTaskOrchestrationSnapshot(1);
    expect(snapshot?.task.id).toBe(1);
    expect(snapshot?.orchestration.pattern).toBe('sequential');
  });

  it('advances orchestration', () => {
    vi.mocked(getTaskOrchestration).mockReturnValue(orchestration);
    vi.mocked(updateTaskOrchestration).mockReturnValue({ ...orchestration, status: 'completed', current_step: 1 });
    const result = advanceTaskOrchestration(1);
    expect('event' in result && result.event).toBe('completed');
  });

  it('fails orchestration', () => {
    vi.mocked(getTaskOrchestration).mockReturnValue(orchestration);
    vi.mocked(updateTaskOrchestration).mockReturnValue({ ...orchestration, status: 'failed' });
    const result = failTaskOrchestration(1);
    expect('event' in result && result.event).toBe('failed');
    expect(updateTask).toHaveBeenCalledWith(1, { status: 'failed' });
  });
});
