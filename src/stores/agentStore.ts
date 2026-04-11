import { create } from 'zustand';

export interface Agent {
  id: number;
  name: string;
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  status: 'idle' | 'running' | 'error' | 'stopped';
  last_heartbeat: string | null;
  project_id: number | null;
}

interface AgentState {
  agents: Agent[];
  selectedAgentId: number | null;
  isLoading: boolean;
  error: string | null;
  wsConnected: boolean;
  ws: WebSocket | null;

  fetchAgents: () => Promise<void>;
  selectAgent: (id: number | null) => void;
  updateAgentLocal: (id: number, updates: Partial<Agent>) => void;
  setWsConnected: (connected: boolean) => void;
  handleWsMessage: (message: any) => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  filterByProject: (projectId: number | null) => Agent[];
}

const API_BASE = '/api';
const WS_URL = 'ws://localhost:3001';

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  selectedAgentId: null,
  isLoading: false,
  error: null,
  wsConnected: false,
  ws: null,

  fetchAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/agents`);
      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`);
      }
      const data = await response.json();
      set({ agents: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch agents',
        isLoading: false 
      });
    }
  },

  selectAgent: (id) => set({ selectedAgentId: id }),

  updateAgentLocal: (id, updates) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id ? { ...agent, ...updates } : agent
      ),
    }));
  },

  setWsConnected: (connected) => set({ wsConnected: connected }),

  handleWsMessage: (message) => {
    const { updateAgentLocal, fetchAgents } = get();

    switch (message.type) {
      case 'agent_update': {
        const { id, ...updates } = message.payload;
        updateAgentLocal(id, updates);
        break;
      }
      case 'config_change': {
        const { id, ...config } = message.payload;
        updateAgentLocal(id, config);
        break;
      }
      case 'connection_lost': {
        fetchAgents();
        break;
      }
      default:
        break;
    }
  },

  connectWebSocket: () => {
    const { ws, handleWsMessage, setWsConnected, fetchAgents } = get();

    if (ws && ws.readyState === WebSocket.OPEN) {
      return;
    }

    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      setWsConnected(true);
      set({ error: null });
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWsMessage(message);
      } catch {
        console.error('Failed to parse WebSocket message');
      }
    };

    socket.onclose = () => {
      setWsConnected(false);
      setTimeout(() => {
        const { wsConnected } = get();
        if (!wsConnected) {
          get().connectWebSocket();
          fetchAgents();
        }
      }, 3000);
    };

    socket.onerror = () => {
      setWsConnected(false);
      set({ error: 'WebSocket connection error' });
    };

    set({ ws: socket });
  },

  disconnectWebSocket: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null, wsConnected: false });
    }
  },

  filterByProject: (projectId) => {
    const { agents } = get();
    if (projectId === null) {
      return agents;
    }
    return agents.filter((agent) => agent.project_id === projectId);
  },
}));

if (typeof window !== 'undefined') {
  setTimeout(() => {
    useAgentStore.getState().connectWebSocket();
  }, 100);
}
