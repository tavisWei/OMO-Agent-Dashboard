import { useTranslation } from 'react-i18next';
import type { AgentStatus } from '../types';

interface StatusBadgeProps {
  status: AgentStatus;
  showLabel?: boolean;
}

export function StatusBadge({ status, showLabel = true }: StatusBadgeProps) {
  const { t } = useTranslation();

  const getStatusConfig = (s: AgentStatus) => {
    switch (s) {
      case 'running':
        return { color: 'bg-emerald-500', label: t('status.running') };
      case 'idle':
        return { color: 'bg-slate-400', label: t('status.idle') };
      case 'completed':
        return { color: 'bg-blue-500', label: t('status.completed') };
      case 'error':
        return { color: 'bg-red-500', label: t('status.error') };
      case 'stopped':
        return { color: 'bg-slate-600', label: t('status.stopped') };
      case 'thinking':
        return { color: 'bg-yellow-500', label: t('status.thinking') };
      case 'offline':
        return { color: 'bg-gray-300', label: t('status.offline') };
      default:
        return { color: 'bg-slate-400', label: t('status.idle') };
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
