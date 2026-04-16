import { describe, expect, it } from 'vitest';
import { inferSessionStatus, toDashboardSession, toProjectGroups, toSessionTree } from './adapter.js';
import type { OpenCodeMessageRow, OpenCodeSessionRow, OpenCodeTodoRow } from '../types/opencode.js';

const baseSession: OpenCodeSessionRow = {
  id: 'ses_root',
  project_id: 'global',
  parent_id: null,
  slug: 'root',
  directory: '/tmp/project-a',
  title: 'Root Session',
  version: '1',
  share_url: null,
  summary_additions: null,
  summary_deletions: null,
  summary_files: null,
  summary_diffs: null,
  revert: null,
  permission: null,
  time_created: Date.now() - 10_000,
  time_updated: Date.now() - 5_000,
  time_compacting: null,
  time_archived: null,
  workspace_id: null,
};

function makeMessage(overrides: Partial<OpenCodeMessageRow> = {}): OpenCodeMessageRow {
  return {
    id: 'msg_1',
    session_id: 'ses_root',
    time_created: Date.now() - 2_000,
    time_updated: Date.now() - 2_000,
    data: '{}',
    parsed: {
      mode: 'Sisyphus',
      modelID: 'openai/gpt-5.4',
      providerID: 'openai',
      variant: 'medium',
      cost: 1.2,
      tokens: { input: 10, output: 20, reasoning: 5, total: 35 },
      time: { created: Date.now() - 2_000 },
    },
    ...overrides,
  };
}

describe('adapter', () => {
  it('infers running status from in_progress todo', () => {
    const todos: OpenCodeTodoRow[] = [{
      session_id: 'ses_root',
      content: 'Work item',
      status: 'in_progress',
      priority: 'high',
      position: 0,
      time_created: Date.now(),
      time_updated: Date.now(),
    }];

    expect(inferSessionStatus(baseSession, todos, [makeMessage()])).toBe('running');
  });

  it('builds dashboard session with token metadata', () => {
    const session = toDashboardSession(baseSession, [], [makeMessage()]);
    expect(session.title).toBe('Root Session');
    expect(session.model).toBe('openai/gpt-5.4');
    expect(session.totalTokens).toBe(35);
    expect(session.agentLabel).toBe('Sisyphus');
  });

  it('builds tree and marks orphan nodes', () => {
    const root = toDashboardSession(baseSession, [], [makeMessage()]);
    const child = toDashboardSession({ ...baseSession, id: 'ses_child', parent_id: 'ses_root', title: 'Child' }, [], [makeMessage({ session_id: 'ses_child' })]);
    const orphan = toDashboardSession({ ...baseSession, id: 'ses_orphan', parent_id: 'missing-parent', title: 'Orphan' }, [], [makeMessage({ session_id: 'ses_orphan' })]);
    const tree = toSessionTree([root, child, orphan]);

    const rootNode = tree.find((entry) => entry.id === 'ses_root');
    const orphanNode = tree.find((entry) => entry.id === 'ses_orphan');
    expect(rootNode?.children).toHaveLength(1);
    expect(rootNode?.children[0]?.id).toBe('ses_child');
    expect(orphanNode?.sessionType).toBe('orphan');
  });

  it('groups projects by directory with activity counts', () => {
    const sessions = [
      toDashboardSession(baseSession, [], [makeMessage()]),
      toDashboardSession({ ...baseSession, id: 'ses_2', title: 'Second' }, [], [makeMessage({ session_id: 'ses_2' })]),
    ];
    const groups = toProjectGroups(sessions, [{
      id: 'global',
      worktree: '/',
      vcs: null,
      name: 'Global',
      icon_url: null,
      icon_color: null,
      time_created: Date.now(),
      time_updated: Date.now(),
      time_initialized: null,
      sandboxes: '[]',
      commands: null,
    }]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.totalSessionCount).toBe(2);
    expect(groups[0]?.directory).toBe('/tmp/project-a');
  });
});
