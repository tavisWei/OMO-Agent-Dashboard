import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../stores/projectStore';
import { useDashboardStore } from '../stores/dashboardStore';

export function ProjectSelector() {
  const { t } = useTranslation();
  const { projects, selectedProjectId, selectProject } = useProjectStore();
  const setDashboardProjectId = useDashboardStore((state) => state.setSelectedProjectId);

  return (
    <select
      value={selectedProjectId || ''}
      onChange={(e) => {
        const nextValue = e.target.value || null;
        selectProject(nextValue);
        setDashboardProjectId(nextValue);
      }}
      className="bg-[var(--color-bg-tertiary)] text-[var(--color-text)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
    >
      <option value="">{t('projects.select')}</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name} ({project.activeSessionCount}/{project.totalSessionCount})
        </option>
      ))}
    </select>
  );
}
