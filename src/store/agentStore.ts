import { create } from 'zustand';
import type { Agent, AgentWithUsage, CostRecord } from '../types';

const API_BASE = 'http://localhost:3001/api';

interface AgentState {
  agents: AgentWithUsage[];
  selectedAgent: AgentWithUsage | null;
  isLoading: boolean;
  error: string | null;

  fetchAgents: () => Promise<void>;
  updateAgent: (id: number, updates: Partial<Agent>) => Promise<void>;
  selectAgent: (agent: AgentWithUsage | null) => void;
  getAgentUsage: (agentId: number) => Promise<{ totalTokens: number; totalCost: number }>;
}

async function fetchWithAuth<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  selectedAgent: null,
  isLoading: false,
  error: null,

  fetchAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const agents = await fetchWithAuth<Agent[]>(`${API_BASE}/agents`);

      const agentsWithUsage = await Promise.all(
        agents.map(async (agent) => {
          const usage = await get().getAgentUsage(agent.id);
          return {
            ...agent,
            totalTokens: usage.totalTokens,
            totalCost: usage.totalCost,
          };
        })
      );

      set({ agents: agentsWithUsage, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch agents',
        isLoading: false
      });
    }
  },

  updateAgent: async (id: number, updates: Partial<Agent>) => {
    set({ isLoading: true, error: null });
    try {
      await fetchWithAuth<Agent>(`${API_BASE}/agents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      await get().fetchAgents();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update agent',
        isLoading: false
      });
      throw err;
    }
  },

  selectAgent: (agent) => {
    set({ selectedAgent: agent });
  },

  getAgentUsage: async (agentId: number) => {
    try {
      const records = await fetchWithAuth<CostRecord[]>(
        `${API_BASE}/agents/${agentId}/costs`
      );
      const totals = records.reduce(
        (acc, record) => ({
          totalTokens: acc.totalTokens + record.input_tokens + record.output_tokens,
          totalCost: acc.totalCost + record.cost,
        }),
        { totalTokens: 0, totalCost: 0 }
      );
      return totals;
    } catch {
      return { totalTokens: 0, totalCost: 0 };
    }
  },
}));
