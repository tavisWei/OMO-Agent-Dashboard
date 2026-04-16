import { AgentCard } from './AgentCard';
import { EmptyState } from './EmptyState';
import type { AgentWithUsage } from '../types';

interface AgentGridProps {
  agents: AgentWithUsage[];
  onEditAgent?: (agent: AgentWithUsage) => void;
  onRefresh?: () => void;
}

export function AgentGrid({ agents }: AgentGridProps) {

  const gridContent = agents.length === 0 ? (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      }
      title="No agents configured"
      description="There are no agents to display."
    />
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {gridContent}
    </div>
  );
}

export default AgentGrid;
