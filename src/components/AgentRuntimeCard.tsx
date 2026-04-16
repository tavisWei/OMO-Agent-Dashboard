import type { AgentRuntime } from '../stores/agentRuntimeStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { useTranslation } from 'react-i18next';

const statusColors: Record<AgentRuntime['status'], string> = {
  idle: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  running: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  stopped: 'bg-slate-600/20 text-slate-300 border-slate-600/30',
  thinking: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  offline: 'bg-slate-700/20 text-slate-500 border-slate-700/30',
};

export function AgentRuntimeCard({ agent }: { agent: AgentRuntime }) {
  const { t } = useTranslation();
  const sessions = useDashboardStore((state) => state.sessions);
  const projects = useDashboardStore((state) => state.projects);

  const session = sessions.find((entry) => entry.id === agent.agentId) ?? null;
  const project = session ? projects.find((entry) => entry.id === session.directory) ?? null : null;

  const lastUpdate = agent.lastUpdate
    ? new Date(agent.lastUpdate).toLocaleTimeString()
    : 'Never';

  return (
    <div className="flex flex-col p-5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-slate-600/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--color-text)] text-lg">
              {session?.title ?? agent.agentId}
            </h3>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${statusColors[agent.status]}`}>
              {t(`status.${agent.status}`)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] font-mono">
            <span>{session?.agentLabel ?? agent.sessionName ?? agent.agentId}</span>
            <span>•</span>
            <span>Updated: {lastUpdate}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end">
        {session ? (
          <div className="mt-2 p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">OpenCode Session</span>
              {project && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {project.name}
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--color-text)] font-medium line-clamp-1">
              {session.model ?? 'unknown model'}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-500/20 text-slate-300">
                {session.sessionType}
              </span>
              <span className="text-[10px] text-[var(--color-text-secondary)]">
                todos: {session.todos.length}
              </span>
              <span className="text-[10px] text-[var(--color-text-secondary)]">
                tokens: {session.totalTokens}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-2 p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] border-dashed flex items-center justify-center">
            <span className="text-sm text-[var(--color-text-secondary)]">
              No correlated session details
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
