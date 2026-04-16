import { useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from './components/AppLayout';
import { SettingsPage } from './components/SettingsPage';
import { ActivityFeed } from './components/ActivityFeed';
import { AgentDetail } from './components/AgentDetail';
import { TaskDetail } from './components/TaskDetail';
import { ModelLibrary } from './components/ModelLibrary';
import { ProjectDetail } from './components/ProjectDetail';
import { AgentMonitorView } from './components/AgentMonitorView';
import { useThemeStore } from './stores/themeStore';
import { useDashboardStore } from './stores/dashboardStore';
import { ROUTES } from './routes';

function Agents() {
  const { t } = useTranslation();
  const { config, configLoading, configError, fetchConfig } = useDashboardStore();

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('agents.title')}</h1>

      {configLoading ? (
        <p className="text-[var(--color-text-secondary)] text-sm">{t('common.loading')}</p>
      ) : configError ? (
        <p className="text-red-500 text-sm">{configError}</p>
      ) : config ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 space-y-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text)]">oh-my-openagent 智能体</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">运行时使用的真实智能体定义。</p>
              </div>
              {config.agents.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--color-text)] text-sm truncate">{entry.key}</div>
                    <div className="text-xs text-[var(--color-text-secondary)] truncate">{entry.model}{entry.variant ? ` · ${entry.variant}` : ''}</div>
                  </div>
                  <Link to={ROUTES.MODELS} className="text-xs text-[var(--color-accent)] hover:underline shrink-0 ml-2">{t('models.editModel')}</Link>
                </div>
              ))}
            </section>

            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 space-y-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text)]">分类预设</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">决定每个智能体分类使用哪个模型。</p>
              </div>
              {config.categories.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--color-text)] text-sm truncate">{entry.key}</div>
                    <div className="text-xs text-[var(--color-text-secondary)] truncate">{entry.model}{entry.variant ? ` · ${entry.variant}` : ''}</div>
                  </div>
                  <Link to={ROUTES.MODELS} className="text-xs text-[var(--color-accent)] hover:underline shrink-0 ml-2">{t('models.editModel')}</Link>
                </div>
              ))}
            </section>
          </div>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 space-y-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text)]">opencode Providers</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">opencode.json 中配置的模型供应商。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.providers.map((provider) => {
                const modelCount = (config.providerModels?.[provider] ?? []).length;
                return (
                  <div key={provider} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2">
                    <div className="font-medium text-[var(--color-text)] text-sm capitalize">{provider}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{modelCount} 个模型</div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        <p className="text-[var(--color-text-secondary)] text-sm">暂无配置数据。</p>
      )}
    </div>
  );
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
            <Route path={ROUTES.HOME} element={<AgentMonitorView />} />
            <Route path={ROUTES.TASK(':id')} element={<TaskDetail />} />
            <Route path={ROUTES.MODELS} element={<ModelLibrary />} />
            <Route path={ROUTES.AGENTS} element={<Agents />} />
            <Route path={ROUTES.PROJECT(':id')} element={<ProjectDetail />} />
            <Route path={ROUTES.AGENT(':id')} element={<AgentDetail />} />
            <Route path={ROUTES.ANALYTICS} element={<Navigate to={ROUTES.HOME} replace />} />
            <Route path={ROUTES.SETTINGS} element={<Settings />} />
            <Route path={ROUTES.ACTIVITY} element={<Activity />} />
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
