import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDashboardStore } from '../stores/dashboardStore';
import { ROUTES } from '../routes';

export function ProjectDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = id ?? null;

  const { projects, sessions, isLoading } = useDashboardStore();

  const project = useMemo(() => {
    return projects.find((p) => p.id === projectId) || null;
  }, [projects, projectId]);

  const projectSessions = useMemo(() => sessions.filter((session) => session.directory === project?.directory), [sessions, project?.directory]);

  if (isLoading && !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{t('projects.loadingProject')}</span>
        </div>
      </div>
    );
  }

  if (!project && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h2 className="text-xl font-bold text-[var(--color-text)]">{t('projects.notFound')}</h2>
        <button
          type="button"
          onClick={() => navigate(ROUTES.HOME)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
        >
          {t('projects.goHome')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">{project?.name}</h1>
            <p className="text-[var(--color-text-secondary)] break-all">{project?.directory}</p>
          </div>
          <div className="flex gap-4 shrink-0">
            <div className="text-center px-4 py-3 bg-[var(--color-bg-tertiary)] rounded-lg min-w-[100px]">
              <div className="text-2xl font-bold text-[var(--color-text)]">{project?.activeSessionCount ?? 0}</div>
              <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mt-1">Active</div>
            </div>
            <div className="text-center px-4 py-3 bg-[var(--color-bg-tertiary)] rounded-lg min-w-[100px]">
              <div className="text-2xl font-bold text-[var(--color-text)]">{project?.totalSessionCount ?? 0}</div>
              <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mt-1">Sessions</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">OpenCode Sessions</h2>
        {isLoading ? (
          <div className="text-[var(--color-text-secondary)]">Loading sessions...</div>
        ) : projectSessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] p-6 text-[var(--color-text-secondary)]">No sessions found for this project.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {projectSessions.map((session) => (
              <div key={session.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-[var(--color-text-secondary)]">{session.agentLabel}</div>
                    <h3 className="text-lg font-semibold text-[var(--color-text)]">{session.title}</h3>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]">{session.status}</span>
                </div>
                <div className="text-sm text-[var(--color-text-secondary)]">{session.model ?? 'unknown model'}</div>
                <div className="space-y-1">
                  {session.todos.length === 0 ? (
                    <div className="text-sm text-[var(--color-text-secondary)]">No todos</div>
                  ) : session.todos.map((todo) => (
                    <div key={`${session.id}-${todo.position}-${todo.content}`} className="flex items-center justify-between rounded-md bg-[var(--color-bg-tertiary)] px-3 py-2 text-sm">
                      <span className="text-[var(--color-text)]">{todo.content}</span>
                      <span className="text-[var(--color-text-secondary)]">{todo.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
