import { create } from 'zustand';
import type { ActivityLog, ActivityType } from '../types';

const API_BASE = '/api';

interface ActivityFilters {
  types: ActivityType[];
  agentId: string | null;
  project: string | null;
  timeRange: string;
}

interface ActivityState {
  logs: ActivityLog[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  offset: number;
  limit: number;
  filters: ActivityFilters;

  fetchLogs: (resetOffset?: boolean) => Promise<void>;
  addLog: (log: ActivityLog) => void;
  setFilters: (filters: Partial<ActivityFilters>) => void;
  resetFilters: () => void;
}

const defaultFilters: ActivityFilters = {
  types: [],
  agentId: null,
  project: null,
  timeRange: 'all',
};

export const useActivityStore = create<ActivityState>((set, get) => ({
  logs: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: false,
  offset: 0,
  limit: 20,
  filters: defaultFilters,

  fetchLogs: async (resetOffset = false) => {
    const { isLoading, isLoadingMore, filters, offset, limit } = get();
    
    if (isLoading || isLoadingMore) return;
    
    const currentOffset = resetOffset ? 0 : offset;

    if (resetOffset) {
      set({ isLoading: true, error: null });
    } else {
      set({ isLoadingMore: true, error: null });
    }

    try {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      params.set('offset', currentOffset.toString());

      if (filters.types.length > 0) {
        params.set('type', filters.types.join(','));
      }
      if (filters.agentId) {
        params.set('agentId', filters.agentId.toString());
      }
      if (filters.project) {
        params.set('project', filters.project);
      }
      if (filters.timeRange && filters.timeRange !== 'all') {
        params.set('timeRange', filters.timeRange);
      }

      const response = await fetch(`${API_BASE}/activity-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();

      if (resetOffset) {
        set({ 
          logs: data.logs, 
          offset: limit, 
          hasMore: data.hasMore,
          isLoading: false 
        });
      } else {
        set((state) => ({ 
          logs: [...state.logs, ...data.logs], 
          offset: state.offset + limit, 
          hasMore: data.hasMore,
          isLoadingMore: false 
        }));
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch activity logs',
        isLoading: false,
        isLoadingMore: false,
      });
    }
  },

  addLog: (log) => {
    set((state) => ({
      logs: [log, ...state.logs],
    }));
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
  },
}));
