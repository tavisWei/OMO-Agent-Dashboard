import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

interface SettingsState {
  themePreference: ThemePreference;
  setThemePreference: (theme: ThemePreference) => void;

  customOpenAgentPath: string;
  setCustomOpenAgentPath: (path: string) => void;
  customOpencodePath: string;
  setCustomOpencodePath: (path: string) => void;
  customOmoPath: string;
  setCustomOmoPath: (path: string) => void;
  customDbPath: string;
  setCustomDbPath: (path: string) => void;

  apiKey: string;
  setApiKey: (key: string) => void;

  appVersion: string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'dark',
      setThemePreference: (themePreference) => set({ themePreference }),

      customOpenAgentPath: '',
      setCustomOpenAgentPath: (customOpenAgentPath) => set({ customOpenAgentPath }),
      customOpencodePath: '',
      setCustomOpencodePath: (customOpencodePath) => set({ customOpencodePath }),
      customOmoPath: '',
      setCustomOmoPath: (customOmoPath) => set({ customOmoPath }),
      customDbPath: '',
      setCustomDbPath: (customDbPath) => set({ customDbPath }),

      apiKey: '',
      setApiKey: (apiKey) => set({ apiKey }),

      appVersion: '0.1.0',
    }),
    {
      name: 'omo-settings',
    }
  )
);

export function getActualTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}