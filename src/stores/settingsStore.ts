import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

interface SettingsState {
  themePreference: ThemePreference;
  setThemePreference: (theme: ThemePreference) => void;

  omoConfigPath: string;
  setOmoConfigPath: (path: string) => void;

  apiKey: string;
  setApiKey: (key: string) => void;

  appVersion: string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'dark',
      setThemePreference: (themePreference) => set({ themePreference }),

      omoConfigPath: '~/.omo/config.yaml',
      setOmoConfigPath: (omoConfigPath) => set({ omoConfigPath }),

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