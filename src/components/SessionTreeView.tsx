import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes';
import { toSessionTree } from '../server/adapter';
import type { DashboardSession, DashboardSessionTreeNode } from '../types/domain';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionTreeViewProps {
  sessions: DashboardSession[];
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<string, string> = {
  running: 'bg-emerald-500',
  queued: 'bg-slate-400',
  idle: 'bg-slate-400',
  completed: 'bg-blue-500',
  error: 'bg-red-500',
  stopped: 'bg-slate-600',
  thinking: 'bg-yellow-500',
  offline: 'bg-gray-300',
  active: 'bg-amber-500',
};

const STATUS_LABELS: Record<string, string> = {
  running: 'Running',
  queued: 'Queued',
  idle: 'Idle',
  completed: 'Completed',
  error: 'Error',
  stopped: 'Stopped',
  thinking: 'Thinking',
  offline: 'Offline',
  active: 'Active',
};

function statusDot(status: string): string {
  return STATUS_DOT[status] ?? 'bg-slate-400';
}

function statusText(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// ---------------------------------------------------------------------------
// TreeNode — recursive session node renderer
// ---------------------------------------------------------------------------

interface TreeNodeProps {
  node: DashboardSessionTreeNode;
  depth: number;
  isActive: boolean;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: (id: string) => void;
}

function TreeNode({ node, depth, isActive, expandedIds, onToggle, onNavigate }: TreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const completedTodos = node.todos.filter((todo) => todo.status === 'completed').length;
  const totalTodos = node.todos.length;
  const additions = node.raw.summary_additions;
  const deletions = node.raw.summary_deletions;

  const handleClick = useCallback(() => {
    onNavigate(node.id);
  }, [node.id, onNavigate]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle(node.id);
    },
    [node.id, onToggle],
  );

  return (
    <div>
      {/* Node row */}
      <div
        className={[
          'group relative flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer',
          'hover:bg-slate-800/60 transition-colors duration-150',
          'border-l-2 border-transparent',
          depth > 0 && 'border-slate-700/50',
        ].join(' ')}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Expand/collapse toggle */}
        <button
          type="button"
          className={[
            'flex-shrink-0 w-4 h-4 flex items-center justify-center rounded',
            'text-slate-500 hover:text-slate-300 transition-colors',
            !hasChildren && 'invisible',
          ].join(' ')}
          onClick={handleToggle}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={[
              'w-3 h-3 transition-transform duration-150',
              isExpanded && 'rotate-90',
            ].join(' ')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Active pulse indicator */}
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400"
            style={{
              animation: 'sessionPulse 2s ease-in-out infinite',
              marginLeft: '-5px',
            }}
          />
        )}

        {/* Title */}
        <span
          className={[
            'flex-1 truncate text-sm',
            isActive ? 'font-semibold text-amber-200' : 'font-medium text-slate-300',
          ].join(' ')}
        >
          {node.title || 'Untitled Session'}
        </span>

        {/* Status badge */}
        <span className="flex-shrink-0 flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-slate-800/50 border border-slate-700/40">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot(node.status)}`} />
          <span className="text-slate-400">{statusText(node.status)}</span>
        </span>

        {/* Todo progress */}
        {totalTodos > 0 && (
          <span className="flex-shrink-0 text-[11px] text-slate-500 tabular-nums">
            {completedTodos}/{totalTodos}
          </span>
        )}

        {/* Git summary */}
        {(additions != null || deletions != null) && (
          <span className="flex-shrink-0 flex items-center gap-1 text-[11px] tabular-nums">
            {additions != null && (
              <span className="text-emerald-400">+{additions}</span>
            )}
            {additions != null && deletions != null && (
              <span className="text-slate-600">/</span>
            )}
            {deletions != null && (
              <span className="text-red-400">-{deletions}</span>
            )}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isActive={false}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SessionTreeView — root component
// ---------------------------------------------------------------------------

export function SessionTreeView({ sessions }: SessionTreeViewProps) {
  const navigate = useNavigate();

  // Build tree from flat sessions list
  const tree = useMemo(() => toSessionTree(sessions), [sessions]);

  // Identify active session (most recent updatedAt)
  const activeSessionId = useMemo(() => {
    if (sessions.length === 0) return null;
    let latest = sessions[0];
    for (let i = 1; i < sessions.length; i++) {
      if (sessions[i].updatedAt > latest.updatedAt) {
        latest = sessions[i];
      }
    }
    return latest.id;
  }, [sessions]);

  // Expand/collapse state — auto-expand root nodes
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    for (const node of tree) {
      ids.add(node.id);
    }
    return ids;
  });

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleNavigate = useCallback(
    (id: string) => {
      navigate(ROUTES.AGENT(id));
    },
    [navigate],
  );

  // Empty state
  if (tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <svg
          className="w-10 h-10 mb-3 opacity-30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <p className="text-sm">No sessions found</p>
      </div>
    );
  }

  return (
    <div className="session-tree-view">
      <style>
        {`@keyframes sessionPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }`}
      </style>

      <div className="space-y-0.5">
        {tree.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            isActive={node.id === activeSessionId}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    </div>
  );
}

export default SessionTreeView;
