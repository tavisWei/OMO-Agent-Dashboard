import { create } from 'zustand';
import type { Task } from '../types';

const API_BASE = '/api';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  createTask: (title: string, projectId?: number, agentId?: number) => Promise<void>;
  updateTaskStatus: (id: number, status: string, position?: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/tasks`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }
      const data = await response.json();
      set({ tasks: data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        isLoading: false,
      });
    }
  },

  createTask: async (title: string, projectId?: number, agentId?: number) => {
    set({ error: null });
    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          project_id: projectId ?? null,
          agent_id: agentId ?? null,
          status: 'backlog',
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`);
      }
      const newTask = await response.json();
      set((state) => ({ tasks: [...state.tasks, newTask] }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create task',
      });
    }
  },

  updateTaskStatus: async (id: number, status: string, position?: number) => {
    set({ error: null });
    try {
      const response = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, position }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }
      const updatedTask = await response.json();
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update task',
      });
    }
  },

  deleteTask: async (id: number) => {
    set({ error: null });
    try {
      const response = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.statusText}`);
      }
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete task',
      });
    }
  },
}));