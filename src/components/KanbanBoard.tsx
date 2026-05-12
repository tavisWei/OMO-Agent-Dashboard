import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardStore } from '../stores/dashboardStore.js';
import { useAgentRuntime } from '../hooks/useAgentRuntime.js';
import { SessionTreeCard } from './SessionTreeCard.js';
import type { DashboardSessionStatus } from '../stores/dashboardStore.js';

const STATUS_CONFIG: { status: DashboardSessionStatus; dot: string; activeBg: string; activeText: string; activeBorder: string }[] = [
  { status: 'running', dot: 'bg-emerald-500', activeBg: 'bg-emerald-500/15', activeText: 'text-emerald-400', activeBorder: 'border-emerald-500/30' },
  { status: 'thinking', dot: 'bg-yellow-500', activeBg: 'bg-yellow-500/15', activeText: 'text-yellow-400', activeBorder: 'border-yellow-500/30' },
  { status: 'queued', dot: 'bg-slate-400', activeBg: 'bg-slate-500/15', activeText: 'text-slate-300', activeBorder: 'border-slate-500/30' },
  { status: 'completed', dot: 'bg-blue-500', activeBg: 'bg-blue-500/15', activeText: 'text-blue-400', activeBorder: 'border-blue-500/30' },
  { status: 'error', dot: 'bg-red-500', activeBg: 'bg-red-500/15', activeText: 'text-red-400', activeBorder: 'border-red-500/30' },
];

export function KanbanBoard() {
  useAgentRuntime();
  const { t } = useTranslation();

  const sessions = useDashboardStore((s) => s.sessions);
  const tree = useDashboardStore((s) => s.tree);
  const projects = useDashboardStore((s) => s.projects);
  const selectedProjectId = useDashboardStore((s) => s.selectedProjectId);

  useEffect(() => {
    const id = setInterval(() => {
      useDashboardStore.getState().fetchSessions();
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const filteredSessions = useMemo(() => {
    if (!selectedProjectId) return sessions;
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return sessions;
    return sessions.filter((s) => s.directory === project.directory || s.projectId === selectedProjectId);
  }, [sessions, projects, selectedProjectId]);

  const [selectedStatuses, setSelectedStatuses] = useState<Set<DashboardSessionStatus>>(
    () => new Set(['running', 'thinking']),
  );

  // Filter trees by selected project
  const rootSessions = useMemo(() => {
    if (!selectedProjectId) return tree;
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return tree;
    return tree.filter(
      (t) => t.directory === project.directory || t.projectId === selectedProjectId,
    );
  }, [tree, projects, selectedProjectId]);

  // Count trees per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const rs of rootSessions) {
      counts[rs.status] = (counts[rs.status] || 0) + 1;
    }
    return counts;
  }, [rootSessions]);

  // Filter trees by selected statuses (if none selected, show all)
  const visibleRootSessions = useMemo(() => {
    if (selectedStatuses.size === 0) return rootSessions;
    return rootSessions.filter((rs) => selectedStatuses.has(rs.status));
  }, [rootSessions, selectedStatuses]);

  const toggleStatus = (status: DashboardSessionStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Status filter tabs */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {STATUS_CONFIG.map(({ status, dot, activeBg, activeText, activeBorder }) => {
          const count = statusCounts[status] || 0;
          const isActive = selectedStatuses.has(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                'border',
                isActive
                  ? `${activeBg} ${activeText} ${activeBorder}`
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <span>{t(`workboard.status.${status}`)}</span>
              <span className="text-[10px] opacity-60">{count}</span>
            </button>
          );
        })}

        {selectedStatuses.size > 0 && (
          <button
            type="button"
            onClick={() => setSelectedStatuses(new Set())}
            className="text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] px-2 py-1 transition-colors"
          >
            {t('workboard.clear')}
          </button>
        )}
      </div>

      {selectedProjectId && (
        <div className="mb-3">
          <span className="text-xs text-[var(--color-text-secondary)]">
            {t('workboard.project')}: {projects.find((p) => p.id === selectedProjectId)?.name ?? selectedProjectId}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 overflow-y-auto pb-2">
        {visibleRootSessions.map((rootSession) => (
          <SessionTreeCard
            key={rootSession.id}
            rootSession={rootSession}
            allSessions={filteredSessions}
          />
        ))}
        {visibleRootSessions.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
            <svg className="w-10 h-10 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <title>{t('workboard.noTreesMatch')}</title>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-sm">{t('workboard.noTreesMatch')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default KanbanBoard;
