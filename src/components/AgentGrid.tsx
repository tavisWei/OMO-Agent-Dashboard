import { AgentCard } from './AgentCard';
import type { AgentWithUsage } from '../types';

interface AgentGridProps {
  agents: AgentWithUsage[];
  onEditAgent: (agent: AgentWithUsage) => void;
}

export function AgentGrid({ agents, onEditAgent }: AgentGridProps) {
  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-lg font-medium">No agents configured</p>
        <p className="text-sm mt-1">Add agents to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} onEdit={onEditAgent} />
      ))}
    </div>
  );
}

export default AgentGrid;
