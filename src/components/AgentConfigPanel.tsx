import { useState, useEffect, useCallback } from 'react';

interface Agent {
  id: number;
  name: string;
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
}

interface AgentConfigPanelProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const AVAILABLE_MODELS = [
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-3.5-turbo',
  'claude-opus-4',
  'claude-sonnet-4',
  'claude-haiku-3',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
];

export default function AgentConfigPanel({
  agent,
  isOpen,
  onClose,
  onSave,
}: AgentConfigPanelProps) {
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [modelFilter, setModelFilter] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [errors, setErrors] = useState<{ model?: string; maxTokens?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

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

  const filteredModels = AVAILABLE_MODELS.filter((m) =>
    m.toLowerCase().includes(modelFilter.toLowerCase())
  );

  const validate = useCallback((): boolean => {
    const newErrors: { model?: string; maxTokens?: string } = {};

    if (!model.trim()) {
      newErrors.model = '模型不能为空';
    }

    if (maxTokens < 1 || maxTokens > 100000) {
      newErrors.maxTokens = 'Max Tokens 必须在 1-100000 之间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [model, maxTokens]);

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
      alert('保存失败，请重试');
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
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        onKeyDown={handleKeyDown}
      />

      <div
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            编辑智能体: {agent?.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="关闭"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              模型
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
                placeholder="搜索或选择模型..."
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  errors.model
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all`}
              />
              {errors.model && (
                <p className="mt-1 text-sm text-red-500">{errors.model}</p>
              )}

              {showModelDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredModels.length > 0 ? (
                    filteredModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setModel(m);
                          setModelFilter('');
                          setShowModelDropdown(false);
                          setErrors((prev) => ({ ...prev, model: undefined }));
                        }}
                        className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          model === m
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                      未找到匹配的模型
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              可用模型: {AVAILABLE_MODELS.join(', ')}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Temperature
              </label>
              <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
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
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>0</span>
              <span>2</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              控制输出的随机性。较低的值使输出更确定性，较高的值使输出更有创意。
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Top P
              </label>
              <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
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
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>0</span>
              <span>1</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              核采样阈值。较低的值只保留最可能的 token，较高的值允许更多样化的输出。
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Max Tokens
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
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all`}
            />
            {errors.maxTokens && (
              <p className="mt-1 text-sm text-red-500">{errors.maxTokens}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              单次生成的最大 token 数量 (1-100000)
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                保存中...
              </>
            ) : (
              '保存配置'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
