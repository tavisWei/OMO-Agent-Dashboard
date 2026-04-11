import { create } from 'zustand';
import type { CostRecord } from '../types';

interface CostState {
  records: CostRecord[];
  isLoading: boolean;
  error: string | null;
  timeRange: 'today' | 'week' | 'month' | 'all';
  setTimeRange: (range: 'today' | 'week' | 'month' | 'all') => void;
  fetchCosts: () => Promise<void>;
}

const API_BASE = '/api';

function calculateTotalCost(records: CostRecord[]): number {
  return records.reduce((sum, r) => sum + r.cost, 0);
}

function calculateTotalTokens(records: CostRecord[]): number {
  return records.reduce((sum, r) => sum + r.input_tokens + r.output_tokens, 0);
}

function calculateByAgent(records: CostRecord[]): Record<string, { cost: number; tokens: number }> {
  const byAgent: Record<string, { cost: number; tokens: number }> = {};
  
  records.forEach(record => {
    const key = record.agent_id?.toString() ?? 'unknown';
    if (!byAgent[key]) {
      byAgent[key] = { cost: 0, tokens: 0 };
    }
    byAgent[key].cost += record.cost;
    byAgent[key].tokens += record.input_tokens + record.output_tokens;
  });
  
  return byAgent;
}

export const useCostStore = create<CostState>((set, get) => ({
  records: [],
  isLoading: false,
  error: null,
  timeRange: 'week',

  setTimeRange: (range) => {
    set({ timeRange: range });
    get().fetchCosts();
  },

  fetchCosts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { timeRange } = get();
      const response = await fetch(`${API_BASE}/cost-records?range=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cost records: ${response.statusText}`);
      }
      
      const data = await response.json();
      set({ records: data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch cost records',
        isLoading: false,
      });
    }
  },
}));

export const selectTotalCost = (state: CostState) => calculateTotalCost(state.records);
export const selectTotalTokens = (state: CostState) => calculateTotalTokens(state.records);
export const selectByAgent = (state: CostState) => calculateByAgent(state.records);