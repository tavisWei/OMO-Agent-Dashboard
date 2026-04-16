export const ROUTES = {
  HOME: '/',
  TASK: (id: string) => `/tasks/${encodeURIComponent(id)}`,
  MODELS: '/models',
  AGENTS: '/agents',
  PROJECT: (id: string | number) => `/project/${encodeURIComponent(String(id))}`,
  AGENT: (id: string | number) => `/agent/${encodeURIComponent(String(id))}`,
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  ACTIVITY: '/activity',
} as const;
