import { create } from 'zustand';

interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface ProjectState {
  projects: Project[];
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  addProject: (name: string, description?: string) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  selectProject: (id: string | null) => void;
}

const API_BASE = 'http://localhost:3001/api';

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  selectedProjectId: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await fetch(`${API_BASE}/projects`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      set({ projects: data, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
    }
  },

  addProject: async (name: string, description?: string) => {
    try {
      set({ isLoading: true, error: null });
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) throw new Error('Failed to add project');
      const newProject = await res.json();
      set((state) => ({ projects: [...state.projects, newProject], isLoading: false }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
      throw err;
    }
  },

  deleteProject: async (id: number) => {
    try {
      set({ isLoading: true, error: null });
      const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete project');
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
      throw err;
    }
  },

  selectProject: (id) => set({ selectedProjectId: id }),
}));