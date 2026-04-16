import { create } from 'zustand';

export type DashboardSessionStatus = 'queued' | 'idle' | 'running' | 'error' | 'stopped' | 'thinking' | 'offline' | 'completed';

export interface DashboardTodo {
  content: string;
  status: string;
  priority: string;
  position: number;
  updatedAt: string;
}

export interface DashboardSession {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  slug: string;
  directory: string;
  status: DashboardSessionStatus;
  agentLabel: string;
  sessionType: 'root' | 'child' | 'orphan';
  model: string | null;
  provider: string | null;
  variant: string | null;
  cost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  todos: DashboardTodo[];
}

export interface DashboardProject {
  id: string;
  name: string;
  directory: string;
  projectId: string;
  activeSessionCount: number;
  totalSessionCount: number;
}

export interface DashboardOverview {
  totalSessions: number;
  runningSessions: number;
  thinkingSessions: number;
  failedSessions: number;
  idleSessions: number;
  queuedSessions: number;
  completedSessions: number;
  activeProjects: number;
}

export interface DashboardTreeNode extends DashboardSession {
  children: DashboardTreeNode[];
}

export interface ConfigEntry {
  key: string;
  model: string;
  variant?: string | null;
}

export interface DashboardConfig {
  openAgentPath: string;
  opencodePath: string;
  omoPath: string;
  agents: ConfigEntry[];
  categories: ConfigEntry[];
  providers: string[];
  providerModels?: Record<string, string[]>;
  providerDetails?: Record<string, { name: string; npm: string; baseURL: string; apiKeyMasked: string }>;
  error?: string;
}

interface DashboardState {
  sessions: DashboardSession[];
  projects: DashboardProject[];
  tree: DashboardTreeNode[];
  overview: DashboardOverview | null;
  config: DashboardConfig | null;
  selectedProjectId: string | null;
  isLoading: boolean;
  configLoading: boolean;
  error: string | null;
  configError: string | null;
  wsConnected: boolean;
  statusFilter: DashboardSessionStatus[];
  setSelectedProjectId: (projectId: string | null) => void;
  setWsConnected: (connected: boolean) => void;
  toggleStatusFilter: (status: DashboardSessionStatus) => void;
  clearStatusFilter: () => void;
  applySnapshot: (payload: Partial<Pick<DashboardState, 'sessions' | 'projects' | 'tree' | 'overview'>>) => void;
  fetchSessions: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchConfig: () => Promise<void>;
}

const API_BASE = '/api';
const DEFAULT_STATUS_FILTER: DashboardSessionStatus[] = ['running', 'thinking', 'error'];

export const useDashboardStore = create<DashboardState>((set, get) => ({
  sessions: [],
  projects: [],
  tree: [],
  overview: null,
  config: null,
  selectedProjectId: null,
  isLoading: false,
  configLoading: false,
  error: null,
  configError: null,
  wsConnected: false,
  statusFilter: DEFAULT_STATUS_FILTER,
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  toggleStatusFilter: (status) => set((state) => ({
    statusFilter: state.statusFilter.includes(status)
      ? state.statusFilter.filter((entry) => entry !== status)
      : [...state.statusFilter, status],
  })),
  clearStatusFilter: () => set({ statusFilter: DEFAULT_STATUS_FILTER }),
  applySnapshot: (payload) => set((state) => ({
    sessions: payload.sessions ?? state.sessions,
    projects: payload.projects ?? state.projects,
    tree: payload.tree ?? state.tree,
    overview: payload.overview ?? state.overview,
    isLoading: false,
    error: null,
  })),
  fetchSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const [sessionsRes, overviewRes] = await Promise.all([
        fetch(`${API_BASE}/sessions`),
        fetch(`${API_BASE}/sessions/overview`),
      ]);
      const sessions = await sessionsRes.json() as DashboardSession[];
      const overviewPayload = await overviewRes.json() as { overview: DashboardOverview; projects: DashboardProject[]; tree: DashboardTreeNode[]; error?: string };
      set({
        sessions: Array.isArray(sessions) ? sessions : [],
        projects: overviewPayload.projects ?? [],
        tree: overviewPayload.tree ?? [],
        overview: overviewPayload.overview ?? null,
        isLoading: false,
        error: overviewPayload.error ?? null,
      });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Failed to fetch dashboard data' });
    }
  },
  fetchProjects: async () => {
    if (get().projects.length > 0) {
      return;
    }
    await get().fetchSessions();
  },
  fetchConfig: async () => {
    set({ configLoading: true, configError: null });
    try {
      const response = await fetch(`${API_BASE}/config`);
      const payload = await response.json() as DashboardConfig;
      set({
        config: payload,
        configLoading: false,
        configError: payload.error ?? null,
      });
    } catch (error) {
      set({ configLoading: false, configError: error instanceof Error ? error.message : 'Failed to fetch config' });
    }
  },
}));
