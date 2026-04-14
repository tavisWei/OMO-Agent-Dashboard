import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgentStore } from '../stores/agentStore';
import { useModelStore } from '../stores/modelStore';
import { useProjectStore } from '../stores/projectStore';

interface NewAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewAgentDialog({ isOpen, onClose, onCreated }: NewAgentDialogProps) {
  const { t } = useTranslation();
  const { createAgent } = useAgentStore();
  const { fetchModels, getActiveModels } = useModelStore();
  const { projects, fetchProjects } = useProjectStore();

  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [modelId, setModelId] = useState<number | null>(null);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setProjectId(null);
      setTemperature(0.7);
      setTopP(0.9);
      setMaxTokens(4096);
      setError(null);
      setIsSubmitting(false);
      fetchModels();
      fetchProjects();
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [isOpen, fetchModels, fetchProjects]);

  const activeModels = getActiveModels();

  useEffect(() => {
    if (isOpen && activeModels.length > 0 && modelId === null) {
      setModelId(activeModels[0].id);
    }
  }, [isOpen, activeModels, modelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(t('agents.nameRequired'));
      return;
    }

    if (!modelId) {
      setError(t('agents.modelRequired'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const selectedModel = activeModels.find(m => m.id === modelId);
      await createAgent({
        name: name.trim(),
        project_id: projectId,
        model_id: modelId,
        model: selectedModel?.model_id || '',
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('agents.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-bg-secondary)] rounded-xl shadow-2xl w-full max-w-md mx-4 border border-[var(--color-border)] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">{t('agents.newAgent')}</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <form id="new-agent-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                {t('agents.name')} <span className="text-red-400">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Research Assistant"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                {t('projects.title')}
              </label>
              <select
                value={projectId || ''}
                onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              >
                <option value="">{t('projects.select')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                {t('agents.model')} <span className="text-red-400">*</span>
              </label>
              <select
                value={modelId || ''}
                onChange={(e) => setModelId(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              >
                {activeModels.length === 0 && <option value="">{t('models.noModels')}</option>}
                {activeModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.model_id})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  {t('agents.temperature')}
                </label>
                <span className="text-sm font-mono text-indigo-500">{temperature.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-[var(--color-bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-indigo-600"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  {t('agents.topP')}
                </label>
                <span className="text-sm font-mono text-indigo-500">{topP.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full h-2 bg-[var(--color-bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-indigo-600"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                {t('agents.maxTokens')}
              </label>
              <input
                type="number"
                min="1"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
                className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </form>
        </div>

        <div className="p-5 border-t border-[var(--color-border)] flex justify-end gap-3 bg-[var(--color-bg-secondary)] rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="new-agent-form"
            disabled={isSubmitting || !name.trim() || !modelId}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {t('common.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
