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
  const [modelFilter, setModelFilter] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [errors, setErrors] = useState<{ model?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const activeModels = getActiveModels();
  const modelInputId = 'agent-config-model';
  const variantInputId = 'agent-config-variant';

  useEffect(() => {
    if (agent) {
      setModel(agent.model || '');
      setVariant('');
      setModelFilter('');
      setErrors({});
    }
  }, [agent]);

  const filteredModels = activeModels.filter((m) =>
    m.name.toLowerCase().includes(modelFilter.toLowerCase()) || 
    m.model_id.toLowerCase().includes(modelFilter.toLowerCase())
  );

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
              <input
                id={modelInputId}
                type="text"
                value={modelFilter || model}
                onChange={(e) => {
                  setModelFilter(e.target.value);
                  setShowModelDropdown(true);
                  if (!e.target.value) setModel('');
                }}
                onFocus={() => setShowModelDropdown(true)}
                placeholder={t('agents.searchModel')}
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  errors.model
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-[var(--color-border)]'
                } bg-[var(--color-bg-primary)] text-[var(--color-text)] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all`}
              />
              {errors.model && (
                <p className="mt-1 text-sm text-red-500">{errors.model}</p>
              )}

              {showModelDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredModels.length > 0 ? (
                    filteredModels.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setModel(m.model_id);
                          setModelFilter('');
                          setShowModelDropdown(false);
                          setErrors((prev) => ({ ...prev, model: undefined }));
                        }}
                        className={`w-full px-4 py-2.5 text-left flex flex-col hover:bg-[var(--color-bg-tertiary)] transition-colors ${
                          model === m.model_id
                            ? 'bg-indigo-500/10 text-indigo-400'
                            : 'text-[var(--color-text)]'
                        }`}
                      >
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs opacity-70">{m.model_id}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                      {t('agents.noModelFound')}
                    </div>
                  )}
                </div>
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
