import { useNavigate } from 'react-router-dom';
import type { DashboardSession } from '../stores/dashboardStore.js';
import { ROUTES } from '../routes.js';
import { useTranslation } from 'react-i18next';

interface AgentKanbanCardProps {
  session: DashboardSession;
}

const statusBadgeClasses: Record<string, string> = {
  queued: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  idle: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  running: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  stopped: 'bg-slate-600/20 text-slate-300 border-slate-600/30',
  thinking: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  offline: 'bg-slate-700/20 text-slate-500 border-slate-700/30',
};

export function AgentKanbanCard({ session }: AgentKanbanCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const completedTodos = session.todos.filter((t) => t.status === 'completed').length;
  const totalTodos = session.todos.length;

  const raw = (session as DashboardSession & {
    raw?: { summary_additions?: number | null; summary_deletions?: number | null };
  }).raw;

  const additions = raw?.summary_additions ?? 0;
  const deletions = raw?.summary_deletions ?? 0;
  const hasGitSummary = additions > 0 || deletions > 0;

  const handleClick = () => {
    navigate(ROUTES.AGENT(session.id));
  };

  const badgeClass = statusBadgeClasses[session.status] ?? statusBadgeClasses.offline;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group relative w-full text-left bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3
        hover:border-[var(--color-accent)]/50 transition-all duration-150 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-[var(--color-text)] leading-snug line-clamp-2 flex-1">
          {session.title}
        </h4>
        <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${badgeClass}`}>
          {t(`status.${session.status}`)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
        <span className="font-mono">{session.agentLabel}</span>
        {session.model && (
          <>
            <span>·</span>
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

      {hasGitSummary && (
        <div className="mt-2 flex items-center gap-2 text-[10px] font-mono">
          <span className="text-emerald-400">+{additions}</span>
          <span className="text-red-400">-{deletions}</span>
        </div>
      )}

      <div className="mt-2 text-[10px] text-[var(--color-text-secondary)]">
        {new Date(session.updatedAt).toLocaleDateString()}
      </div>
    </button>
  );
}
