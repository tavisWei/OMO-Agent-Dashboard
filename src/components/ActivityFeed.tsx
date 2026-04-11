import { useState, useEffect, useCallback } from 'react';
import type { ActivityLog, ActivityType, Agent } from '../types';

const API_BASE = 'http://localhost:3001/api';

const ACTIVITY_ICONS: Record<ActivityType, { icon: string; color: string; bg: string }> = {
  started: { icon: '▶', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  stopped: { icon: '⏹', color: 'text-slate-400', bg: 'bg-slate-500/10' },
  error: { icon: '⚠', color: 'text-red-400', bg: 'bg-red-500/10' },
  config_changed: { icon: '⚙', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  task_assigned: { icon: '📋', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  task_completed: { icon: '✓', color: 'text-purple-400', bg: 'bg-purple-500/10' },
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  started: 'Started',
  stopped: 'Stopped',
  error: 'Error',
  config_changed: 'Config Changed',
  task_assigned: 'Task Assigned',
  task_completed: 'Task Completed',
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatAbsoluteTime(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

interface ActivityItemProps {
  log: ActivityLog;
}

function ActivityItem({ log }: ActivityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = ACTIVITY_ICONS[log.action] || ACTIVITY_ICONS.config_changed;
  const hasDetails = log.details && log.details.trim().length > 0;

  return (
    <div className="group relative border-b border-[var(--color-border)] last:border-b-0">
      <div className="flex items-start gap-3 p-3 hover:bg-[var(--color-bg-tertiary)] transition-colors duration-150">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center text-sm`}>
          <span className={config.color}>{config.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium ${config.color}`}>
                {ACTIVITY_LABELS[log.action] || log.action}
              </span>
              {log.agent_name && (
                <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
                  {log.agent_name}
                </span>
              )}
            </div>
            <span
              className="text-xs text-[var(--color-text-secondary)] cursor-help flex-shrink-0"
              title={formatAbsoluteTime(log.created_at)}
            >
              {formatRelativeTime(log.created_at)}
            </span>
          </div>

          {hasDetails && (
            <div className="mt-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-1"
              >
                <span>{isExpanded ? '▼' : '▶'}</span>
                <span>{isExpanded ? 'Hide details' : 'Show details'}</span>
              </button>
              {isExpanded && (
                <div className="mt-2 p-2 bg-[var(--color-bg-primary)] rounded border border-[var(--color-border)]">
                  <pre className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap break-all font-mono leading-relaxed">
                    {log.details}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ActivityFeedProps {
  initialLogs?: ActivityLog[];
  refreshInterval?: number;
}

export function ActivityFeed({ initialLogs = [], refreshInterval = 30000 }: ActivityFeedProps) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const fetchLogs = useCallback(async (resetOffset = false) => {
    if (loading) return;
    const currentOffset = resetOffset ? 0 : offset;
    
    if (resetOffset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      params.set('offset', currentOffset.toString());
      
      if (selectedTypes.length > 0) {
        params.set('type', selectedTypes.join(','));
      }
      if (selectedAgentId) {
        params.set('agentId', selectedAgentId.toString());
      }

      const response = await fetch(`${API_BASE}/activity-logs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      
      if (resetOffset) {
        setLogs(data.logs);
        setOffset(limit);
      } else {
        setLogs(prev => [...prev, ...data.logs]);
        setOffset(prev => prev + limit);
      }
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset, selectedTypes, selectedAgentId, loading]);

  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/agents`);
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    setOffset(0);
    fetchLogs(true);
  }, [selectedTypes, selectedAgentId, timeRange]);

  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchLogs(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchLogs]);

  const toggleType = (type: ActivityType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleLoadMore = () => {
    fetchLogs(false);
  };

  const allTypes: ActivityType[] = ['started', 'stopped', 'error', 'config_changed', 'task_assigned', 'task_completed'];

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="p-4 border-b border-[var(--color-border)] space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Filters</h3>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {allTypes.map(type => {
              const config = ACTIVITY_ICONS[type];
              const isSelected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isSelected
                      ? `${config.bg} ${config.color} ring-1 ring-current`
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)]'
                  }`}
                >
                  <span>{config.icon}</span>
                  <span>{ACTIVITY_LABELS[type]}</span>
                </button>
              );
            })}
          </div>

          <select
            value={selectedAgentId ?? ''}
            onChange={e => setSelectedAgentId(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-1.5 rounded-lg text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          >
            <option value="">All Agents</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>

          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Loading activity...</span>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--color-text-secondary)]">
            <span className="text-2xl mb-2">📭</span>
            <span className="text-sm">No activity logs found</span>
          </div>
        ) : (
          logs.map(log => <ActivityItem key={log.id} log={log} />)
        )}
      </div>

      {hasMore && (
        <div className="p-3 border-t border-[var(--color-border)]">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </span>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;