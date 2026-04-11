import { create } from 'zustand';

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  cost: number;
}

interface ProjectState {
  projects: Project[];
  selectedProjectId: string | null;
  setProjects: (projects: Project[]) => void;
  selectProject: (id: string | null) => void;
  addProject: (project: Project) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [
    { id: '1', name: 'OMO-SpecFlow', description: '规格驱动开发工作流系统', createdAt: '2024-01-15', cost: 128.50 },
    { id: '2', name: 'AI-Chatbot', description: '智能客服对话系统', createdAt: '2024-02-20', cost: 89.25 },
    { id: '3', name: 'Data-Processor', description: '大规模数据处理平台', createdAt: '2024-03-10', cost: 256.80 },
  ],
  selectedProjectId: null,
  setProjects: (projects) => set({ projects }),
  selectProject: (id) => set({ selectedProjectId: id }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
}));
