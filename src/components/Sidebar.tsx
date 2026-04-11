import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';

export function Sidebar() {
  const location = useLocation();
  const { projects, selectedProjectId, selectProject } = useProjectStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const totalCost = projects.reduce((sum, p) => sum + p.cost, 0);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/chat', label: 'Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { path: '/activity', label: 'Activity', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { path: '/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { path: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ];

  return (
    <aside
      className={`bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
        {!isCollapsed && <span className="font-semibold text-sm text-[var(--color-text-secondary)]">Projects</span>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            {!isCollapsed && <span className="text-sm">{item.label}</span>}
          </Link>
        ))}

        {!isCollapsed && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <div className="px-3 mb-2">
              <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Projects ({projects.length})
              </span>
            </div>
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                onClick={() => selectProject(project.id)}
                className={`flex items-center justify-between px-3 py-2 mx-2 rounded-md transition-colors ${
                  selectedProjectId === project.id
                    ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-accent)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]'
                }`}
              >
                <span className="text-sm truncate">{project.name}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">${project.cost.toFixed(2)}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-[var(--color-border)]">
        <Link
          to="/analytics"
          className="flex items-center gap-3 px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] text-[var(--color-accent)] hover:opacity-80 transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-xs text-[var(--color-text-secondary)]">Total Cost</span>
              <span className="text-sm font-semibold">${totalCost.toFixed(2)}</span>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
