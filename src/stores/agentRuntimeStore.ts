import { create } from 'zustand';
import type { AgentStatus } from '../types';

export type AgentRuntimeStatus = AgentStatus;

export interface AgentRuntime {
  agentId: string;
  status: AgentRuntimeStatus;
  lastUpdate: string | null;
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
    newAgents.set(agent.agentId, agent);
    return { agents: newAgents };
  }),
  
  setAgents: (agents) => set(() => {
    const newAgents = new Map();
    agents.forEach((agent) => newAgents.set(agent.agentId, agent));
    return { agents: newAgents };
  }),
}));
