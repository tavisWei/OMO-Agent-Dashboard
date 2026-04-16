import { create } from 'zustand';

interface Project {
  id: string;
  name: string;
  directory: string;
  projectId: string;
  activeSessionCount: number;
  totalSessionCount: number;
}

interface ProjectState {
  projects: Project[];
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  addProject: (name: string, description?: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (id: string | null) => void;
}

const API_BASE = '/api';

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
      set({ projects: Array.isArray(data) ? data : data.projects ?? [], isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
    }
  },

  addProject: async () => {
    set({ error: 'Projects are derived from OpenCode sessions and cannot be created here' });
  },

  deleteProject: async () => {
    set({ error: 'Projects are derived from OpenCode sessions and cannot be deleted here' });
  },

  selectProject: (id) => set({ selectedProjectId: id }),
}));
