import { create } from 'zustand';
import type {
  CreateTaskInput,
  Task,
  TaskAssignmentInput,
  TaskDependenciesMutationInput,
  TaskDetailResponse,
  TaskFilters,
  TaskStatus,
  UpdateTaskInput,
} from '../types';

const API_BASE = '/api';

type LegacyCreateTaskArgs = [title: string, projectId?: number, agentId?: number];

interface TaskState {
  tasks: Task[];
  selectedTask: TaskDetailResponse | null;
  subtasks: Task[];
  isLoading: boolean;
  error: string | null;
  wsConnected: boolean;
  ws: WebSocket | null;
  fetchTasks: (filters?: TaskFilters) => Promise<Task[]>;
  fetchTaskDetail: (id: number) => Promise<TaskDetailResponse | null>;
  fetchSubtasks: (id: number) => Promise<Task[]>;
  createTask: (...args: LegacyCreateTaskArgs | [input: CreateTaskInput]) => Promise<TaskDetailResponse | null>;
  updateTask: (id: number, updates: UpdateTaskInput) => Promise<TaskDetailResponse | null>;
  updateTaskStatus: (id: number, status: TaskStatus, position?: number) => Promise<TaskDetailResponse | null>;
  assignAgents: (id: number, assignments: TaskAssignmentInput[]) => Promise<TaskDetailResponse | null>;
  updateDependencies: (id: number, payload: TaskDependenciesMutationInput) => Promise<TaskDetailResponse | null>;
  deleteTask: (id: number) => Promise<void>;
  clearSelectedTask: () => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  handleWsMessage: (message: any) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  selectedTask: null,
  subtasks: [],
  isLoading: false,
  error: null,
  wsConnected: false,
  ws: null,

  fetchTasks: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/tasks${toQueryString(filters)}`);
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to fetch tasks'));
      }

      const tasks = await response.json() as Task[];
      set({ tasks, isLoading: false });
      return tasks;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
      set({ error: message, isLoading: false });
      return [];
    }
  },

  fetchTaskDetail: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/tasks/${id}`);
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to fetch task detail'));
      }

      const detail = await response.json() as TaskDetailResponse;
      set((state) => ({
        selectedTask: detail,
        subtasks: detail.subtasks,
        tasks: upsertTask(state.tasks, detail.task),
        isLoading: false,
      }));
      return detail;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch task detail';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  fetchSubtasks: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/tasks/${id}/subtasks`);
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to fetch subtasks'));
      }

      const subtasks = await response.json() as Task[];
      set({ subtasks, isLoading: false });
      return subtasks;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch subtasks';
      set({ error: message, isLoading: false });
      return [];
    }
  },

  createTask: async (...args) => {
    set({ error: null });
    try {
      const payload = normalizeCreateTaskArgs(args);
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          status: payload.status ?? 'backlog',
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to create task'));
      }

      const detail = await response.json() as TaskDetailResponse;
      set((state) => ({
        tasks: upsertTask(state.tasks, detail.task),
        selectedTask: detail,
        subtasks: detail.subtasks,
      }));
      return detail;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create task',
      });
      return null;
    }
  },

  updateTask: async (id, updates) => {
    set({ error: null });
    try {
      const response = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to update task'));
      }

      const detail = await response.json() as TaskDetailResponse;
      set((state) => ({
        tasks: upsertTask(state.tasks, detail.task),
        selectedTask: state.selectedTask?.task.id === id ? detail : state.selectedTask,
        subtasks: state.selectedTask?.task.id === id ? detail.subtasks : state.subtasks,
      }));
      return detail;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update task',
      });
      return null;
    }
  },

  updateTaskStatus: async (id, status, position) => {
    return get().updateTask(id, {
      status,
      ...(position !== undefined ? { position } : {}),
    });
  },

  assignAgents: async (id, assignments) => {
    set({ error: null });
    try {
      const response = await fetch(`${API_BASE}/tasks/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to assign agents'));
      }

      const detail = await get().fetchTaskDetail(id);
      return detail;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to assign agents',
      });
      return null;
    }
  },

  updateDependencies: async (id, payload) => {
    set({ error: null });
    try {
      const response = await fetch(`${API_BASE}/tasks/${id}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to update dependencies'));
      }

      const detail = await get().fetchTaskDetail(id);
      return detail;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update dependencies',
      });
      return null;
    }
  },

  deleteTask: async (id) => {
    set({ error: null });
    try {
      const response = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to delete task'));
      }

      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
        selectedTask: state.selectedTask?.task.id === id ? null : state.selectedTask,
        subtasks: state.subtasks.filter((task) => task.id !== id),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete task',
      });
    }
  },

  clearSelectedTask: () => {
    set({ selectedTask: null, subtasks: [] });
  },

  handleWsMessage: (message) => {
    switch (message.type) {
      case 'task_created':
      case 'task_updated': {
        const detail = message.payload as TaskDetailResponse;
        set((state) => ({
          tasks: upsertTask(state.tasks, detail.task),
          selectedTask: state.selectedTask?.task.id === detail.task.id ? detail : state.selectedTask,
          subtasks: state.selectedTask?.task.id === detail.task.id ? detail.subtasks : state.subtasks,
        }));
        break;
      }
      case 'task_deleted': {
        const deletedId = message.payload?.id as number | undefined;
        if (typeof deletedId !== 'number') break;
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== deletedId),
          selectedTask: state.selectedTask?.task.id === deletedId ? null : state.selectedTask,
          subtasks: state.subtasks.filter((task) => task.id !== deletedId),
        }));
        break;
      }
      case 'orchestration_update': {
        const task = message.payload?.task as Task | undefined;
        if (!task) break;
        set((state) => ({
          tasks: upsertTask(state.tasks, task),
          selectedTask: state.selectedTask?.task.id === task.id
            ? { ...state.selectedTask, task }
            : state.selectedTask,
        }));
        break;
      }
      default:
        break;
    }
  },

  connectWebSocket: () => {
    const { ws, handleWsMessage } = get();
    if (ws && ws.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket('ws://localhost:3001');

    socket.onopen = () => set({ wsConnected: true, error: null });
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWsMessage(message);
      } catch {
      }
    };
    socket.onclose = () => {
      set({ wsConnected: false, ws: null });
      setTimeout(() => {
        const current = get().ws;
        if (!current) {
          get().connectWebSocket();
        }
      }, 3000);
    };
    socket.onerror = () => set({ wsConnected: false });

    set({ ws: socket });
  },

  disconnectWebSocket: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
    }
    set({ ws: null, wsConnected: false });
  },
}));

if (typeof window !== 'undefined') {
  setTimeout(() => {
    useTaskStore.getState().connectWebSocket();
  }, 100);
}

function normalizeCreateTaskArgs(args: LegacyCreateTaskArgs | [CreateTaskInput]): CreateTaskInput {
  if (typeof args[0] === 'string') {
    const [title, projectId, agentId] = args as LegacyCreateTaskArgs;
    return {
      title,
      project_id: projectId ?? null,
      agent_id: agentId ?? null,
      status: 'backlog',
    };
  }

  return args[0];
}

function toQueryString(filters: TaskFilters): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    params.set(key, value === null ? 'null' : String(value));
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

function upsertTask(tasks: Task[], nextTask: Task): Task[] {
  const existingIndex = tasks.findIndex((task) => task.id === nextTask.id);
  if (existingIndex === -1) {
    return [...tasks, nextTask];
  }

  const nextTasks = [...tasks];
  nextTasks[existingIndex] = nextTask;
  return nextTasks;
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json() as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}
