import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useModelStore } from '../stores/modelStore';
import { EmptyState } from './EmptyState';
import type { Model } from '../types';

export function ModelLibrary() {
  const { t } = useTranslation();
  const { models, isLoading, error, fetchModels, createModel, updateModel, deleteModel } = useModelStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [provider, setProvider] = useState('openai');
  const [modelId, setModelId] = useState('');
  const [description, setDescription] = useState('');
  const [pricingInput, setPricingInput] = useState(0);
  const [pricingOutput, setPricingOutput] = useState(0);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleOpenDialog = (model?: Model) => {
    if (model) {
      setEditingModel(model);
      setName(model.name);
      setProvider(model.provider);
      setModelId(model.model_id);
      setDescription(model.description || '');
      setPricingInput(model.pricing_input);
      setPricingOutput(model.pricing_output);
      setMaxTokens(model.max_tokens);
      setIsActive(model.is_active);
    } else {
      setEditingModel(null);
      setName('');
      setProvider('openai');
      setModelId('');
      setDescription('');
      setPricingInput(0);
      setPricingOutput(0);
      setMaxTokens(4096);
      setIsActive(true);
    }
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingModel(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !modelId.trim()) {
      setFormError(t('models.requiredFields'));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const modelData = {
        name: name.trim(),
        provider,
        model_id: modelId.trim(),
        description: description.trim(),
        pricing_input: pricingInput,
        pricing_output: pricingOutput,
        max_tokens: maxTokens,
        is_active: isActive,
      };

      if (editingModel) {
        await updateModel(editingModel.id, modelData);
      } else {
        await createModel(modelData);
      }
      handleCloseDialog();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('models.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('models.deleteConfirm'))) return;
    
    setDeleteError(null);
    try {
      await deleteModel(id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('models.deleteError'));
      // Clear error after 3 seconds
      setTimeout(() => setDeleteError(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('models.title')}</h1>
        <button
          type="button"
          onClick={() => handleOpenDialog()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('models.addModel')}
        </button>
      </div>

      {deleteError && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400">
          {deleteError}
        </div>
      )}

      {isLoading && models.length === 0 ? (
        <p className="text-[var(--color-text-secondary)]">{t('common.loading')}</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : models.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          }
          title={t('models.noModels')}
          description={t('models.addToStart')}
          action={
            <button
              type="button"
              onClick={() => handleOpenDialog()}
              className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('models.addModel')}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <div key={model.id} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-5 relative group">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-[var(--color-text)] text-lg">{model.name}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] font-mono mt-1">{model.model_id}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  model.is_active 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                    : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                }`}>
                  {model.is_active ? t('models.active') : t('models.inactive')}
                </span>
              </div>
              
              <div className="space-y-2 mt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">{t('models.provider')}</span>
                  <span className="text-[var(--color-text)] capitalize">{model.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">{t('models.maxTokens')}</span>
                  <span className="text-[var(--color-text)]">{model.max_tokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">{t('models.pricingInput')}</span>
                  <span className="text-[var(--color-text)]">${model.pricing_input}/1M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">{t('models.pricingOutput')}</span>
                  <span className="text-[var(--color-text)]">${model.pricing_output}/1M</span>
                </div>
              </div>

              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-[var(--color-bg-secondary)] pl-2">
                <button
                  onClick={() => handleOpenDialog(model)}
                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded transition-colors"
                  title={t('common.edit')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(model.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                  title={t('common.delete')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseDialog} />
          <div className="relative bg-[var(--color-bg-secondary)] rounded-xl shadow-2xl w-full max-w-md mx-4 border border-[var(--color-border)] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                {editingModel ? t('models.editModel') : t('models.addModel')}
              </h2>
              <button onClick={handleCloseDialog} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <form id="model-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    {t('models.name')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. GPT-4 Turbo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    {t('models.provider')}
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    {t('models.modelId')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    placeholder="e.g. gpt-4-turbo-preview"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    {t('models.description')}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                      {t('models.pricingInput')} ($/1M)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricingInput}
                      onChange={(e) => setPricingInput(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                      {t('models.pricingOutput')} ($/1M)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricingOutput}
                      onChange={(e) => setPricingOutput(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    {t('models.maxTokens')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
                    className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="is-active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-[var(--color-bg-primary)] border-[var(--color-border)] rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="is-active" className="ml-2 text-sm font-medium text-[var(--color-text)]">
                    {t('models.isActive')}
                  </label>
                </div>

                {formError && (
                  <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
                    {formError}
                  </div>
                )}
              </form>
            </div>

            <div className="p-5 border-t border-[var(--color-border)] flex justify-end gap-3 bg-[var(--color-bg-secondary)] rounded-b-xl">
              <button
                type="button"
                onClick={handleCloseDialog}
                className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                form="model-form"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isSubmitting && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
