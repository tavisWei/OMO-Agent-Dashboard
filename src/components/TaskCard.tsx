import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, Agent } from '../types';

interface TaskCardProps {
  task: Task;
  agent: Agent | null;
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

export function TaskCard({ task, agent, onDelete }: TaskCardProps) {
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
      className={`
        group relative bg-slate-800/60 border border-slate-700/40 rounded-lg p-3
        hover:bg-slate-800/80 hover:border-slate-600/50 
        transition-all duration-150
        ${isDragging ? 'opacity-50 shadow-xl scale-105 z-50' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 p-1 rounded text-slate-600 hover:text-slate-400 hover:bg-slate-700/50 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-slate-200 leading-snug">{task.title}</h4>
          
          {task.description && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {agent ? (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded">
                  <span className="text-purple-400">🤖</span>
                  <span className="max-w-[80px] truncate">{agent.name}</span>
                </span>
              ) : (
                <span className="text-xs text-slate-600">Unassigned</span>
              )}
            </div>
            <span className="text-xs text-slate-600">
              {formatTimeAgo(task.created_at)}
            </span>
          </div>
        </div>

        <button
          onClick={() => onDelete(task.id)}
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