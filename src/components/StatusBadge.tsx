import { useTranslation } from 'react-i18next';
import type { AgentStatus } from '../types';

interface StatusBadgeProps {
  status: AgentStatus;
  showLabel?: boolean;
}

export function StatusBadge({ status, showLabel = true }: StatusBadgeProps) {
  const { t } = useTranslation();
  const translateStatus = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const getStatusConfig = (s: AgentStatus) => {
    switch (s) {
      case 'running':
        return { color: 'bg-emerald-500', label: translateStatus('status.running', 'Running') };
      case 'queued':
        return { color: 'bg-slate-400', label: translateStatus('status.queued', 'Queued') };
      case 'idle':
        return { color: 'bg-slate-400', label: translateStatus('status.idle', 'Idle') };
      case 'completed':
        return { color: 'bg-blue-500', label: translateStatus('status.completed', 'Completed') };
      case 'error':
        return { color: 'bg-red-500', label: translateStatus('status.error', 'Error') };
      case 'stopped':
        return { color: 'bg-slate-600', label: translateStatus('status.stopped', 'Stopped') };
      case 'thinking':
        return { color: 'bg-yellow-500', label: translateStatus('status.thinking', 'Thinking') };
      case 'offline':
        return { color: 'bg-gray-300', label: translateStatus('status.offline', 'Offline') };
      default:
        return { color: 'bg-slate-400', label: translateStatus('status.idle', 'Idle') };
    }
  };

  const config = getStatusConfig(status);

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
