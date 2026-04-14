import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useThemeStore } from '../stores/themeStore';
import { ErrorBoundary } from './ErrorBoundary';

export function AppLayout() {
  const { theme } = useThemeStore();

  return (
    <div
      className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}
      data-theme={theme}
      style={{
        '--color-bg-primary': theme === 'dark' ? '#0f0f0f' : '#f5f5f5',
        '--color-bg-secondary': theme === 'dark' ? '#1a1a1a' : '#ffffff',
        '--color-bg-tertiary': theme === 'dark' ? '#252525' : '#e5e5e5',
        '--color-text': theme === 'dark' ? '#e5e5e5' : '#1a1a1a',
        '--color-text-secondary': theme === 'dark' ? '#a0a0a0' : '#666666',
        '--color-border': theme === 'dark' ? '#333333' : '#d4d4d4',
        '--color-accent': '#6366f1',
        '--color-accent-hover': '#818cf8',
      } as React.CSSProperties}
    >
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg-primary)]"
          style={{ minWidth: '1024px' }}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
