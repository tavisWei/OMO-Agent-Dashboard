import { create } from 'zustand';

export type AgentRuntimeStatus = 'idle' | 'running' | 'thinking' | 'error' | 'offline';

export interface AgentRuntime {
  id: string;
  name: string;
  status: AgentRuntimeStatus;
  lastActivity: string | null;
  sessionName: string | null;
}

interface AgentRuntimeState {
  agents: Map<string, AgentRuntime>;
  wsConnected: boolean;
  
  setWsConnected: (connected: boolean) => void;
  updateAgent: (agent: AgentRuntime) => void;
  setAgents: (agents: AgentRuntime[]) => void;
}

export const useAgentRuntimeStore = create<AgentRuntimeState>((set) => ({
  agents: new Map(),
  wsConnected: false,
  
  setWsConnected: (connected) => set({ wsConnected: connected }),
  
  updateAgent: (agent) => set((state) => {
    const newAgents = new Map(state.agents);
    newAgents.set(agent.id, agent);
    return { agents: newAgents };
  }),
  
  setAgents: (agents) => set(() => {
    const newAgents = new Map();
    agents.forEach((agent) => newAgents.set(agent.id, agent));
    return { agents: newAgents };
  }),
}));