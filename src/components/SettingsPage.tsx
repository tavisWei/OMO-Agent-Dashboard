import { useState, useRef } from 'react';
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
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--color-text)]">{label}</label>}
      <select
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

function TextInput({ value, onChange, label, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; label?: string; placeholder?: string; type?: string }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[var(--color-text)]">{label}</label>}
      <div className="relative">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[var(--color-bg-tertiary)] text-[var(--color-text)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] pr-10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
          >
            {show ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function Button({ children, onClick, variant = 'primary', disabled = false, className = '' }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; className?: string }) {
  const baseClasses = 'px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = {
    primary: 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] focus:ring-[var(--color-accent)]',
    secondary: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-border)] focus:ring-[var(--color-accent)]',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { themePreference, setThemePreference, omoConfigPath, setOmoConfigPath, apiKey, setApiKey, appVersion } = useSettingsStore();
  const { theme: actualTheme, setTheme } = useThemeStore();
  const [omoPathInput, setOmoPathInput] = useState(omoConfigPath);
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSaveOmoPath = () => {
    setOmoConfigPath(omoPathInput);
  };

  const handleSaveApiKey = () => {
    setApiKey(apiKeyInput);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = {
        settings: {
          themePreference,
          omoConfigPath,
          apiKey: apiKey ? '***' : '',
          appVersion,
        },
        projects: JSON.parse(localStorage.getItem('omo-projects') || '[]'),
        agents: JSON.parse(localStorage.getItem('omo-agents') || '[]'),
        tasks: JSON.parse(localStorage.getItem('omo-tasks') || '[]'),
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omo-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.settings || !data.exportedAt) {
        throw new Error('Invalid backup file format');
      }

      if (data.settings.themePreference) setThemePreference(data.settings.themePreference);
      if (data.settings.omoConfigPath) setOmoConfigPath(data.settings.omoConfigPath);
      if (data.settings.apiKey) setApiKey(data.settings.apiKey);

      if (data.projects) localStorage.setItem('omo-projects', JSON.stringify(data.projects));
      if (data.agents) localStorage.setItem('omo-agents', JSON.stringify(data.agents));
      if (data.tasks) localStorage.setItem('omo-tasks', JSON.stringify(data.tasks));

      setImportMessage({ type: 'success', text: t('settings.importSuccess') });
      setOmoPathInput(useSettingsStore.getState().omoConfigPath);
      setApiKeyInput(useSettingsStore.getState().apiKey);
    } catch (error) {
      setImportMessage({ type: 'error', text: t('settings.importFailed') });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
              onChange={handleThemeChange}
              options={themeOptions}
            />
          </div>
          <div className="text-sm text-[var(--color-text-secondary)] pb-2">
            {t('settings.current')}: <span className="capitalize font-medium text-[var(--color-text)]">{actualTheme}</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.omoConfig')} description={t('settings.omoConfigDesc')}>
        <div className="space-y-4">
          <TextInput
            label={t('settings.omoPath')}
            value={omoPathInput}
            onChange={setOmoPathInput}
            placeholder={t('settings.omoPathPlaceholder')}
          />
          <Button onClick={handleSaveOmoPath} variant="secondary">
            {t('settings.savePath')}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.apiConfig')} description={t('settings.apiConfigDesc')}>
        <div className="space-y-4">
          <TextInput
            label={t('settings.apiKey')}
            value={apiKeyInput}
            onChange={setApiKeyInput}
            placeholder={t('settings.apiKeyPlaceholder')}
            type="password"
          />
          <Button onClick={handleSaveApiKey} variant="secondary">
            {t('settings.saveApiKey')}
          </Button>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {t('settings.apiKeyNote')}
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.dataManagement')} description={t('settings.dataManagementDesc')}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={handleExport} variant="secondary" disabled={isExporting}>
              {isExporting ? t('settings.exporting') : t('settings.exportData')}
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              disabled={isImporting}
            >
              {isImporting ? t('settings.importing') : t('settings.importBackup')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
          {importMessage && (
            <div
              className={`text-sm ${importMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}
            >
              {importMessage.text}
            </div>
          )}
          <p className="text-xs text-[var(--color-text-secondary)]">
            {t('settings.exportNote')}
          </p>
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