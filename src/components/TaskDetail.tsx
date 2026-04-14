import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTaskStore } from '../stores/taskStore';
import { DependencyGraph } from './DependencyGraph';
import type { TaskStatus, TaskPriority, TaskOrchestrationPattern, TaskOrchestrationSnapshot } from '../types';

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusColors: Record<TaskStatus, string> = {
  backlog: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  done: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function TaskDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    selectedTask, 
    isLoading, 
    error, 
    fetchTaskDetail, 
    createTask, 
    updateTaskStatus,
    clearSelectedTask 
  } = useTaskStore();

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [orchestration, setOrchestration] = useState<TaskOrchestrationSnapshot | null>(null);
  const [orchestrationPattern, setOrchestrationPattern] = useState<TaskOrchestrationPattern>('sequential');
  const [isOrchestrationLoading, setIsOrchestrationLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTaskDetail(Number(id));
    }
    return () => clearSelectedTask();
  }, [id, fetchTaskDetail, clearSelectedTask]);

  const fetchOrchestration = useCallback(async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/orchestration`);
      if (!response.ok) {
        setOrchestration(null);
        return;
      }
      const data = await response.json();
      setOrchestration(data);
    } catch {
      setOrchestration(null);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    void fetchOrchestration(Number(id));
  }, [id, fetchOrchestration]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{t('tasks.loadingDetail')}</span>
        </div>
      </div>
    );
  }

  if (error || !selectedTask) {
    return (
        <div className="p-4 bg-red-900/20 border border-red-800/30 rounded-lg text-red-400">
          {error || t('tasks.loadingDetail')}
        </div>
    );
  }

  const { task, assigned_agent_details, assignments, dependencies, subtasks } = selectedTask;

  const completedSubtasks = subtasks.filter(st => st.status === 'done').length;
  const totalSubtasks = subtasks.length;
  const progressPercentage = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    setIsCreatingSubtask(true);
    await createTask({
      title: newSubtaskTitle.trim(),
      parent_task_id: task.id,
      project_id: task.project_id,
      status: 'backlog',
    });
    setNewSubtaskTitle('');
    setIsCreatingSubtask(false);
    // Refresh task detail to get updated subtasks
    fetchTaskDetail(task.id);
  };

  const handleToggleSubtask = async (subtaskId: number, currentStatus: TaskStatus) => {
    const newStatus = currentStatus === 'done' ? 'backlog' : 'done';
    await updateTaskStatus(subtaskId, newStatus);
    // Refresh task detail to get updated subtasks
    fetchTaskDetail(task.id);
  };

  const handleOrchestrationAction = async (action: 'start' | 'advance' | 'fail') => {
    setIsOrchestrationLoading(true);
    try {
      const body = action === 'start'
        ? { action, pattern: orchestrationPattern }
        : { action };
      const response = await fetch(`/api/tasks/${task.id}/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const data = await response.json();
        setOrchestration(data);
        await fetchTaskDetail(task.id);
      }
    } finally {
      setIsOrchestrationLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-100">{task.title}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[task.status]}`}>
              {task.status.replace('_', ' ').toUpperCase()}
            </span>
            {task.priority && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityColors[task.priority]}`}>
                {task.priority.toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Created {new Date(task.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-5">
            <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">{t('tasks.description')}</h3>
            <div className="text-slate-300 whitespace-pre-wrap">
              {task.description || <span className="text-slate-600 italic">-</span>}
            </div>
          </div>

          {/* Subtasks */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">{t('tasks.subtasks')}</h3>
              {totalSubtasks > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">{progressPercentage}%</span>
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 mb-4">
              {subtasks.map(subtask => (
                <div 
                  key={subtask.id}
                  className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(subtask.id, subtask.status)}
                    className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      subtask.status === 'done' 
                        ? 'bg-purple-500 border-purple-500 text-white' 
                        : 'border-slate-600 hover:border-purple-400'
                    }`}
                  >
                    {subtask.status === 'done' && (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${subtask.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                    {subtask.title}
                  </span>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium border ${statusColors[subtask.status]}`}>
                    {subtask.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              ))}
              {subtasks.length === 0 && (
                <p className="text-sm text-slate-500 italic text-center py-4">{t('tasks.noSubtasks')}</p>
              )}
            </div>

            <form onSubmit={handleCreateSubtask} className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder={t('tasks.addSubtaskPlaceholder')}
                className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                disabled={isCreatingSubtask}
              />
              <button
                type="submit"
                disabled={!newSubtaskTitle.trim() || isCreatingSubtask}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t('tasks.addSubtask')}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assigned Agents */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-5">
            <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Orchestration</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={orchestrationPattern}
                  onChange={(e) => setOrchestrationPattern(e.target.value as TaskOrchestrationPattern)}
                  className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-200 text-sm"
                  disabled={!!orchestration || isOrchestrationLoading}
                >
                  <option value="sequential">Sequential</option>
                  <option value="parallel">Parallel</option>
                  <option value="pipeline">Pipeline</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleOrchestrationAction('start')}
                  disabled={!!orchestration || isOrchestrationLoading}
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  Start
                </button>
                <button
                  type="button"
                  onClick={() => handleOrchestrationAction('advance')}
                  disabled={!orchestration || isOrchestrationLoading}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  Advance
                </button>
                <button
                  type="button"
                  onClick={() => handleOrchestrationAction('fail')}
                  disabled={!orchestration || isOrchestrationLoading}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  Fail
                </button>
              </div>

              {orchestration ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap text-sm">
                    <span className="px-2 py-0.5 rounded border border-slate-700/50 text-slate-300 bg-slate-800/40">
                      {orchestration.orchestration.pattern}
                    </span>
                    <span className="px-2 py-0.5 rounded border border-slate-700/50 text-slate-300 bg-slate-800/40">
                      {orchestration.orchestration.status}
                    </span>
                    <span className="text-slate-400">
                      {orchestration.progress.completed_steps}/{orchestration.progress.total_steps} steps
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all"
                      style={{ width: `${orchestration.progress.completion_percentage}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {orchestration.steps.map((step) => (
                      <div key={`${step.agent_id}-${step.index}`} className="flex items-center justify-between text-sm p-2 rounded-lg bg-slate-800/30 border border-slate-700/30">
                        <span className="text-slate-200">{step.label}</span>
                        <span className="text-slate-400 uppercase text-[10px]">{step.state}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No orchestration started.</p>
              )}
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-5">
            <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">{t('tasks.assignedAgents')}</h3>
            <div className="space-y-2">
              {assigned_agent_details.length > 0 ? (
                assigned_agent_details.map(agent => {
                  const assignment = assignments.find(a => a.agent_id === agent.id);
                  return (
                    <div key={agent.id} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg border border-slate-700/30">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-400">🤖</span>
                        <span className="text-sm text-slate-300 font-medium">{agent.name}</span>
                      </div>
                      {assignment?.role && (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">
                          {assignment.role}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500 italic">{t('tasks.noAssignedAgents')}</p>
              )}
            </div>
          </div>

          {/* Dependencies */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-5">
            <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">{t('tasks.dependencies')}</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-medium text-slate-500 mb-2">{t('tasks.blockedBy')}</h4>
                {dependencies.blocking.length > 0 ? (
                  <div className="space-y-2">
                    {dependencies.blocking.map(dep => (
                      <div key={dep.depends_on_task_id} className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-slate-300 truncate">{dep.task?.title || `Task #${dep.depends_on_task_id}`}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">{t('tasks.noBlockingTasks')}</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-medium text-slate-500 mb-2">{t('tasks.blocks')}</h4>
                {dependencies.dependents.length > 0 ? (
                  <div className="space-y-2">
                    {dependencies.dependents.map(dep => (
                      <div key={dep.task_id} className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="text-slate-300 truncate">{dep.task?.title || `Task #${dep.task_id}`}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">{t('tasks.noDependentTasks')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dependency Graph */}
      {(dependencies.blocking.length > 0 || dependencies.dependents.length > 0) && (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Dependency Graph</h3>
          <DependencyGraph 
            tasks={[
              {
                id: task.id,
                title: task.title,
                status: task.status,
                depends_on: dependencies.blocking.map(d => d.depends_on_task_id)
              },
              ...dependencies.blocking.map(d => ({
                id: d.depends_on_task_id,
                title: d.task?.title || `Task #${d.depends_on_task_id}`,
                status: d.task?.status || 'backlog',
                depends_on: []
              })),
              ...dependencies.dependents.map(d => ({
                id: d.task_id,
                title: d.task?.title || `Task #${d.task_id}`,
                status: d.task?.status || 'backlog',
                depends_on: [task.id]
              }))
            ]} 
            className="h-64"
          />
        </div>
      )}
    </div>
  );
}
