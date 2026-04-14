import { create } from 'zustand';
import type { Model } from '../types';

interface ModelState {
  models: Model[];
  isLoading: boolean;
  error: string | null;

  fetchModels: () => Promise<void>;
  createModel: (model: Omit<Model, 'id' | 'created_at' | 'updated_at'>) => Promise<Model>;
  updateModel: (id: number, updates: Partial<Model>) => Promise<Model>;
  deleteModel: (id: number) => Promise<void>;
  getActiveModels: () => Model[];
}

const API_BASE = '/api';

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  isLoading: false,
  error: null,

  fetchModels: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/models`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json();
      set({ models: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch models',
        isLoading: false 
      });
    }
  },

  createModel: async (model) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(model),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || `Failed to create model: ${response.statusText}`);
      }

      const createdModel = await response.json();
      set((state) => ({
        models: [createdModel, ...state.models],
        isLoading: false,
      }));
      return createdModel;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create model';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateModel: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || `Failed to update model: ${response.statusText}`);
      }

      const updatedModel = await response.json();
      set((state) => ({
        models: state.models.map((m) => (m.id === id ? updatedModel : m)),
        isLoading: false,
      }));
      return updatedModel;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update model';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  deleteModel: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/models/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        if (response.status === 409) {
          throw new Error('Model is in use');
        }
        throw new Error(error?.error || `Failed to delete model: ${response.statusText}`);
      }

      set((state) => ({
        models: state.models.filter((m) => m.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete model';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  getActiveModels: () => {
    return get().models.filter((m) => m.is_active);
  },
}));
