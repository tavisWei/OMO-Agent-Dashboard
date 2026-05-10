import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useNavigate } from 'react-router-dom';
import type { KanbanColumnId, Task } from '../types/index.js';
import { useDashboardStore } from '../stores/dashboardStore.js';
import { useTaskStore } from '../stores/taskStore.js';
import { COLUMN_TO_STATUS } from '../utils/columnMapping.js';
import { checkColumnRule } from '../utils/columnRules.js';
import { AgentKanbanCard } from './AgentKanbanCard.js';
import { ROUTES } from '../routes.js';

type ViewMode = 'runtime' | 'plan';

interface KanbanColumnDef {
  id: KanbanColumnId;
  title: string;
  color: string;
  headerBg: string;
}

const COLUMNS: KanbanColumnDef[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    color: 'border-slate-500/30',
    headerBg: 'bg-slate-500/10',
  },
  {
    id: 'todo',
    title: 'To Do',
    color: 'border-blue-500/30',
    headerBg: 'bg-blue-500/10',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    color: 'border-amber-500/30',
    headerBg: 'bg-amber-500/10',
  },
  {
    id: 'in_review',
    title: 'In Review',
    color: 'border-purple-500/30',
    headerBg: 'bg-purple-500/10',
  },
  {
    id: 'blocked',
    title: 'Blocked',
    color: 'border-red-500/30',
    headerBg: 'bg-red-500/10',
  },
  {
    id: 'done',
    title: 'Done',
    color: 'border-emerald-500/30',
    headerBg: 'bg-emerald-500/10',
  },
];

function sessionToColumn(status: string): KanbanColumnId {
  switch (status) {
    case 'queued':
    case 'offline':
      return 'backlog';
    case 'idle':
      return 'todo';
    case 'running':
    case 'thinking':
      return 'in_progress';
    case 'stopped':
      return 'in_review';
    case 'error':
      return 'blocked';
    case 'completed':
      return 'done';
    default:
      return 'backlog';
  }
}

function taskToColumn(task: Task): KanbanColumnId {
  switch (task.status) {
    case 'backlog':
      return 'backlog';
    case 'in_progress':
      return 'in_progress';
    case 'review_required':
      return 'in_review';
    case 'needs_fix':
      return 'blocked';
    case 'blocked':
      return 'blocked';
    case 'done':
      return 'done';
    case 'failed':
      return 'blocked';
    default:
      return 'backlog';
  }
}

function DroppableColumn({
  column,
  children,
  count,
}: {
  column: KanbanColumnDef;
  children: React.ReactNode;
  count: number;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });
  const { t } = useTranslation();
  const columnTitleMap: Record<KanbanColumnId, string> = {
    backlog: t('kanban.columns.backlog'),
    todo: t('kanban.columns.todo'),
    in_progress: t('kanban.columns.inProgress'),
    in_review: t('kanban.columns.inReview'),
    blocked: t('kanban.columns.blocked'),
    done: t('kanban.columns.done'),
  };
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[260px] w-[260px] rounded-xl border ${column.color} ${
        isOver ? 'ring-2 ring-[var(--color-accent)]/50' : ''
      } bg-[var(--color-bg-secondary)]/50`}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${column.headerBg} border-b ${column.color}`}
      >
        <span className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider">
          {columnTitleMap[column.id]}
        </span>
        <span className="text-[10px] font-mono text-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] px-1.5 py-0.5 rounded">
          {count}
        </span>
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-[120px]">{children}</div>
    </div>
  );
}

function SortableTaskCard({
  task,
  columnId,
}: {
  task: Task;
  columnId: KanbanColumnId;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.id}`,
    data: { type: 'task', taskId: task.id, columnId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3
        hover:border-[var(--color-accent)]/50 transition-all duration-150 ${
          isDragging ? 'opacity-50 shadow-xl scale-105 z-50' : ''
        }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 p-1 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <title>{t('kanban.dragHandle')}</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => navigate(ROUTES.TASK(String(task.id)))}
            className="text-left w-full"
          >
            <h4 className="text-sm font-medium text-[var(--color-text)] leading-snug line-clamp-2">
              {task.title}
            </h4>
            {task.description && (
              <p className="mt-1 text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}
          </button>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {task.priority && (
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                  task.priority === 'critical'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : task.priority === 'high'
                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                      : task.priority === 'medium'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                }`}
              >
                {task.priority}
              </span>
            )}
            <span className="text-[10px] text-[var(--color-text-secondary)]">
              #{task.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<ViewMode>('runtime');
  const [, setActiveDragId] = useState<string | null>(null);

  const sessions = useDashboardStore((s) => s.sessions);
  const projects = useDashboardStore((s) => s.projects);
  const selectedProjectId = useDashboardStore((s) => s.selectedProjectId);

  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const updateTaskStatus = useTaskStore((s) => s.updateTaskStatus);

  const [taskGateStatus, setTaskGateStatus] = useState<Record<number, {
    hasSession: boolean;
    summary: { additions: number; deletions: number } | null;
  }>>({});

  useEffect(() => {
    if (activeView === 'plan') {
      fetchTasks();
    }
  }, [activeView, fetchTasks]);

  useEffect(() => {
    if (activeView !== 'plan' || tasks.length === 0) return;
    const abort = new AbortController();
    Promise.all(
      tasks.map(async (t) => {
        try {
          const r = await fetch(`/api/tasks/${t.id}/opencode-status`, { signal: abort.signal });
          if (!r.ok) return null;
          const d = await r.json();
          return { id: t.id, hasSession: d.hasSession, summary: d.summary };
        } catch {
          return null;
        }
      })
    ).then((results) => {
      const map: Record<number, { hasSession: boolean; summary: { additions: number; deletions: number } | null }> = {};
      for (const r of results) {
        if (r) map[r.id] = { hasSession: r.hasSession, summary: r.summary };
      }
      setTaskGateStatus(map);
    });
    return () => abort.abort();
  }, [activeView, tasks]);

  const filteredSessions = useMemo(() => {
    if (!selectedProjectId) return sessions;
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return sessions;
    return sessions.filter((s) => s.directory === project.directory || s.projectId === selectedProjectId);
  }, [sessions, projects, selectedProjectId]);

  const filteredTasks = useMemo(() => {
    if (!selectedProjectId) return tasks;
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return tasks;
    return tasks.filter((t) => {
      if (t.project_id !== null) {
        return String(t.project_id) === selectedProjectId;
      }
      return true;
    });
  }, [tasks, projects, selectedProjectId]);

  const columnSessions = useMemo(() => {
    const map: Record<KanbanColumnId, typeof filteredSessions> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      blocked: [],
      done: [],
    };
    for (const session of filteredSessions) {
      const col = sessionToColumn(session.status);
      map[col].push(session);
    }
    return map;
  }, [filteredSessions]);

  const columnTasks = useMemo(() => {
    const map: Record<KanbanColumnId, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      blocked: [],
      done: [],
    };
    for (const task of filteredTasks) {
      const col = taskToColumn(task);
      map[col].push(task);
    }
    return map;
  }, [filteredTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (!activeId.startsWith('task-')) return;

    const taskId = parseInt(activeId.replace('task-', ''), 10);
    if (Number.isNaN(taskId)) return;

    let targetColumn: KanbanColumnId | undefined;

    if (overId.startsWith('task-')) {
      const overTaskId = parseInt(overId.replace('task-', ''), 10);
      const overTask = tasks.find((t) => t.id === overTaskId);
      if (overTask) {
        targetColumn = taskToColumn(overTask);
      }
    } else {
      targetColumn = overId as KanbanColumnId;
    }

    if (!targetColumn) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const currentColumn = taskToColumn(task);
    if (currentColumn === targetColumn) return;

    const newStatus = COLUMN_TO_STATUS[targetColumn];

    const gate = taskGateStatus[taskId];
    const mockSession = gate?.hasSession
      ? {
          summary_additions: gate.summary?.additions ?? 0,
          summary_deletions: gate.summary?.deletions ?? 0,
        }
      : null;

    const ruleResult = checkColumnRule(
      { targetColumn, requireGitChanges: targetColumn === 'done' },
      mockSession,
      false,
    );
    if (!ruleResult.pass) {
      const confirmed = window.confirm(`${ruleResult.reason || 'Rule check failed'}. Proceed anyway?`);
      if (!confirmed) return;
    }

    updateTaskStatus(taskId, newStatus);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('runtime')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeView === 'runtime'
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {t('kanban.views.runtime')}
          </button>
          <button
            type="button"
            onClick={() => setActiveView('plan')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeView === 'plan'
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {t('kanban.views.plan')}
          </button>
        </div>

        {selectedProjectId && (
          <span className="text-xs text-[var(--color-text-secondary)]">
            Project: {projects.find((p) => p.id === selectedProjectId)?.name ?? selectedProjectId}
          </span>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUMNS.map((column) => {
            const items =
              activeView === 'runtime'
                ? columnSessions[column.id]
                : columnTasks[column.id];
            const sortableIds =
              activeView === 'plan'
                ? items.map((t) => `task-${(t as Task).id}`)
                : [];

            return (
              <DroppableColumn
                key={column.id}
                column={column}
                count={items.length}
              >
                {activeView === 'plan' ? (
                  <SortableContext
                    items={sortableIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((item) => (
                      <SortableTaskCard
                        key={(item as Task).id}
                        task={item as Task}
                        columnId={column.id}
                      />
                    ))}
                  </SortableContext>
                ) : (
                  (items as typeof filteredSessions).map((session) => (
                    <AgentKanbanCard
                      key={session.id}
                      session={session}
                    />
                  ))
                )}
              </DroppableColumn>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
