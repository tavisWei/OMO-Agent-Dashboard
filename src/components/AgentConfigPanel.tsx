import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useModelStore } from '../stores/modelStore';
import { useAgentStore } from '../stores/agentStore';
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
  const { deleteAgent } = useAgentStore();
  
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [modelFilter, setModelFilter] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [errors, setErrors] = useState<{ model?: string; maxTokens?: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeModels = getActiveModels();

  useEffect(() => {
    if (agent) {
      setModel(agent.model || '');
      setTemperature(agent.temperature ?? 0.7);
      setTopP(agent.top_p ?? 0.9);
      setMaxTokens(agent.max_tokens ?? 4096);
      setModelFilter('');
      setErrors({});
    }
  }, [agent]);

  const filteredModels = activeModels.filter((m) =>
    m.name.toLowerCase().includes(modelFilter.toLowerCase()) || 
    m.model_id.toLowerCase().includes(modelFilter.toLowerCase())
  );

  const validate = useCallback((): boolean => {
    const newErrors: { model?: string; maxTokens?: string } = {};

    if (!model.trim()) {
      newErrors.model = t('agents.modelRequired');
    }

    if (maxTokens < 1 || maxTokens > 100000) {
      newErrors.maxTokens = t('agents.maxTokensRange');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [model, maxTokens, t]);

  const handleSave = async () => {
    if (!validate() || !agent) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.trim(),
          temperature,
          top_p: topP,
          max_tokens: maxTokens,
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

  const handleDelete = async () => {
    if (!agent) return;
    if (!window.confirm(t('agents.deleteConfirm'))) return;

    setIsDeleting(true);
    try {
      await deleteAgent(agent.id);
      onClose();
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert(t('agents.deleteFailed'));
    } finally {
      setIsDeleting(false);
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
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        onKeyDown={handleKeyDown}
      />

      <div
        className="fixed right-0 top-0 h-full w-full max-w-md bg-[var(--color-bg-secondary)] shadow-2xl z-50 flex flex-col"
        onKeyDown={handleKeyDown}
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
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-secondary)]"
            aria-label={t('common.close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
              {t('agents.model')}
            </label>
            <div className="relative">
              <input
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                {t('agents.temperature')}
              </label>
              <span className="text-sm font-mono text-indigo-500">
                {temperature.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-[var(--color-bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
              <span>0</span>
              <span>2</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                {t('agents.topP')}
              </label>
              <span className="text-sm font-mono text-indigo-500">
                {topP.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full h-2 bg-[var(--color-bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
              <span>0</span>
              <span>1</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
              {t('agents.maxTokens')}
            </label>
            <input
              type="number"
              min="1"
              max="100000"
              value={maxTokens}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setMaxTokens(isNaN(val) ? 4096 : val);
              }}
              className={`w-full px-4 py-2.5 rounded-lg border ${
                errors.maxTokens
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-[var(--color-border)]'
              } bg-[var(--color-bg-primary)] text-[var(--color-text)] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all`}
            />
            {errors.maxTokens && (
              <p className="mt-1 text-sm text-red-500">{errors.maxTokens}</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--color-border)] flex gap-3 justify-between bg-[var(--color-bg-secondary)]">
          <div>
            {agent?.source === 'ui_created' && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
                className="px-4 py-2.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {isDeleting ? '...' : t('common.delete')}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
