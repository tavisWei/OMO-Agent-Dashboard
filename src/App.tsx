import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { CostOverview } from './components/CostOverview';
import { SettingsPage } from './components/SettingsPage';
import { ActivityFeed } from './components/ActivityFeed';
import { AgentChat } from './components/AgentChat';
import { AgentGrid } from './components/AgentGrid';
import { KanbanBoard } from './components/KanbanBoard';
import AgentConfigPanel from './components/AgentConfigPanel';
import { useThemeStore } from './stores/themeStore';
import { useAgentStore } from './stores/agentStore';
import { useProjectStore } from './stores/projectStore';
import { useAgentRuntime } from './hooks/useAgentRuntime';
import { AgentRuntimePanel } from './components/AgentRuntimeCard';
import type { AgentWithUsage } from './types';

function Dashboard() {
  useAgentRuntime();
  const { agents, isLoading, error, fetchAgents } = useAgentStore();
  const { projects, fetchProjects } = useProjectStore();
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentWithUsage | null>(null);

  useEffect(() => {
    fetchAgents();
    fetchProjects();
  }, [fetchAgents, fetchProjects]);

  const handleEditAgent = (agent: AgentWithUsage) => {
    setSelectedAgent(agent);
    setConfigPanelOpen(true);
  };

  const handleCloseConfigPanel = () => {
    setConfigPanelOpen(false);
    setSelectedAgent(null);
  };

  const runningAgents = agents.filter((a) => a.status === 'running').length;

  const filteredAgents: AgentWithUsage[] = agents.map((a) => ({
    ...a,
    config_path: null,
    created_at: '',
    updated_at: '',
    totalTokens: 0,
    totalCost: 0,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">Total Projects</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">{projects.length}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">Active Agents</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">{runningAgents}</p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)]">Total Agents</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">{agents.length}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-[var(--color-text-secondary)]">Loading...</p>
      ) : error ? (
        <p className="text-red-500">Error: {error}</p>
      ) : (
        <AgentGrid agents={filteredAgents} onEditAgent={handleEditAgent} />
      )}

      <AgentRuntimePanel />

      <AgentConfigPanel
        agent={selectedAgent}
        isOpen={configPanelOpen}
        onClose={handleCloseConfigPanel}
        onSave={fetchAgents}
      />
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

function Tasks() {
  return (
    <div className="h-full">
      <KanbanBoard />
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
            <Route path="/tasks" element={<Tasks />} />
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
