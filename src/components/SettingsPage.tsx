import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, ThemePreference, getActualTheme } from '../stores/settingsStore';
import { useThemeStore } from '../stores/themeStore';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-6">
      <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">{title}</h2>
      {description && <p className="text-sm text-[var(--color-text-secondary)] mb-4">{description}</p>}
      {children}
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: SelectOption[]; label?: string }) {
  const inputId = `select-${label ?? 'field'}`.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">{label}</label>}
      <select
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[var(--color-bg-tertiary)] text-[var(--color-text)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const {
    themePreference, setThemePreference, appVersion,
    customOpenAgentPath, setCustomOpenAgentPath,
    customOpencodePath, setCustomOpencodePath,
    customOmoPath, setCustomOmoPath,
    customDbPath, setCustomDbPath,
  } = useSettingsStore();
  const { theme: actualTheme, setTheme } = useThemeStore();
  const [themeTouched, setThemeTouched] = useState(false);
  const [systemPaths, setSystemPaths] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<Record<string, { valid: boolean; error?: string }>>({});

  useEffect(() => {
    fetch('/api/config/paths')
      .then(res => res.json())
      .then(data => setSystemPaths(data))
      .catch(() => setSystemPaths({}));
  }, []);

  const themeOptions = [
    { value: 'light', label: t('settings.light') },
    { value: 'dark', label: t('settings.dark') },
    { value: 'system', label: t('settings.system') },
  ];

  const handleThemeChange = (newPreference: string) => {
    const pref = newPreference as ThemePreference;
    setThemePreference(pref);
    const actual = getActualTheme(pref);
    setTheme(actual);
  };

  const validatePath = async (path: string, type: string, key: string) => {
    if (!path.trim()) {
      setValidationResults(prev => ({ ...prev, [key]: { valid: true } }));
      return;
    }
    try {
      const res = await fetch('/api/config/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type }),
      });
      const result = await res.json();
      setValidationResults(prev => ({ ...prev, [key]: result }));
    } catch {
      setValidationResults(prev => ({ ...prev, [key]: { valid: false, error: 'Validation failed' } }));
    }
  };

  const resetPaths = () => {
    setCustomOpenAgentPath('');
    setCustomOpencodePath('');
    setCustomOmoPath('');
    setCustomDbPath('');
    setValidationResults({});
  };

  const pathInputs = [
    { key: 'openAgent', label: 'OpenAgent Config', type: 'openagent', value: customOpenAgentPath, setValue: setCustomOpenAgentPath, systemPath: systemPaths.openAgentPath },
    { key: 'opencode', label: 'Opencode Config', type: 'opencode', value: customOpencodePath, setValue: setCustomOpencodePath, systemPath: systemPaths.opencodePath },
    { key: 'omo', label: 'OMO Config', type: 'omo', value: customOmoPath, setValue: setCustomOmoPath, systemPath: systemPaths.omoPath },
    { key: 'db', label: 'Database', type: 'opencode', value: customDbPath, setValue: setCustomDbPath, systemPath: systemPaths.dbPath },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('settings.title')}</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t('settings.subtitle')}</p>
      </div>

      <SettingsSection title={t('settings.appearance')} description={t('settings.appearanceDesc')}>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Select
              label={t('settings.theme')}
              value={themePreference}
              onChange={(value) => {
                setThemeTouched(true);
                handleThemeChange(value);
              }}
              options={themeOptions}
            />
          </div>
          <div className="text-sm text-[var(--color-text-secondary)] pb-2">
            {t('settings.current')}: <span className="capitalize font-medium text-[var(--color-text)]">{actualTheme}</span>
          </div>
        </div>
        {themeTouched ? (
          <div className="mt-3 text-sm text-[var(--color-text-secondary)]">
            {t('common.success')}
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection title="Path Configuration" description="Configure custom paths for config files and database. Leave empty to use system defaults.">
        <div className="space-y-4">
          {pathInputs.map(({ key, label, type, value, setValue, systemPath }) => (
            <div key={key} className="space-y-1">
              <label htmlFor={`path-input-${key}`} className="text-sm font-medium text-[var(--color-text)]">{label}</label>
              <div className="flex gap-2">
                <input
                  id={`path-input-${key}`}
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={systemPath || `Default ${label} path`}
                  className="flex-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                />
                <button
                  type="button"
                  onClick={() => validatePath(value, type, key)}
                  className="px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-md text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
                >
                  Validate
                </button>
              </div>
              {systemPath && (
                <p className="text-xs text-[var(--color-text-secondary)]">Default: {systemPath}</p>
              )}
              {validationResults[key] && (
                <p className={`text-xs ${validationResults[key].valid ? 'text-green-500' : 'text-red-500'}`}>
                  {validationResults[key].valid ? 'Valid' : validationResults[key].error || 'Invalid'}
                </p>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={resetPaths}
            className="w-full px-4 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-md text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]"
          >
            Reset to Defaults
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.about')}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">{t('settings.version')}</span>
            <span className="text-sm font-medium text-[var(--color-text)]">{appVersion}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">{t('settings.build')}</span>
            <span className="text-sm font-medium text-[var(--color-text)]">Vite + React</span>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
