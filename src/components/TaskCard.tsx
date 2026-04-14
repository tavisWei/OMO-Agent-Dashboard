import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Task, Agent, TaskPriority } from '../types';

interface TaskCardProps {
  task: Task;
  agents: Agent[];
  subtaskCount: number;
  isBlocked: boolean;
  onDelete: (taskId: number) => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function TaskCard({ task, agents, subtaskCount, isBlocked, onDelete }: TaskCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => navigate(`/tasks/${task.id}`)}
      className={`
        group relative bg-slate-800/60 border rounded-lg p-3
        hover:bg-slate-800/80 transition-all duration-150 cursor-pointer
        ${isBlocked ? 'border-red-900/50' : 'border-slate-700/40 hover:border-slate-600/50'}
        ${isDragging ? 'opacity-50 shadow-xl scale-105 z-50' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 p-1 rounded text-slate-600 hover:text-slate-400 hover:bg-slate-700/50 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-slate-200 leading-snug">{task.title}</h4>
            {task.priority && (
              <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${priorityColors[task.priority]}`}>
                {task.priority.toUpperCase()}
              </span>
            )}
          </div>
          
          {task.description && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isBlocked && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded border border-red-900/30">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {t('tasks.blocked')}
              </span>
            )}
            {subtaskCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-700/30 px-1.5 py-0.5 rounded border border-slate-700/50">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                {subtaskCount} {t('tasks.subtasks')}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 flex-wrap">
              {agents.length > 0 ? (
                agents.map(agent => (
                  <span key={agent.id} className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700/50">
                    <span className="text-purple-400">🤖</span>
                    <span className="max-w-[80px] truncate">{agent.name}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-600">Unassigned</span>
              )}
            </div>
            <span className="text-xs text-slate-600 shrink-0 ml-2">
              {formatTimeAgo(task.created_at)}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-all duration-150"
          aria-label="Delete task"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default TaskCard;
