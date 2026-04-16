import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AgentConfigPanel from './AgentConfigPanel';
import { useActivityStore } from '../stores/activityStore';
import { useAgentStore } from '../stores/agentStore';
import { useCostStore } from '../stores/costStore';
import { useTaskStore } from '../stores/taskStore';
import type { AgentWithUsage } from '../types';

const statusColors: Record<string, string> = {
  idle: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  running: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  stopped: 'bg-slate-600/20 text-slate-300 border-slate-600/30',
  thinking: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  offline: 'bg-slate-700/20 text-slate-500 border-slate-700/30',
};

export function AgentDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const agentId = id ? parseInt(id, 10) : null;

  const { agents, fetchAgents, isLoading: isLoadingAgents } = useAgentStore();
  const { tasks, fetchTasks, isLoading: isLoadingTasks } = useTaskStore();
  const { logs, fetchLogs, setFilters, isLoading: isLoadingLogs } = useActivityStore();
  const { records, fetchCosts, isLoading: isLoadingCosts } = useCostStore();

  const [configPanelOpen, setConfigPanelOpen] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchTasks();
    fetchCosts();
    setFilters({ agentId: agentId === null ? null : String(agentId), types: [], project: null, timeRange: 'all' });
    fetchLogs(true);
  }, [agentId, fetchAgents, fetchTasks, fetchCosts, setFilters, fetchLogs]);

  const agent = useMemo(() => {
    if (agentId === null) return null;
    return agents.find((item) => item.id === agentId) ?? null;
  }, [agents, agentId]);

  const agentTasks = useMemo(() => {
    if (agentId === null) return [];
    return tasks.filter((task) => task.agent_id === agentId || task.assigned_agents.includes(agentId));
  }, [tasks, agentId]);

  const agentLogs = useMemo(() => {
    if (agentId === null) return [];
    return logs.filter((log) => log.agent_id === String(agentId)).slice(0, 8);
  }, [logs, agentId]);

  const agentCost = useMemo(() => {
    if (agentId === null) return { totalCost: 0, totalTokens: 0 };
    const relevant = records.filter((record) => record.agent_id === agentId);
    return {
      totalCost: relevant.reduce((sum, record) => sum + record.cost, 0),
      totalTokens: relevant.reduce((sum, record) => sum + record.input_tokens + record.output_tokens, 0),
    };
  }, [records, agentId]);

  const detailAgent: AgentWithUsage | null = useMemo(() => {
    if (!agent) return null;
    return {
      ...agent,
      totalTokens: agentCost.totalTokens,
      totalCost: agentCost.totalCost,
    };
  }, [agent, agentCost]);

  if (isLoadingAgents && !agent) {
    return <div className="text-[var(--color-text-secondary)]">{t('common.loading')}</div>;
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h2 className="text-xl font-bold text-[var(--color-text)]">{t('agents.notFound')}</h2>
        <button
          type="button"
          onClick={() => navigate('/agents')}
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
            <h1 className="text-2xl font-bold text-[var(--color-text)]">{agent.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[agent.status] ?? statusColors.idle}`}>
              {agent.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-700/30 text-slate-300 border-slate-700/50">
              {agent.model}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${agent.source === 'omo_config' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-purple-500/20 text-purple-400 border border-purple-500/20'}`}>
              {agent.source === 'omo_config' ? 'OMO' : 'Custom'}
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">{t('agents.detailSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setConfigPanelOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
        >
          {t('agents.editConfig')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">{t('agents.assignedTasks')}</p>
          <p className="text-2xl font-bold text-[var(--color-text)] mt-1">{agentTasks.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">{t('agents.tokenUsage')}</p>
          <p className="text-2xl font-bold text-[var(--color-text)] mt-1">{agentCost.totalTokens.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">{t('cost.title')}</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">${agentCost.totalCost.toFixed(4)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t('agents.assignedTasks')}</h2>
            {isLoadingTasks ? (
              <p className="text-[var(--color-text-secondary)]">{t('tasks.loading')}</p>
            ) : agentTasks.length === 0 ? (
              <p className="text-[var(--color-text-secondary)]">{t('agents.noAssignedTasks')}</p>
            ) : (
              <div className="space-y-3">
                {agentTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="w-full text-left p-4 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-primary)] border border-[var(--color-border)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-[var(--color-text)]">{task.title}</h3>
                        {task.description && <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">{task.description}</p>}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusColors[task.status] ?? statusColors.idle}`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t('settings.title')}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">Model</span>
                <span className="text-[var(--color-text)] font-medium">{agent.model}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">{t('agents.temperature')}</span>
                <span className="text-[var(--color-text)] font-medium">{agent.temperature}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">{t('agents.topP')}</span>
                <span className="text-[var(--color-text)] font-medium">{agent.top_p}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">{t('agents.maxTokens')}</span>
                <span className="text-[var(--color-text)] font-medium">{agent.max_tokens}</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t('agents.recentActivity')}</h2>
            {isLoadingLogs || isLoadingCosts ? (
              <p className="text-[var(--color-text-secondary)]">{t('activity.title')}...</p>
            ) : agentLogs.length === 0 ? (
              <p className="text-[var(--color-text-secondary)]">{t('agents.noRecentActivity')}</p>
            ) : (
              <div className="space-y-3">
                {agentLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[var(--color-text)]">{log.action}</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    {log.details && <p className="text-sm text-[var(--color-text-secondary)] mt-1 break-words">{log.details}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AgentConfigPanel
        agent={detailAgent}
        isOpen={configPanelOpen}
        onClose={() => setConfigPanelOpen(false)}
        onSave={fetchAgents}
      />
    </div>
  );
}
