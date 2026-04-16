import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardStore, type ConfigEntry } from '../stores/dashboardStore';

type ProviderDetail = { name: string; npm: string; baseURL: string; apiKeyMasked: string };

export function ModelLibrary() {
  const { t } = useTranslation();
  const { config, configLoading, configError, fetchConfig } = useDashboardStore();

  const [assignTarget, setAssignTarget] = useState<{ provider: string; model: string } | null>(null);
  const [assignType, setAssignType] = useState<'agent' | 'category'>('agent');
  const [assignKey, setAssignKey] = useState('');
  const [assignVariant, setAssignVariant] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [addModelProvider, setAddModelProvider] = useState('');
  const [addModelId, setAddModelId] = useState('');
  const [addModelName, setAddModelName] = useState('');
  const [addModelSaving, setAddModelSaving] = useState(false);

  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newPKey, setNewPKey] = useState('');
  const [newPName, setNewPName] = useState('');
  const [newPNpm, setNewPNpm] = useState('');
  const [newPBaseURL, setNewPBaseURL] = useState('');
  const [newPApiKey, setNewPApiKey] = useState('');
  const [addProviderSaving, setAddProviderSaving] = useState(false);

  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editPName, setEditPName] = useState('');
  const [editPNpm, setEditPNpm] = useState('');
  const [editPBaseURL, setEditPBaseURL] = useState('');
  const [editPApiKey, setEditPApiKey] = useState('');
  const [editProviderSaving, setEditProviderSaving] = useState(false);

  const [opMsg, setOpMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const targets: ConfigEntry[] = assignType === 'agent' ? (config?.agents ?? []) : (config?.categories ?? []);
  const details: Record<string, ProviderDetail> = config?.providerDetails ?? {};

  const doFetch = async (url: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
  };

  const handleAssign = async () => {
    if (!assignTarget || !assignKey) return;
    setSaving(true); setSaveMsg(null);
    try {
      const ep = assignType === 'agent'
        ? `/api/config/agents/${encodeURIComponent(assignKey)}`
        : `/api/config/categories/${encodeURIComponent(assignKey)}`;
      await doFetch(ep, 'PUT', { model: assignTarget.model, variant: assignVariant || undefined });
      setSaveMsg(t('common.success'));
      setAssignTarget(null); setAssignKey(''); setAssignVariant('');
      await fetchConfig();
    } catch (e) { setSaveMsg(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleAddModel = async () => {
    if (!addModelProvider || !addModelId) return;
    setAddModelSaving(true); setOpMsg(null);
    try {
      await doFetch(`/api/config/models/${encodeURIComponent(addModelProvider)}`, 'POST', { modelId: addModelId.trim(), name: addModelName.trim() || addModelId.trim() });
      setAddModelId(''); setAddModelName(''); setOpMsg(t('common.success'));
      await fetchConfig();
    } catch (e) { setOpMsg(e instanceof Error ? e.message : 'Error'); }
    finally { setAddModelSaving(false); }
  };

  const handleDeleteModel = async (provider: string, modelId: string) => {
    const key = `${provider}/${modelId}`;
    setDeleting(key);
    try { await doFetch(`/api/config/models/${encodeURIComponent(provider)}/${encodeURIComponent(modelId)}`, 'DELETE'); await fetchConfig(); }
    catch { /* noop */ }
    finally { setDeleting(null); }
  };

  const handleAddProvider = async () => {
    if (!newPKey || !newPBaseURL || !newPApiKey) return;
    setAddProviderSaving(true); setOpMsg(null);
    try {
      await doFetch('/api/config/providers', 'POST', { key: newPKey.trim(), name: newPName.trim() || undefined, npm: newPNpm.trim() || undefined, baseURL: newPBaseURL.trim(), apiKey: newPApiKey.trim() });
      setShowAddProvider(false); setNewPKey(''); setNewPName(''); setNewPNpm(''); setNewPBaseURL(''); setNewPApiKey('');
      setOpMsg(t('common.success'));
      await fetchConfig();
    } catch (e) { setOpMsg(e instanceof Error ? e.message : 'Error'); }
    finally { setAddProviderSaving(false); }
  };

  const startEditProvider = (key: string) => {
    const d = details[key];
    setEditingProvider(key);
    setEditPName(d?.name ?? '');
    setEditPNpm(d?.npm ?? '');
    setEditPBaseURL(d?.baseURL ?? '');
    setEditPApiKey('');
  };

  const handleEditProvider = async () => {
    if (!editingProvider) return;
    setEditProviderSaving(true); setOpMsg(null);
    try {
      const body: Record<string, string> = {};
      if (editPName) body.name = editPName;
      if (editPNpm) body.npm = editPNpm;
      if (editPBaseURL) body.baseURL = editPBaseURL;
      if (editPApiKey) body.apiKey = editPApiKey;
      await doFetch(`/api/config/providers/${encodeURIComponent(editingProvider)}`, 'PUT', body);
      setEditingProvider(null); setOpMsg(t('common.success'));
      await fetchConfig();
    } catch (e) { setOpMsg(e instanceof Error ? e.message : 'Error'); }
    finally { setEditProviderSaving(false); }
  };

  const handleDeleteProvider = async (key: string) => {
    setDeleting(`provider:${key}`);
    try { await doFetch(`/api/config/providers/${encodeURIComponent(key)}`, 'DELETE'); await fetchConfig(); }
    catch { /* noop */ }
    finally { setDeleting(null); }
  };

  const inputCls = 'block w-full px-2 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-sm text-[var(--color-text)]';
  const btnPrimary = 'px-3 py-1.5 rounded bg-[var(--color-accent)] text-white text-sm disabled:opacity-50';
  const btnSecondary = 'px-3 py-1.5 rounded border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('models.title')}</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">可视化管理 opencode.json — 供应商、模型、API 配置。</p>
        </div>
        <button type="button" onClick={() => setShowAddProvider(true)} className={btnPrimary}>+ 添加供应商</button>
      </div>

      {opMsg && <div className="text-xs text-[var(--color-text-secondary)] rounded border border-[var(--color-border)] px-3 py-2">{opMsg}</div>}

      {configLoading ? <p className="text-sm text-[var(--color-text-secondary)]">{t('common.loading')}</p>
       : configError ? <p className="text-sm text-red-500">{configError}</p>
       : !config ? <p className="text-sm text-[var(--color-text-secondary)]">{t('models.noModels')}</p>
       : (
        <>
          {showAddProvider && (
            <section className="rounded-xl border border-[var(--color-accent)] bg-[var(--color-bg-secondary)] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">添加供应商</h2>
              <div className="grid grid-cols-2 gap-3">
                <div><label htmlFor="np-key" className="text-xs text-[var(--color-text-secondary)]">Key *</label><input id="np-key" value={newPKey} onChange={e => setNewPKey(e.target.value)} placeholder="openai" className={inputCls} /></div>
                <div><label htmlFor="np-name" className="text-xs text-[var(--color-text-secondary)]">显示名称</label><input id="np-name" value={newPName} onChange={e => setNewPName(e.target.value)} placeholder="OpenAI" className={inputCls} /></div>
                <div><label htmlFor="np-npm" className="text-xs text-[var(--color-text-secondary)]">npm 包</label><input id="np-npm" value={newPNpm} onChange={e => setNewPNpm(e.target.value)} placeholder="@ai-sdk/openai" className={inputCls} /></div>
                <div><label htmlFor="np-url" className="text-xs text-[var(--color-text-secondary)]">Base URL *</label><input id="np-url" value={newPBaseURL} onChange={e => setNewPBaseURL(e.target.value)} placeholder="https://api.openai.com/v1" className={inputCls} /></div>
                <div className="col-span-2"><label htmlFor="np-apikey" className="text-xs text-[var(--color-text-secondary)]">API Key *</label><input id="np-apikey" value={newPApiKey} onChange={e => setNewPApiKey(e.target.value)} placeholder="sk-..." type="password" className={inputCls} /></div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleAddProvider} disabled={addProviderSaving || !newPKey || !newPBaseURL || !newPApiKey} className={btnPrimary}>{addProviderSaving ? t('common.saving') : t('common.save')}</button>
                <button type="button" onClick={() => setShowAddProvider(false)} className={btnSecondary}>{t('common.cancel')}</button>
              </div>
            </section>
          )}

          {assignTarget && (
            <section className="rounded-xl border border-[var(--color-accent)] bg-[var(--color-bg-secondary)] p-4 space-y-3">
              <div className="text-sm font-medium text-[var(--color-text)]">分配 <span className="font-mono text-[var(--color-accent)]">{assignTarget.model}</span></div>
              <div className="flex flex-wrap gap-3 items-end">
                <div><label htmlFor="assign-type" className="text-xs text-[var(--color-text-secondary)]">类型</label>
                  <select id="assign-type" value={assignType} onChange={e => { setAssignType(e.target.value as 'agent' | 'category'); setAssignKey(''); }} className={inputCls}>
                    <option value="agent">{t('agents.title')}</option><option value="category">Category</option>
                  </select></div>
                <div><label htmlFor="assign-key" className="text-xs text-[var(--color-text-secondary)]">目标</label>
                  <select id="assign-key" value={assignKey} onChange={e => setAssignKey(e.target.value)} className={inputCls}>
                    <option value="">选择...</option>{targets.map(e => <option key={e.key} value={e.key}>{e.key}</option>)}
                  </select></div>
                <div><label htmlFor="assign-variant" className="text-xs text-[var(--color-text-secondary)]">推理强度</label>
                  <select id="assign-variant" value={assignVariant} onChange={e => setAssignVariant(e.target.value)} className={inputCls}>
                    <option value="">默认</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="xhigh">xhigh</option>
                  </select></div>
                <button type="button" onClick={handleAssign} disabled={saving || !assignKey} className={btnPrimary}>{saving ? t('common.saving') : t('common.save')}</button>
                <button type="button" onClick={() => setAssignTarget(null)} className={btnSecondary}>{t('common.cancel')}</button>
              </div>
              {saveMsg && <div className="text-xs text-[var(--color-text-secondary)]">{saveMsg}</div>}
            </section>
          )}

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">{t('models.addModel')}</h2>
            <div className="flex flex-wrap gap-3 items-end">
              <div><label htmlFor="am-provider" className="text-xs text-[var(--color-text-secondary)]">{t('models.provider')}</label>
                <select id="am-provider" value={addModelProvider} onChange={e => setAddModelProvider(e.target.value)} className={inputCls}>
                  <option value="">选择...</option>{config.providers.map(p => <option key={p} value={p}>{p}</option>)}
                </select></div>
              <div><label htmlFor="am-id" className="text-xs text-[var(--color-text-secondary)]">{t('models.modelId')}</label>
                <input id="am-id" value={addModelId} onChange={e => setAddModelId(e.target.value)} placeholder="gpt-4o" className={inputCls} /></div>
              <div><label htmlFor="am-name" className="text-xs text-[var(--color-text-secondary)]">{t('models.name')}</label>
                <input id="am-name" value={addModelName} onChange={e => setAddModelName(e.target.value)} placeholder="GPT-4o" className={inputCls} /></div>
              <button type="button" onClick={handleAddModel} disabled={addModelSaving || !addModelProvider || !addModelId} className={btnPrimary}>{addModelSaving ? t('common.saving') : t('models.addModel')}</button>
            </div>
          </section>

          <div className="space-y-6">
            {Object.entries(config.providerModels ?? {}).map(([provider, models]) => {
              const d = details[provider];
              const isEditing = editingProvider === provider;
              return (
                <section key={provider} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-[var(--color-text)] capitalize">{d?.name || provider}</h2>
                      <div className="text-xs text-[var(--color-text-secondary)] space-y-0.5 mt-1">
                        <div>Key: {provider} · {models.length} 个模型</div>
                        {d?.npm && <div>npm: {d.npm}</div>}
                        {d?.baseURL && <div>URL: {d.baseURL}</div>}
                        {d?.apiKeyMasked && <div>API Key: {d.apiKeyMasked}</div>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => startEditProvider(provider)} className="text-xs text-[var(--color-accent)] hover:underline">{t('common.edit')}</button>
                      <button type="button" onClick={() => handleDeleteProvider(provider)} disabled={deleting === `provider:${provider}`}
                        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-30">{deleting === `provider:${provider}` ? '...' : t('common.delete')}</button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg-tertiary)] p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><label htmlFor={`ep-name-${provider}`} className="text-xs text-[var(--color-text-secondary)]">名称</label><input id={`ep-name-${provider}`} value={editPName} onChange={e => setEditPName(e.target.value)} className={inputCls} /></div>
                        <div><label htmlFor={`ep-npm-${provider}`} className="text-xs text-[var(--color-text-secondary)]">npm</label><input id={`ep-npm-${provider}`} value={editPNpm} onChange={e => setEditPNpm(e.target.value)} className={inputCls} /></div>
                        <div><label htmlFor={`ep-url-${provider}`} className="text-xs text-[var(--color-text-secondary)]">Base URL</label><input id={`ep-url-${provider}`} value={editPBaseURL} onChange={e => setEditPBaseURL(e.target.value)} className={inputCls} /></div>
                        <div><label htmlFor={`ep-key-${provider}`} className="text-xs text-[var(--color-text-secondary)]">新 API Key</label><input id={`ep-key-${provider}`} value={editPApiKey} onChange={e => setEditPApiKey(e.target.value)} type="password" placeholder="留空不修改" className={inputCls} /></div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={handleEditProvider} disabled={editProviderSaving} className={btnPrimary}>{editProviderSaving ? t('common.saving') : t('common.save')}</button>
                        <button type="button" onClick={() => setEditingProvider(null)} className={btnSecondary}>{t('common.cancel')}</button>
                      </div>
                    </div>
                  )}

                  {models.length === 0 ? (
                    <div className="text-xs text-[var(--color-text-secondary)]">暂无模型，请在上方添加。</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {models.map((model) => {
                        const dk = `${provider}/${model}`;
                        return (
                          <div key={model} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 flex items-start justify-between gap-2">
                            <button type="button" onClick={() => setAssignTarget({ provider, model: `${provider}/${model}` })} className="text-left flex-1 min-w-0">
                              <div className="font-medium text-[var(--color-text)] break-all text-sm">{model}</div>
                              <div className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">点击分配</div>
                            </button>
                            <button type="button" onClick={() => handleDeleteModel(provider, model)} disabled={deleting === dk}
                              className="text-xs text-red-400 hover:text-red-300 shrink-0 disabled:opacity-30" aria-label={`Delete ${model}`}>
                              {deleting === dk ? '...' : '✕'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
