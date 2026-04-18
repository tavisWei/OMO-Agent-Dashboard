import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useModelStore } from '../stores/modelStore';
import type { Agent } from '../types';

interface AgentConfigPanelProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function AgentConfigPanel({
  agent,
  isOpen,
  onClose,
  onSave,
}: AgentConfigPanelProps) {
  const { t } = useTranslation();
  const { getActiveModels } = useModelStore();
  
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [errors, setErrors] = useState<{ model?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const activeModels = getActiveModels();
  const modelInputId = 'agent-config-model';
  const variantInputId = 'agent-config-variant';

  const getCanonicalModel = (m: { provider?: string; model_id: string }) => 
    m.provider ? `${m.provider}/${m.model_id}` : m.model_id;

  if (agent && model === agent.model) {
    const matchingActive = activeModels.find(m => 
      m.model_id === model || getCanonicalModel(m) === model
    );
    if (matchingActive) {
      const canonical = getCanonicalModel(matchingActive);
      if (canonical !== model) {
        setModel(canonical);
      }
    }
  }

  useEffect(() => {
    if (agent) {
      setModel(agent.model || '');
      setVariant('');
      setErrors({});
    }
  }, [agent]);

  const validate = useCallback((): boolean => {
    const newErrors: { model?: string } = {};

    if (!model.trim()) {
      newErrors.model = t('agents.modelRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [model, t]);

  const handleSave = async () => {
    if (!validate() || !agent) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/config/agents/${encodeURIComponent(agent.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.trim(),
          variant: variant.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving agent config:', error);
      alert(t('agents.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        onKeyDown={handleKeyDown}
        aria-label={t('common.close')}
      />

      <section
        className="fixed right-0 top-0 h-full w-full max-w-md bg-[var(--color-bg-secondary)] shadow-2xl z-50 flex flex-col"
        onKeyDown={handleKeyDown}
        aria-label={agent?.name ? `${t('agents.edit')}: ${agent.name}` : t('agents.edit')}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)] flex items-center gap-2">
            {t('agents.edit')}: {agent?.name}
            {agent?.source && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                agent.source === 'omo_config' 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' 
                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/20'
              }`}>
                {agent.source === 'omo_config' ? 'OMO' : 'Custom'}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-secondary)]"
            aria-label={t('common.close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="space-y-2">
            <label htmlFor={modelInputId} className="block text-sm font-medium text-[var(--color-text-secondary)]">
              {t('agents.model')}
            </label>
            <div className="relative">
              <select
                id={modelInputId}
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setErrors((prev) => ({ ...prev, model: undefined }));
                }}
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  errors.model
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-[var(--color-border)]'
                } bg-[var(--color-bg-primary)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all`}
                disabled={isSaving}
              >
                {activeModels.length === 0 && !model && (
                  <option value="" disabled>No active models available</option>
                )}
                {!model && activeModels.length > 0 && (
                  <option value="" disabled>{t('agents.selectModel', 'Select a model')}</option>
                )}
                {model && !activeModels.some(m => {
                  const providerModel = getCanonicalModel(m);
                  return model === m.model_id || model === providerModel;
                }) && (
                  <option value={model} disabled>{model} (inactive)</option>
                )}
                {activeModels.map((m) => {
                  const providerModel = getCanonicalModel(m);
                  return (
                    <option key={m.id} value={providerModel}>
                      {m.name} ({providerModel})
                    </option>
                  );
                })}
              </select>
              {errors.model && (
                <p className="mt-1 text-sm text-red-500">{errors.model}</p>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t('agents.availableModels')}: {activeModels.length}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor={variantInputId} className="block text-sm font-medium text-[var(--color-text-secondary)]">
              Variant
            </label>
            <input
              id={variantInputId}
              type="text"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              placeholder="medium / high / xhigh"
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text)] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--color-border)] flex gap-3 justify-between bg-[var(--color-bg-secondary)]">
          <div className="text-xs text-[var(--color-text-secondary)]">This panel updates oh-my-openagent config.</div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
