import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import { ProjectSelector } from './ProjectSelector';
import { ROUTES } from '../routes';

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { projects, selectedProjectId, fetchProjects } = useProjectStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const navItems = [
    { path: ROUTES.HOME, label: t('nav.monitor'), icon: 'M3 7h18M6 12h4m4 0h4m-9 5h6M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
    { path: ROUTES.ACTIVITY, label: t('nav.activity'), icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { path: ROUTES.AGENTS, label: t('nav.agents'), icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { path: ROUTES.MODELS, label: t('nav.models'), icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
    { path: ROUTES.SETTINGS, label: t('nav.settings'), icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ];

  const isProjectRoute = location.pathname.startsWith(ROUTES.PROJECT(''));
  const selectedProjectPath = selectedProjectId ? ROUTES.PROJECT(selectedProjectId) : null;

  return (
    <aside
      className={`bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
        {!isCollapsed && <span className="font-semibold text-sm text-[var(--color-text-secondary)]">{t('nav.monitor')}</span>}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2 mx-2 rounded-md transition-colors ${
              location.pathname === item.path
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]'
            }`}
          >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
            {!isCollapsed && <span className="text-sm">{item.label}</span>}
          </Link>
        ))}

        {!isCollapsed && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)] px-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                {t('projects.title')}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                {projects.length} {projects.length === 1 ? 'project' : 'projects'} available
              </p>
            </div>

            <ProjectSelector />

            {selectedProjectPath ? (
              <Link
                to={selectedProjectPath}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                  isProjectRoute
                    ? 'border-[var(--color-accent)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]'
                }`}
              >
                <span className="truncate">Open selected project</span>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <div className="rounded-md border border-dashed border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                Select a project to open its detail view.
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}
