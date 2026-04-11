import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { CostOverview } from './components/CostOverview';
import { SettingsPage } from './components/SettingsPage';
import { ActivityFeed } from './components/ActivityFeed';
import { AgentChat } from './components/AgentChat';
import { useThemeStore } from './stores/themeStore';

function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">Total Projects</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">3</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">Active Agents</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">12</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">Total Cost</p>
          <p className="text-2xl font-bold text-[var(--color-accent)]">$474.55</p>
        </div>
      </div>
    </div>
  );
}

function ProjectDetail() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Project Detail</h1>
      <p className="text-[var(--color-text-secondary)]">Project details will be displayed here.</p>
    </div>
  );
}

function AgentDetail() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Agent Detail</h1>
      <p className="text-[var(--color-text-secondary)]">Agent details will be displayed here.</p>
    </div>
  );
}

function Analytics() {
  return <CostOverview />;
}

function Settings() {
  return <SettingsPage />;
}

function Activity() {
  return (
    <div className="h-full">
      <ActivityFeed refreshInterval={15000} />
    </div>
  );
}

function Chat() {
  return (
    <div className="h-full">
      <AgentChat className="h-full" />
    </div>
  );
}

function App() {
  const { theme } = useThemeStore();

  return (
    <BrowserRouter>
      <div
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
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="/agent/:id" element={<AgentDetail />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/chat" element={<Chat />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
