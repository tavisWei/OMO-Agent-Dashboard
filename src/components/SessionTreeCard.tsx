import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes';
import type { DashboardSession } from '../stores/dashboardStore';

interface SessionWithRaw extends DashboardSession {
  raw?: {
    summary_additions?: number | null;
    summary_deletions?: number | null;
    summary_files?: number | null;
  };
  lastMessage?: {
    role?: string;
    mode?: string;
  } | null;
}

interface SessionTreeCardProps {
  rootSession: DashboardSession;
  allSessions: DashboardSession[];
}

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

const TODO_STATUS_COLORS: Record<string, string> = {
  completed: 'text-emerald-400',
  in_progress: 'text-amber-400',
  pending: 'text-slate-400',
  cancelled: 'text-red-400',
  failed: 'text-red-400',
};

function statusDot(status: string): string {
  return STATUS_DOT[status] ?? 'bg-slate-400';
}

function useStatusText() {
  const { t } = useTranslation();
  return (status: string) => t(`workboard.status.${status}`) || status;
}

function isPulsingStatus(status: string): boolean {
  return status === 'running' || status === 'thinking';
}

function formatRelativeTime(dateStr: string | null, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (!dateStr) return '-';
  const minsAgo = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (minsAgo < 1) return t('workboard.time.justNow');
  if (minsAgo < 60) return t('workboard.time.minutesAgo', { count: minsAgo });
  if (minsAgo < 1440) return t('workboard.time.hoursAgo', { count: Math.round(minsAgo / 60) });
  return t('workboard.time.daysAgo', { count: Math.round(minsAgo / 1440) });
}

function formatTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0';
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// TodoList — expandable todo details for a session
// ---------------------------------------------------------------------------

function TodoList({ todos }: { todos: DashboardSession['todos'] }) {
  if (todos.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1">
      {todos.map((todo) => (
        <div
          key={todo.position}
          className="flex items-center gap-1.5 text-[11px] pl-1"
        >
          <span className={`w-1 h-1 rounded-full flex-shrink-0 ${TODO_STATUS_COLORS[todo.status] ?? 'text-slate-400'}`}>
            <span className={`block w-full h-full rounded-full ${statusDot(todo.status === 'in_progress' ? 'running' : todo.status === 'completed' ? 'completed' : todo.status === 'failed' || todo.status === 'cancelled' ? 'error' : 'queued')}`} />
          </span>
          <span className="truncate text-[var(--color-text-secondary)]">{todo.content}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TreeNodeRow — individual node with detailed info
// ---------------------------------------------------------------------------

interface TreeNodeRowProps {
  session: DashboardSession;
  depth: number;
  isLast: boolean;
  onNavigate: (id: string) => void;
}

function TreeNodeRow({ session, depth, isLast, onNavigate }: TreeNodeRowProps) {
  const { t } = useTranslation();
  const getStatusText = useStatusText();
  const [showFullMessage, setShowFullMessage] = useState(false);
  const sessionWithRaw = session as SessionWithRaw;
  const additions = sessionWithRaw.raw?.summary_additions;
  const deletions = sessionWithRaw.raw?.summary_deletions;
  const filesChanged = sessionWithRaw.raw?.summary_files;

  const completedTodos = session.todos.filter((t) => t.status === 'completed').length;
  const inProgressTodos = session.todos.filter((t) => t.status === 'in_progress').length;
  const pendingTodos = session.todos.filter((t) => t.status === 'pending').length;
  const failedTodos = session.todos.filter((t) => t.status === 'cancelled' || t.status === 'failed').length;
  const totalTodos = session.todos.length;

  const handleClick = useCallback(() => {
    onNavigate(session.id);
  }, [session.id, onNavigate]);

  const pulseClass = isPulsingStatus(session.status) ? 'animate-pulse' : '';

  return (
    <div className="relative">
      {depth > 0 && (
        <>
          <div
            className="absolute border-l-2 border-dashed border-[var(--color-border)]"
            style={{
              left: `${depth * 20 - 10}px`,
              top: 0,
              bottom: isLast ? '50%' : 0,
            }}
          />
          <div
            className="absolute border-t-2 border-dashed border-[var(--color-border)]"
            style={{
              left: `${depth * 20 - 10}px`,
              width: '10px',
              top: '20px',
            }}
          />
        </>
      )}

      <div
        className="group py-2.5 px-2 rounded-lg w-full
          hover:bg-[var(--color-bg-tertiary)]/60 transition-colors duration-150"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {/* Clickable area for navigation */}
        <button
          type="button"
          className="flex items-start gap-2 w-full text-left bg-transparent border-0 cursor-pointer p-0"
          onClick={handleClick}
        >
          {/* Status indicator */}
          <div className="relative flex-shrink-0 mt-1">
            <span className={`block w-2.5 h-2.5 rounded-full ${statusDot(session.status)} ${pulseClass}`} />
            {session.status === 'running' && (
              <span className="absolute inset-0 w-2.5 h-2.5 rounded-full border-2 border-emerald-500 animate-ping opacity-40" />
            )}
          </div>

          {/* Title and status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[var(--color-text)] truncate flex-1 min-w-0">
                {session.title || t('workboard.untitledSession')}
              </span>

              {/* Status badge */}
              <span className="flex-shrink-0 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full
                bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot(session.status)}`} />
                <span className="text-[var(--color-text-secondary)]">{getStatusText(session.status)}</span>
              </span>
            </div>
          </div>
        </button>

        {/* Message preview - outside button to prevent navigation */}
        {session.lastMessageText && (
          <div 
            className="mt-2 text-sm text-[var(--color-text)] line-clamp-3 leading-relaxed font-medium bg-[var(--color-bg-tertiary)]/50 px-2 py-1.5 rounded border border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors"
            onClick={() => setShowFullMessage(true)}
            title={t('workboard.clickToExpand')}
          >
            {session.lastMessageText}
          </div>
        )}

            {/* Full Message Modal */}
            {showFullMessage && session.lastMessageText && (
              <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowFullMessage(false)}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div className="relative bg-[var(--color-bg-secondary)] rounded-xl shadow-2xl w-full max-w-2xl mx-4 border border-[var(--color-border)] max-h-[80vh] flex flex-col">
                  <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
                    <h2 className="text-lg font-semibold text-[var(--color-text)]">{t('workboard.messageContent')}</h2>
                    <button onClick={() => setShowFullMessage(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors p-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="overflow-y-auto p-5">
                    <div className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
                      {session.lastMessageText}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata row */}
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {/* Agent label */}
              {session.agentLabel && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {session.agentLabel}
                </span>
              )}

              {/* Session type */}
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                session.sessionType === 'root'
                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                  : session.sessionType === 'orphan'
                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
              }`}>
                {session.sessionType}
              </span>

              {/* Model info */}
              {session.model && (
                <span className="text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)]
                  px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                  {session.provider && `${session.provider}/`}{session.model}
                  {session.variant && `:${session.variant}`}
                </span>
              )}

              {/* Token stats */}
              {session.totalTokens > 0 && (
                <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                  {formatTokens(session.totalTokens)} tokens
                </span>
              )}

              {/* Cost */}
              {session.cost > 0 && (
                <span className="text-[10px] font-mono text-emerald-400">
                  {formatCost(session.cost)}
                </span>
              )}

              {/* Time */}
              {session.lastMessageAt && (
                <span className="text-[10px] text-[var(--color-text-secondary)]">
                  {formatRelativeTime(session.lastMessageAt, t)}
                </span>
              )}
            </div>

            {/* Todo breakdown */}
            {totalTodos > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[10px] text-[var(--color-text-secondary)]">
                  {t('workboard.todos')}:
                </span>
                {inProgressTodos > 0 && (
                  <span className="text-[10px] text-amber-400">{inProgressTodos} {t('workboard.inProgress')}</span>
                )}
                {pendingTodos > 0 && (
                  <span className="text-[10px] text-slate-400">{pendingTodos} {t('workboard.pending')}</span>
                )}
                {completedTodos > 0 && (
                  <span className="text-[10px] text-emerald-400">{completedTodos} {t('workboard.done')}</span>
                )}
                {failedTodos > 0 && (
                  <span className="text-[10px] text-red-400">{failedTodos} {t('workboard.failed')}</span>
                )}
              </div>
            )}

            {/* Todo list */}
            <TodoList todos={session.todos} />

              {/* Git & evidence row */}
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {(additions != null && additions > 0) || (deletions != null && deletions > 0) ? (
                <span className="flex items-center gap-1 text-[10px] font-mono tabular-nums">
                  <svg className="w-3 h-3 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <title>Code changes</title>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {(additions ?? 0) > 0 && <span className="text-emerald-400">+{additions}</span>}
                  {(additions ?? 0) > 0 && (deletions ?? 0) > 0 && (
                    <span className="text-[var(--color-text-secondary)]">/</span>
                  )}
                  {(deletions ?? 0) > 0 && <span className="text-red-400">-{deletions}</span>}
                </span>
              ) : null}

              {filesChanged != null && filesChanged > 0 && (
                <span className="text-[10px] text-[var(--color-text-secondary)]">
                  {filesChanged} {t('workboard.filesChanged')}
                </span>
              )}

              {/* Last message info */}
              {sessionWithRaw.lastMessage && (
                <span className="text-[10px] text-[var(--color-text-secondary)]">
                  {sessionWithRaw.lastMessage.role && `${sessionWithRaw.lastMessage.role}`}
                  {sessionWithRaw.lastMessage.mode && sessionWithRaw.lastMessage.mode !== session.agentLabel && ` · ${sessionWithRaw.lastMessage.mode}`}
                </span>
              )}
            </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SessionTreeCard
// ---------------------------------------------------------------------------

export function SessionTreeCard({ rootSession, allSessions }: SessionTreeCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const treeNodes = useMemo(() => {
    const nodes: { session: DashboardSession; depth: number; isLast: boolean }[] = [];

    function collectChildren(parentId: string | null, depth: number) {
      const children = allSessions.filter((s) => s.parentId === parentId);
      children.forEach((child, index) => {
        const isLast = index === children.length - 1;
        nodes.push({ session: child, depth, isLast });
        collectChildren(child.id, depth + 1);
      });
    }

    nodes.push({ session: rootSession, depth: 0, isLast: false });
    collectChildren(rootSession.id, 1);

    return nodes;
  }, [rootSession, allSessions]);

  const totalTodos = treeNodes.reduce((sum, { session }) => sum + session.todos.length, 0);
  const completedTodos = treeNodes.reduce(
    (sum, { session }) => sum + session.todos.filter((t) => t.status === 'completed').length,
    0,
  );
  const totalTokens = treeNodes.reduce((sum, { session }) => sum + session.totalTokens, 0);
  const totalCost = treeNodes.reduce((sum, { session }) => sum + session.cost, 0);
  const runningNodes = treeNodes.filter(({ session }) => session.status === 'running').length;
  const errorNodes = treeNodes.filter(({ session }) => session.status === 'error').length;
  const completedNodes = treeNodes.filter(({ session }) => session.status === 'completed').length;

  const handleNavigate = useCallback(
    (id: string) => {
      navigate(ROUTES.AGENT(id));
    },
    [navigate],
  );

  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl
      hover:border-[var(--color-accent)]/30 transition-all duration-200
      flex flex-col overflow-hidden">
      {/* Card Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title & status */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">
                {rootSession.title || t('workboard.untitledTree')}
              </h3>

              {runningNodes > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded
                  bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t('workboard.runningCount', { count: runningNodes })}
                </span>
              )}
              {errorNodes > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded
                  bg-red-500/10 text-red-400 border border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {t('workboard.errorCount', { count: errorNodes })}
                </span>
              )}
              {completedNodes > 0 && runningNodes === 0 && errorNodes === 0 && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded
                  bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {t('workboard.done')}
                </span>
              )}
            </div>

            {/* Root metadata */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {rootSession.agentLabel && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {rootSession.agentLabel}
                </span>
              )}

              {rootSession.model && (
                <span className="text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)]
                  px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                  {rootSession.provider && `${rootSession.provider}/`}{rootSession.model}
                </span>
              )}

              {rootSession.directory && (
                <span className="text-[10px] text-[var(--color-text-secondary)] truncate max-w-[200px]">
                  {rootSession.directory}
                </span>
              )}
            </div>
          </div>

          {/* Tree stats */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {totalTodos > 0 && (
              <span className="text-[11px] text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)]
                px-2 py-0.5 rounded-full border border-[var(--color-border)]">
                {t('workboard.todosCount', { completed: completedTodos, total: totalTodos })}
              </span>
            )}
            {totalTokens > 0 && (
              <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
                {formatTokens(totalTokens)} {t('workboard.tokens')}
              </span>
            )}
            {totalCost > 0 && (
              <span className="text-[10px] font-mono text-emerald-400">
                {formatCost(totalCost)}
              </span>
            )}
            <span className="text-[10px] text-[var(--color-text-secondary)]">
              {t('workboard.nodesCount', { count: treeNodes.length })}
            </span>
          </div>
        </div>
      </div>

      {/* Tree nodes */}
      <div className="flex-1 p-2 space-y-0.5 overflow-y-auto max-h-[600px]">
        {treeNodes.map(({ session, depth, isLast }) => (
          <TreeNodeRow
            key={session.id}
            session={session}
            depth={depth}
            isLast={isLast}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    </div>
  );
}

export default SessionTreeCard;
