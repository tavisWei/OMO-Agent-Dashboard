import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDashboardStore } from '../stores/dashboardStore';
import { ROUTES } from '../routes';

const statusColors: Record<string, string> = {
  queued: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  running: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  thinking: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  active: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

export function AgentDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessions, isLoading } = useDashboardStore();

  const session = useMemo(() => sessions.find((entry) => entry.id === id) ?? null, [sessions, id]);

  if (isLoading && !session) {
    return <div className="text-[var(--color-text-secondary)]">{t('common.loading')}</div>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h2 className="text-xl font-bold text-[var(--color-text)]">{t('agents.notFound')}</h2>
        <button
          type="button"
          onClick={() => navigate(ROUTES.AGENTS)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
        >
          {t('agents.backToAgents')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl font-bold text-[var(--color-text)]">{session.title}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[session.status] ?? statusColors.idle}`}>
              {t(`status.${session.status}`)}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-700/30 text-slate-300 border-slate-700/50">
              {session.model ?? 'unknown model'}
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">{session.agentLabel} · {session.directory}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">Todos</p>
          <p className="text-2xl font-bold text-[var(--color-text)] mt-1">{session.todos.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">Tokens</p>
          <p className="text-2xl font-bold text-[var(--color-text)] mt-1">{session.totalTokens.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">Provider</p>
          <p className="text-2xl font-bold text-[var(--color-text)] mt-1">{session.provider ?? '-'}</p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">Updated</p>
          <p className="text-sm font-medium text-[var(--color-text)] mt-2 break-all">{session.updatedAt}</p>
        </div>
      </div>

      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Todo Details</h2>
        {session.todos.length === 0 ? (
          <p className="text-[var(--color-text-secondary)]">No todos</p>
        ) : (
          <div className="space-y-3">
            {session.todos.map((todo) => (
              <div key={`${session.id}-${todo.position}-${todo.content}`} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[var(--color-text)]">{todo.content}</div>
                  <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">{todo.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
