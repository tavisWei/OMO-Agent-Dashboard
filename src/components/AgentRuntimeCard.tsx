import { useAgentRuntimeStore, AgentRuntime } from '../stores/agentRuntimeStore';

const statusColors: Record<AgentRuntime['status'], string> = {
  idle: 'bg-gray-400',
  running: 'bg-green-500',
  thinking: 'bg-yellow-500',
  error: 'bg-red-500',
  offline: 'bg-gray-300',
};

const statusLabels: Record<AgentRuntime['status'], string> = {
  idle: 'Idle',
  running: 'Running',
  thinking: 'Thinking',
  error: 'Error',
  offline: 'Offline',
};

export function AgentRuntimeCard({ agent }: { agent: AgentRuntime }) {
  const lastActivity = agent.lastActivity
    ? new Date(agent.lastActivity).toLocaleTimeString()
    : 'Never';
  
  return (
    <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">{agent.name}</h3>
        <span
          className={`w-3 h-3 rounded-full ${statusColors[agent.status]}`}
          title={statusLabels[agent.status]}
        />
      </div>
      <div className="text-sm text-[var(--color-text-secondary)]">
        <p>Status: {statusLabels[agent.status]}</p>
        <p>Last active: {lastActivity}</p>
        {agent.sessionName && <p>Session: {agent.sessionName}</p>}
      </div>
    </div>
  );
}

export function AgentRuntimePanel() {
  const agents = useAgentRuntimeStore((state) => state.agents);
  const wsConnected = useAgentRuntimeStore((state) => state.wsConnected);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agent Status</h2>
        <span className={`text-sm ${wsConnected ? 'text-green-500' : 'text-red-500'}`}>
          {wsConnected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>
      
      {agents.size === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">No active agents</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {Array.from(agents.values()).map((agent) => (
            <AgentRuntimeCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}