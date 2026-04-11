import type { AgentStatus } from '../types';

interface StatusBadgeProps {
  status: AgentStatus;
  showLabel?: boolean;
}

const statusConfig: Record<AgentStatus, { color: string; label: string }> = {
  running: { color: 'bg-emerald-500', label: 'Running' },
  idle: { color: 'bg-slate-400', label: 'Idle' },
  error: { color: 'bg-red-500', label: 'Error' },
  stopped: { color: 'bg-slate-600', label: 'Stopped' },
};

export function StatusBadge({ status, showLabel = true }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.idle;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full ${config.color} ${
          status === 'running' ? 'animate-pulse' : ''
        }`}
      />
      {showLabel && (
        <span className="text-xs font-medium text-slate-300">{config.label}</span>
      )}
    </div>
  );
}

export default StatusBadge;
