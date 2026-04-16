import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgentRuntimeStore } from '../stores/agentRuntimeStore';
import { useAgentRuntime } from '../hooks/useAgentRuntime';
import { AgentRuntimeCard } from './AgentRuntimeCard';
import { ActivityFeed } from './ActivityFeed';
import { useDashboardStore } from '../stores/dashboardStore';
import { useProjectStore } from '../stores/projectStore';

const FILTERABLE_STATUSES = ['running', 'thinking', 'idle', 'error'] as const;
const PAGE_SIZE = 20;

export function AgentMonitorView() {
  const { t } = useTranslation();
  useAgentRuntime();
  
  const wsConnected = useAgentRuntimeStore((state) => state.wsConnected);
  const { fetchSessions, overview, error, isLoading, sessions, selectedProjectId, statusFilter, toggleStatusFilter, clearStatusFilter } = useDashboardStore();
  const projectStoreSelectedProjectId = useProjectStore((state) => state.selectedProjectId);
  
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const effectiveProjectId = selectedProjectId ?? projectStoreSelectedProjectId;
  const selectedProject = useDashboardStore((state) => state.projects.find((project) => project.id === (selectedProjectId ?? projectStoreSelectedProjectId)) ?? null);
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (effectiveProjectId && session.directory !== effectiveProjectId) {
        return false;
      }
      if (statusFilter.length > 0 && !statusFilter.includes(session.status)) {
        return false;
      }
      return true;
    });
  }, [sessions, effectiveProjectId, statusFilter]);

  const activeAgents = filteredSessions.map((session) => ({
    agentId: session.id,
    status: session.status === 'active' ? 'thinking' : session.status,
    lastUpdate: session.updatedAt,
    sessionName: session.title,
  }));
  const totalSessionsCount = filteredSessions.length;
  const runningCount = filteredSessions.filter((session) => session.status === 'running').length;
  const thinkingCount = filteredSessions.filter((session) => session.status === 'thinking' || session.status === 'active').length;
  const errorCount = filteredSessions.filter((session) => session.status === 'error').length;
  const [monitorPage, setMonitorPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(activeAgents.length / PAGE_SIZE));
  const safePage = Math.min(monitorPage, totalPages);
  const pagedAgents = activeAgents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('nav.monitor')}</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-secondary)]">{t('agents.recentActivity')}:</span>
          <span className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full ${
            wsConnected 
              ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {wsConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-secondary)]">{t('activity.filters')}:</span>
        {FILTERABLE_STATUSES.map((status) => {
          const active = statusFilter.includes(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatusFilter(status)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${active ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)]'}`}
            >
              {t(`status.${status}`)}
            </button>
          );
        })}
        {statusFilter.length > 0 ? (
          <button
            type="button"
            onClick={clearStatusFilter}
            className="px-2.5 py-1 rounded-full text-xs border bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)]"
          >
            Clear
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {selectedProject ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          Filtering sessions for project: <span className="font-medium text-[var(--color-text)]">{selectedProject.name}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex flex-col">
          <span className="text-xs text-[var(--color-text-secondary)] mb-1">Active Sessions</span>
          <span className="text-3xl font-bold text-[var(--color-text)]">{effectiveProjectId || statusFilter.length > 0 ? totalSessionsCount : (overview?.totalSessions ?? totalSessionsCount)}</span>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex flex-col">
          <span className="text-xs text-[var(--color-text-secondary)] mb-1">{t('status.running')}</span>
          <span className="text-3xl font-bold text-green-500">{runningCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex flex-col">
          <span className="text-xs text-[var(--color-text-secondary)] mb-1">{t('status.thinking')}</span>
          <span className="text-3xl font-bold text-yellow-500">{thinkingCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex flex-col">
          <span className="text-xs text-[var(--color-text-secondary)] mb-1">{t('status.error')}</span>
          <span className={`text-3xl font-bold ${errorCount > 0 ? 'text-red-500' : 'text-[var(--color-text)]'}`}>
            {errorCount}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
        <span className="font-medium text-[var(--color-text)]">{t('status.idle')}:</span> {t('status.idleHint')}
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="col-span-2 flex flex-col space-y-4 overflow-hidden">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Live Agents</h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-[var(--color-text-secondary)] border-2 border-dashed border-[var(--color-border)] rounded-xl p-8">
                Loading real OpenCode sessions...
              </div>
            ) : activeAgents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-secondary)] border-2 border-dashed border-[var(--color-border)] rounded-xl p-8">
                <div className="w-16 h-16 mb-4 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                  <span className="text-2xl">💤</span>
                </div>
                <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">No OpenCode sessions</h3>
                <p className="text-center max-w-md">
                  {effectiveProjectId ? 'No sessions match the selected project and status filters.' : 'No active or recent OpenCode sessions were found for the current data source.'}
                </p>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {pagedAgents.map((agent) => (
                  <AgentRuntimeCard key={agent.agentId} agent={agent} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button type="button" disabled={monitorPage <= 1} onClick={() => setMonitorPage((p) => p - 1)}
                    className="px-3 py-1 rounded border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] disabled:opacity-30">←</button>
                  <span className="text-xs text-[var(--color-text-secondary)]">{monitorPage} / {totalPages}</span>
                  <button type="button" disabled={monitorPage >= totalPages} onClick={() => setMonitorPage((p) => p + 1)}
                    className="px-3 py-1 rounded border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] disabled:opacity-30">→</button>
                </div>
              )}
              </>
            )}
          </div>
        </div>

        <div className="col-span-1 flex flex-col space-y-4 overflow-hidden">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">System Activity</h2>
          <div className="flex-1 min-h-0">
            <ActivityFeed refreshInterval={10000} compact={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
