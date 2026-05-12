import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { DashboardSession } from '../stores/dashboardStore.js';
import { ROUTES } from '../routes.js';

interface AgentKanbanCardProps {
  session: DashboardSession;
  allSessions: DashboardSession[];
}

const todoProgressColors = {
  done: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  active: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  pending: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function getTodoProgressClass(todos: DashboardSession['todos']): keyof typeof todoProgressColors {
  if (todos.length === 0) return 'pending';
  if (todos.some((t) => t.status === 'in_progress')) return 'active';
  if (todos.some((t) => t.status === 'cancelled' || t.status === 'failed')) return 'cancelled';
  if (todos.some((t) => t.status === 'completed')) return 'done';
  return 'pending';
}

function computeDepth(session: DashboardSession, allSessions: DashboardSession[]): number {
  let depth = 0;
  let current = session;
  while (current.parentId) {
    const parent = allSessions.find((s) => s.id === current.parentId);
    if (!parent) break;
    depth += 1;
    current = parent;
  }
  return depth;
}

function SessionChildTree({
  childSessions,
  allSessions,
  level = 0,
}: {
  childSessions: DashboardSession[];
  allSessions: DashboardSession[];
  level?: number;
}) {
  const navigate = useNavigate();
  if (childSessions.length === 0) return null;

  return (
    <div className="mt-2 ml-2 border-l-2 border-slate-700/50 pl-3 space-y-1">
      {childSessions.map((child) => {
        const grandChildren = allSessions.filter((s) => s.parentId === child.id);
        const hasGrandChildren = grandChildren.length > 0 && level < 2;

        return (
          <div key={child.id}>
            <button
              type="button"
              className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-[var(--color-bg-tertiary)] rounded px-1 -ml-1 bg-transparent border-0 text-left w-full"
              onClick={(e) => {
                e.stopPropagation();
                navigate(ROUTES.AGENT(child.id));
              }}
            >
              <span className="text-[11px] text-[var(--color-text)] line-clamp-1 flex-1">
                {child.title}
              </span>
              <span className="text-[10px] text-[var(--color-text-secondary)] shrink-0">
                {child.todos.filter((t) => t.status === 'completed').length}/{child.todos.length}
              </span>
            </button>
            {hasGrandChildren && (
              <SessionChildTree
                childSessions={grandChildren}
                allSessions={allSessions}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AgentKanbanCard({ session, allSessions }: AgentKanbanCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const completedTodos = session.todos.filter((t) => t.status === 'completed').length;
  const totalTodos = session.todos.length;
  const pendingTodos = session.todos.filter((t) => t.status === 'pending').length;
  const inProgressTodos = session.todos.filter((t) => t.status === 'in_progress').length;
  const cancelledTodos = session.todos.filter((t) => t.status === 'cancelled' || t.status === 'failed').length;

  const raw = (session as DashboardSession & {
    raw?: { summary_additions?: number | null; summary_deletions?: number | null; summary_files?: number | null };
  }).raw;
  const additions = raw?.summary_additions ?? 0;
  const deletions = raw?.summary_deletions ?? 0;
  const hasGitSummary = additions > 0 || deletions > 0;

  const childSessions = useMemo(
    () => allSessions.filter((s) => s.parentId === session.id),
    [allSessions, session.id],
  );
  const hasChildren = childSessions.length > 0;
  const [expanded, setExpanded] = useState(true);

  const depth = useMemo(() => computeDepth(session, allSessions), [session, allSessions]);
  const parent = useMemo(
    () => (session.parentId ? allSessions.find((s) => s.id === session.parentId) : null),
    [session.parentId, allSessions],
  );
  const rootSession = useMemo(() => {
    let current: DashboardSession | undefined = session;
    while (current?.parentId) {
      const p = allSessions.find((s) => s.id === current!.parentId);
      if (!p) break;
      current = p;
    }
    return current?.id === session.id ? null : current;
  }, [allSessions, session]);

  const handleClick = () => {
    navigate(ROUTES.AGENT(session.id));
  };

  const progressClass = todoProgressColors[getTodoProgressClass(session.todos)];

  const rationaleParts: string[] = [];
  if (totalTodos === 0) {
    rationaleParts.push(t('kanban.card.noTodos'));
  } else {
    if (inProgressTodos > 0) rationaleParts.push(`${inProgressTodos} ${t('kanban.card.inProgress')}`);
    if (pendingTodos > 0) rationaleParts.push(`${pendingTodos} ${t('kanban.card.pending')}`);
    if (completedTodos > 0) rationaleParts.push(`${completedTodos} ${t('kanban.card.done')}`);
    if (cancelledTodos > 0) rationaleParts.push(`${cancelledTodos} ${t('kanban.card.cancelled')}`);
  }
  const rationaleText = rationaleParts.join(' \u00b7 ');

  const blockers: string[] = [];
  if (cancelledTodos > 0) blockers.push(t('kanban.card.todosCancelledFailed', { count: cancelledTodos }));
  if (totalTodos > 0 && !hasGitSummary && completedTodos === 0 && session.status !== 'completed') {
    blockers.push(t('kanban.card.noGitActivity'));
  }
  if (totalTodos > 0 && pendingTodos === totalTodos && session.status !== 'completed') {
    blockers.push(t('kanban.card.allTodosPending'));
  }
  const hasBlockers = blockers.length > 0;

  const lastMessage = (session as DashboardSession & { lastMessage?: { role?: string; mode?: string } | null }).lastMessage;
  const evidenceParts: string[] = [];
  if (lastMessage?.role) evidenceParts.push(t('kanban.card.role', { role: lastMessage.role }));
  if (lastMessage?.mode && lastMessage.mode !== session.agentLabel) evidenceParts.push(t('kanban.card.mode', { mode: lastMessage.mode }));
  if (raw?.summary_files && raw.summary_files > 0) evidenceParts.push(t('kanban.card.filesChanged', { count: raw.summary_files }));
  if (session.lastMessageAt) {
    const minsAgo = Math.round((Date.now() - new Date(session.lastMessageAt).getTime()) / 60000);
    if (minsAgo < 60) evidenceParts.push(t('kanban.card.minutesAgo', { count: minsAgo }));
    else if (minsAgo < 1440) evidenceParts.push(t('kanban.card.hoursAgo', { count: Math.round(minsAgo / 60) }));
    else evidenceParts.push(t('kanban.card.daysAgo', { count: Math.round(minsAgo / 1440) }));
  }
  const evidenceText = evidenceParts.join(' \u00b7 ') || (session.updatedAt ? t('kanban.card.updated', { date: new Date(session.updatedAt).toLocaleDateString() }) : '');

  const sessionTypeLabel =
    session.sessionType === 'root'
      ? t('kanban.card.root')
      : session.sessionType === 'orphan'
        ? t('kanban.card.orphan')
        : t('kanban.card.child');

  return (
    <div className="group relative w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 hover:border-[var(--color-accent)]/50 transition-all duration-150 cursor-pointer">
      <button type="button" onClick={handleClick} className="absolute inset-0 z-0" aria-label={session.title} />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span className={`shrink-0 w-2 h-2 rounded-full ${
              session.status === 'running' ? 'bg-emerald-400 animate-pulse'
              : session.status === 'thinking' ? 'bg-amber-400 animate-pulse'
              : session.status === 'error' ? 'bg-red-400'
              : session.status === 'completed' ? 'bg-blue-400'
              : 'bg-slate-400'
            }`} />
            {hasChildren && (
              <button
                type="button"
                className="cursor-pointer text-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] shrink-0 bg-transparent border-0 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? '\u25be' : '\u25b8'}
              </button>
            )}
            <h4 className="text-sm font-medium text-[var(--color-text)] leading-snug line-clamp-2">
              {session.title}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {hasGitSummary && (
              <span className="text-[10px] font-mono text-emerald-400">
                +{additions}/<span className="text-red-400">-{deletions}</span>
              </span>
            )}
            {totalTodos > 0 && (
              <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${progressClass}`}>
                {completedTodos}/{totalTodos}
              </span>
            )}
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
              session.sessionType === 'root'
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                : session.sessionType === 'orphan'
                  ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                  : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
            }`}
          >
            {sessionTypeLabel}
          </span>
          {depth > 0 && (
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
              {t('kanban.card.depth')} {depth}
            </span>
          )}
          {parent && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)] truncate max-w-[220px]" title={parent.title}>
              <span className="uppercase tracking-wider opacity-60 shrink-0">{t('kanban.card.parent')}</span>
              <span className="truncate">{'\u2190'} {parent.title}</span>
              {rootSession && rootSession.id !== parent.id && (
                <span className="truncate text-[var(--color-text-secondary)]/60">
                  ({t('kanban.card.root')}: {rootSession.title})
                </span>
              )}
            </span>
          )}
        </div>

        {rationaleText && (
          <div className="mt-1.5 text-[11px] text-[var(--color-text-secondary)]">
            <span className="text-[10px] uppercase tracking-wider opacity-60 mr-1">{t('kanban.card.rationale')}</span>
            {rationaleText}
          </div>
        )}

        {hasBlockers && (
          <div className="mt-1.5 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-red-400/60">{t('kanban.card.blocker')}</span>
            {blockers.map((b) => (
              <span key={b} className="text-[11px] text-red-400 flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                {b}
              </span>
            ))}
          </div>
        )}

        {evidenceText && (
          <div className="mt-1.5 text-[11px] text-[var(--color-text-secondary)] border-t border-[var(--color-border)] pt-1.5">
            <span className="text-[10px] uppercase tracking-wider opacity-60 mr-1">{t('kanban.card.recent')}</span>
            {evidenceText}
          </div>
        )}

        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
          <span className="font-mono">{session.agentLabel}</span>
          {session.model && (
            <>
              <span>\u00b7</span>
              <span className="truncate max-w-[80px]">{session.model}</span>
            </>
          )}
        </div>

        {totalTodos > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex-1 h-1.5 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] rounded-full transition-all"
                style={{ width: `${(completedTodos / totalTodos) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)] font-mono">
              {completedTodos}/{totalTodos}
            </span>
          </div>
        )}

        {hasChildren && expanded && <SessionChildTree childSessions={childSessions} allSessions={allSessions} />}
      </div>
    </div>
  );
}
