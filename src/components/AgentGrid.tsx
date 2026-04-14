import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AgentCard } from './AgentCard';
import { NewAgentDialog } from './NewAgentDialog';
import { EmptyState } from './EmptyState';
import type { AgentWithUsage } from '../types';

interface AgentGridProps {
  agents: AgentWithUsage[];
  onEditAgent: (agent: AgentWithUsage) => void;
  onRefresh: () => void;
}

export function AgentGrid({ agents, onEditAgent, onRefresh }: AgentGridProps) {
  const { t } = useTranslation();
  const [isNewAgentDialogOpen, setIsNewAgentDialogOpen] = useState(false);

  const gridContent = agents.length === 0 ? (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      }
      title="No agents configured"
      description="Create your first agent to start automating tasks."
      action={
        <button
          type="button"
          onClick={() => setIsNewAgentDialogOpen(true)}
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('agents.newAgent')}
        </button>
      }
    />
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} onEdit={onEditAgent} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsNewAgentDialogOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('agents.newAgent')}
        </button>
      </div>

      {gridContent}

      <NewAgentDialog
        isOpen={isNewAgentDialogOpen}
        onClose={() => setIsNewAgentDialogOpen(false)}
        onCreated={onRefresh}
      />
    </div>
  );
}

export default AgentGrid;
