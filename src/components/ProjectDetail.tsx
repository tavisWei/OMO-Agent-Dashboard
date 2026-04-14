import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import { useAgentStore } from '../stores/agentStore';
import { useTaskStore } from '../stores/taskStore';
import { KanbanBoard } from './KanbanBoard';
import { AgentGrid } from './AgentGrid';
import { DependencyGraph } from './DependencyGraph';
import AgentConfigPanel from './AgentConfigPanel';
import type { AgentWithUsage } from '../types';

export function ProjectDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = id ? parseInt(id, 10) : null;

  const { projects, fetchProjects, isLoading: isLoadingProjects } = useProjectStore();
  const { agents, fetchAgents, isLoading: isLoadingAgents } = useAgentStore();
  const { tasks, fetchTasks } = useTaskStore();

  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentWithUsage | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchAgents();
    fetchTasks();
  }, [fetchProjects, fetchAgents, fetchTasks]);

  const project = useMemo(() => {
    return projects.find((p) => p.id === projectId) || null;
  }, [projects, projectId]);

  const projectAgents = useMemo(() => {
    return agents
      .filter((a) => a.project_id === projectId)
      .map((a) => ({
        ...a,
        totalTokens: 0,
        totalCost: 0,
      })) as AgentWithUsage[];
  }, [agents, projectId]);

  const projectTasks = useMemo(() => {
    return tasks.filter((t) => t.project_id === projectId);
  }, [tasks, projectId]);

  const doneTasks = projectTasks.filter((t) => t.status === 'done').length;

  const handleEditAgent = (agent: AgentWithUsage) => {
    setSelectedAgent(agent);
    setConfigPanelOpen(true);
  };

  const handleCloseConfigPanel = () => {
    setConfigPanelOpen(false);
    setSelectedAgent(null);
  };

  if (isLoadingProjects && !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{t('projects.loadingProject')}</span>
        </div>
      </div>
    );
  }

  if (!project && !isLoadingProjects) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h2 className="text-xl font-bold text-[var(--color-text)]">{t('projects.notFound')}</h2>
        <button
          onClick={() => navigate('/')}
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
            {project?.description && (
              <p className="text-[var(--color-text-secondary)]">{project.description}</p>
            )}
          </div>
          <div className="flex gap-4 shrink-0">
            <div className="text-center px-4 py-3 bg-[var(--color-bg-tertiary)] rounded-lg min-w-[100px]">
              <div className="text-2xl font-bold text-[var(--color-text)]">{projectAgents.length}</div>
              <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mt-1">{t('projects.statsAgents')}</div>
            </div>
            <div className="text-center px-4 py-3 bg-[var(--color-bg-tertiary)] rounded-lg min-w-[100px]">
              <div className="text-2xl font-bold text-[var(--color-text)]">{projectTasks.length}</div>
              <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mt-1">{t('projects.statsTasks')}</div>
            </div>
            <div className="text-center px-4 py-3 bg-[var(--color-bg-tertiary)] rounded-lg min-w-[100px]">
              <div className="text-2xl font-bold text-emerald-500">{doneTasks}</div>
              <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mt-1">{t('projects.statsDone')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{t('projects.projectAgents')}</h2>
        {isLoadingAgents ? (
          <div className="text-[var(--color-text-secondary)]">{t('projects.loadingAgents')}</div>
        ) : (
          <AgentGrid
            agents={projectAgents}
            onEditAgent={handleEditAgent}
            onRefresh={fetchAgents}
          />
        )}
      </div>

      <div className="flex-1 min-h-[600px] flex flex-col space-y-4">
        <div className="flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-4">
          <KanbanBoard projectId={projectId} />
        </div>
      </div>

      <div className="space-y-4">
         <h2 className="text-xl font-semibold text-[var(--color-text)]">{t('projects.taskDependencies')}</h2>
        <DependencyGraph 
          tasks={projectTasks} 
          className="h-[400px]"
        />
      </div>

      <AgentConfigPanel
        agent={selectedAgent}
        isOpen={configPanelOpen}
        onClose={handleCloseConfigPanel}
        onSave={fetchAgents}
      />
    </div>
  );
}
