import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { NewTaskDialog } from './NewTaskDialog';
import { EmptyState } from './EmptyState';
import { useTaskStore } from '../stores/taskStore';
import type { Agent, TaskStatus, CreateTaskInput, KanbanColumn, TaskPriority } from '../types';

interface KanbanBoardProps {
  projectId?: number | null;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { t } = useTranslation();
  const { tasks, isLoading, error, fetchTasks, createTask, updateTaskStatus, deleteTask } = useTaskStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

  const [agentFilter, setAgentFilter] = useState<number | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | null>(null);

  const columns: KanbanColumn[] = [
    { id: 'backlog', title: t('tasks.backlog'), color: 'bg-slate-500' },
    { id: 'in_progress', title: t('tasks.inProgress'), color: 'bg-blue-500' },
    { id: 'done', title: t('tasks.done'), color: 'bg-emerald-500' },
    { id: 'failed', title: t('tasks.failed'), color: 'bg-red-500' }
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data = await res.json();
      setAgents(data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchTasks(), fetchAgents()]);
      setIsLoadingAgents(false);
    };
    load();
  }, [fetchTasks, fetchAgents]);

  const handleCreateTask = async (input: CreateTaskInput) => {
    await createTask(input);
    setIsDialogOpen(false);
  };

  const filteredTasks = useMemo(() => {
    let result = projectId ? tasks.filter((t) => t.project_id === projectId) : tasks;
    
    if (agentFilter !== null) {
      result = result.filter(t => t.assigned_agents?.includes(agentFilter) || t.agent_id === agentFilter);
    }
    
    if (priorityFilter !== null) {
      result = result.filter(t => t.priority === priorityFilter);
    }
    
    return result;
  }, [tasks, projectId, agentFilter, priorityFilter]);

  const getTasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  const getAgentById = (agentId: number | null) =>
    agentId ? agents.find((a) => a.id === agentId) ?? null : null;

  const getTaskAgents = (task: any) => {
    const agentIds = task.assigned_agents || (task.agent_id ? [task.agent_id] : []);
    return agentIds.map((id: number) => getAgentById(id)).filter(Boolean) as Agent[];
  };

  const getSubtaskCount = (taskId: number) => {
    return tasks.filter(t => t.parent_task_id === taskId).length;
  };

  const isTaskBlocked = (task: any) => {
    if (!task.depends_on || task.depends_on.length === 0) return false;
    return task.depends_on.some((depId: number) => {
      const dep = tasks.find(t => t.id === depId);
      return dep && dep.status !== 'done';
    });
  };

  const findContainer = (id: number | string): TaskStatus | null => {
    if (typeof id === 'string' && columns.some((c) => c.id === id)) {
      return id as TaskStatus;
    }
    const task = filteredTasks.find((t) => t.id === id);
    return task ? task.status : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
    setDragError(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id as number;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

    const activeTask = filteredTasks.find(t => t.id === activeId);
    
    if (overContainer === 'in_progress' && activeTask && isTaskBlocked(activeTask)) {
      setDragError(`${t('tasks.blocked')}: ${activeTask.title}`);
      setTimeout(() => setDragError(null), 5000);
      return;
    }

    if (activeContainer === overContainer) {
      const containerTasks = filteredTasks
        .filter((t) => t.status === activeContainer)
        .sort((a, b) => a.position - b.position);

      const activeIndex = containerTasks.findIndex((t) => t.id === activeId);
      const overIndex = containerTasks.findIndex((t) => t.id === overId);

      if (activeIndex !== overIndex) {
        await updateTaskStatus(activeId, activeContainer, overIndex);
      }
    } else {
      await updateTaskStatus(activeId, overContainer);
    }
  };

  const activeTask = activeId ? filteredTasks.find((t) => t.id === activeId) : null;

  if (isLoading || isLoadingAgents) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{t('tasks.loading')}</span>
        </div>
      </div>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">{t('tasks.title')}</h2>
            <p className="text-sm text-slate-500">{t('tasks.total', { count: 0 })}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('tasks.new')}
          </button>
        </div>
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
          title="No tasks found"
          description="Create your first task to start tracking progress."
          action={
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('tasks.new')}
            </button>
          }
        />
        <NewTaskDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onCreate={handleCreateTask}
          agents={agents}
          tasks={tasks}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">{t('tasks.title')}</h2>
          <p className="text-sm text-slate-500">{t('tasks.total', { count: filteredTasks.length })}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={agentFilter ?? ''}
            onChange={(e) => setAgentFilter(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-purple-500/50"
          >
            <option value="">{t('tasks.assignAgents')}</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select
            value={priorityFilter ?? ''}
            onChange={(e) => setPriorityFilter(e.target.value ? e.target.value as TaskPriority : null)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-purple-500/50"
          >
            <option value="">{t('tasks.priority')}</option>
            <option value="low">LOW</option>
            <option value="medium">MEDIUM</option>
            <option value="high">HIGH</option>
            <option value="critical">CRITICAL</option>
          </select>

          <button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('tasks.new')}
          </button>
        </div>
      </div>

      {(error || dragError) && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {dragError || error}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-4 gap-4 min-h-0">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column.id);
            return (
              <div
                key={column.id}
                className="flex flex-col bg-slate-900/50 border border-slate-800/50 rounded-xl min-h-0"
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/50">
                  <span className={`w-2 h-2 rounded-full ${column.color}`} />
                  <h3 className="font-medium text-slate-300">{column.title}</h3>
                  <span className="ml-auto text-xs text-slate-600 bg-slate-800/50 px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="flex-1 p-2 overflow-y-auto">
                  <SortableContext
                    items={columnTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 min-h-[100px]">
                      {columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          agents={getTaskAgents(task)}
                          subtaskCount={getSubtaskCount(task.id)}
                          isBlocked={isTaskBlocked(task)}
                          onDelete={deleteTask}
                        />
                      ))}
                      {columnTasks.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-xs text-slate-600">
                          {t('tasks.dropHere')}
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </div>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rotate-3 scale-105">
              <TaskCard
                task={activeTask}
                agents={getTaskAgents(activeTask)}
                subtaskCount={getSubtaskCount(activeTask.id)}
                isBlocked={isTaskBlocked(activeTask)}
                onDelete={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <NewTaskDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreate={handleCreateTask}
        agents={agents}
        tasks={tasks}
      />
    </div>
  );
}

export default KanbanBoard;
