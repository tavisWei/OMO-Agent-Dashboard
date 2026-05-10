import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

interface TokenStatsRow {
  day: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  total_cost: number;
}

type DaysRange = 7 | 30 | 90;

const RANGE_OPTIONS: { value: DaysRange; label: string }[] = [
  { value: 7, label: 'analytics.days7' },
  { value: 30, label: 'analytics.days30' },
  { value: 90, label: 'analytics.days90' },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

interface ModelDistRow {
  model: string;
  provider: string;
  calls: number;
  total_tokens: number;
  total_cost: number;
}

const cardCls = 'rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5';

const MODEL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4'];

export function AnalyticsPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<DaysRange>(7);
  const [data, setData] = useState<TokenStatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/analytics/token-stats?days=${range}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? 'Request failed');
        return res.json();
      })
      .then((rows: TokenStatsRow[]) => {
        if (!cancelled) setData(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  // --- Wave 4.2: Model/Provider distribution ---
  const [modelData, setModelData] = useState<ModelDistRow[]>([]);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setModelLoading(true);
    setModelError(null);

    fetch(`/api/analytics/model-distribution?days=${range}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? 'Request failed');
        return res.json();
      })
      .then((json: { rows: ModelDistRow[] }) => {
        if (!cancelled) setModelData(json.rows || []);
      })
      .catch((err) => {
        if (!cancelled) setModelError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => {
        if (!cancelled) setModelLoading(false);
      });

    return () => { cancelled = true; };
  }, [range]);

  const modelPieData = useMemo(() => {
    return modelData
      .filter((r) => r.total_tokens > 0)
      .map((r, i) => ({
        name: r.model || 'unknown',
        value: r.total_tokens,
        calls: r.calls,
        total_cost: r.total_cost,
        color: MODEL_COLORS[i % MODEL_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [modelData]);

  const providerBarData = useMemo(() => {
    const agg = new Map<string, { calls: number; total_tokens: number; total_cost: number }>();
    for (const row of modelData) {
      const key = row.provider || 'unknown';
      const existing = agg.get(key) || { calls: 0, total_tokens: 0, total_cost: 0 };
      existing.calls += row.calls;
      existing.total_tokens += row.total_tokens;
      existing.total_cost += row.total_cost;
      agg.set(key, existing);
    }
    return Array.from(agg.entries())
      .map(([provider, s]) => ({ provider, ...s }))
      .sort((a, b) => b.total_tokens - a.total_tokens);
  }, [modelData]);

  const stats = useMemo(() => {
    if (data.length === 0) {
      return { totalTokens: 0, totalCost: 0, dailyAvg: 0, peak: 0 };
    }
    const totalTokens = data.reduce((sum, row) => sum + row.total_tokens, 0);
    const totalCost = data.reduce((sum, row) => sum + row.total_cost, 0);
    const dailyAvg = Math.round(totalTokens / data.length);
    const peak = Math.max(...data.map((row) => row.total_tokens));
    return { totalTokens, totalCost, dailyAvg, peak };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('analytics.title')}</h1>
        <div className="flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRange(opt.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === opt.value
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              {t(opt.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cardCls}>
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">{t('analytics.totalTokens')}</div>
          <div className="text-2xl font-bold text-[var(--color-text)]">
            {loading ? '...' : formatNumber(stats.totalTokens)}
          </div>
        </div>
        <div className={cardCls}>
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">{t('analytics.totalCost')}</div>
          <div className="text-2xl font-bold text-[var(--color-text)]">
            {loading ? '...' : formatCost(stats.totalCost)}
          </div>
        </div>
        <div className={cardCls}>
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">{t('analytics.dailyAvg')}</div>
          <div className="text-2xl font-bold text-[var(--color-text)]">
            {loading ? '...' : formatNumber(stats.dailyAvg)}
          </div>
        </div>
        <div className={cardCls}>
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">{t('analytics.peakTokens')}</div>
          <div className="text-2xl font-bold text-[var(--color-text)]">
            {loading ? '...' : formatNumber(stats.peak)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className={cardCls}>
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">{t('analytics.tokenTrends')}</h2>
        {loading ? (
          <div className="h-80 flex items-center justify-center text-[var(--color-text-secondary)]">
            {t('common.loading')}
          </div>
        ) : data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-[var(--color-text-secondary)]">
            {t('analytics.noData')}
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="day"
                  stroke="var(--color-text-secondary)"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v + 'T00:00:00');
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis
                  stroke="var(--color-text-secondary)"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatNumber}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text)',
                  }}
                  formatter={(value) => [formatNumber(Number(value)), undefined]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="input_tokens"
                  name={t('analytics.inputTokens')}
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="output_tokens"
                  name={t('analytics.outputTokens')}
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Wave 4.2: Model/Provider distribution */}
      {/* Model Distribution Pie Chart */}
      <div className={cardCls}>
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">{t('analytics.modelDist')}</h2>
        {modelLoading ? (
          <div className="h-80 flex items-center justify-center text-[var(--color-text-secondary)]">
            {t('common.loading')}
          </div>
        ) : modelError ? (
          <div className="h-80 flex items-center justify-center text-red-400 text-sm">
            {modelError}
          </div>
        ) : modelPieData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-[var(--color-text-secondary)]">
            {t('analytics.noModelData')}
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modelPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {modelPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text)',
                  }}
                  formatter={(value: any) => [formatNumber(Number(value)), t('analytics.tokens')]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Provider Distribution Bar Chart */}
      <div className={cardCls}>
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">{t('analytics.providerDist')}</h2>
        {modelLoading ? (
          <div className="h-80 flex items-center justify-center text-[var(--color-text-secondary)]">
            {t('common.loading')}
          </div>
        ) : modelError ? (
          <div className="h-80 flex items-center justify-center text-red-400 text-sm">
            {modelError}
          </div>
        ) : providerBarData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-[var(--color-text-secondary)]">
            {t('analytics.noProviderData')}
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={providerBarData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="provider" stroke="var(--color-text-secondary)" tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--color-text-secondary)" tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text)',
                  }}
                  formatter={(value: any, name: any) => {
                    const n = Number(value);
                    const key = String(name);
                    if (key === 'calls') return [n.toLocaleString(), t('analytics.calls')];
                    if (key === 'total_cost') return [formatCost(n), t('analytics.cost')];
                    return [formatNumber(n), t('analytics.tokens')];
                  }}
                />
                <Legend />
                <Bar dataKey="calls" fill="#3b82f6" name={t('analytics.calls')} />
                <Bar dataKey="total_tokens" fill="#10b981" name={t('analytics.tokens')} />
                <Bar dataKey="total_cost" fill="#f59e0b" name={t('analytics.cost')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Model Detail Table */}
      {modelData.length > 0 && (
        <div className={cardCls}>
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-4">{t('analytics.detailBreakdown')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2 px-3 text-[var(--color-text-secondary)] font-medium">{t('analytics.model')}</th>
                  <th className="text-left py-2 px-3 text-[var(--color-text-secondary)] font-medium">{t('analytics.provider')}</th>
                  <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium">{t('analytics.calls')}</th>
                  <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium">{t('analytics.tokens')}</th>
                  <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium">{t('analytics.cost')}</th>
                </tr>
              </thead>
              <tbody>
                {modelData.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="py-2 px-3 text-[var(--color-text)]">{row.model || 'unknown'}</td>
                    <td className="py-2 px-3 text-[var(--color-text-secondary)]">{row.provider || 'unknown'}</td>
                    <td className="py-2 px-3 text-[var(--color-text)] text-right">{row.calls.toLocaleString()}</td>
                    <td className="py-2 px-3 text-[var(--color-text)] text-right">{formatNumber(row.total_tokens)}</td>
                    <td className="py-2 px-3 text-[var(--color-text)] text-right">{formatCost(row.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
