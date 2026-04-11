import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type {
  DateRange,
  CostSummaryResponse,
  AgentCostSummary,
  DailyCostData,
  AgentDistributionData,
  CostRecord
} from '../types';

const API_BASE = 'http://localhost:3001/api';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316'];

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  return `$${cost.toFixed(4)}`;
}

export function CostOverview() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<CostSummaryResponse | null>(null);
  const [records, setRecords] = useState<CostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCostData();
  }, [dateRange, customStart, customEnd]);

  async function fetchCostData() {
    setLoading(true);
    try {
      const rangeParam = dateRange === 'custom' ? 'month' : dateRange;
      const [summaryRes, recordsRes] = await Promise.all([
        fetch(`${API_BASE}/cost-records/summary?dateRange=${rangeParam}`),
        fetch(`${API_BASE}/cost-records?dateRange=${rangeParam}`)
      ]);

      if (summaryRes.ok && recordsRes.ok) {
        const summaryData = await summaryRes.json();
        const recordsData = await recordsRes.json();
        setData(summaryData);
        setRecords(recordsData);
      }
    } catch (error) {
      console.error('Failed to fetch cost data:', error);
    } finally {
      setLoading(false);
    }
  }

  const dailyData = useMemo((): DailyCostData[] => {
    if (!records.length) return [];

    const grouped: Record<string, DailyCostData> = {};

    records.forEach(record => {
      const date = new Date(record.recorded_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      if (!grouped[date]) {
        grouped[date] = {
          date,
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          cost: 0
        };
      }

      grouped[date].input_tokens += record.input_tokens;
      grouped[date].output_tokens += record.output_tokens;
      grouped[date].total_tokens += record.input_tokens + record.output_tokens;
      grouped[date].cost += record.cost;
    });

    return Object.values(grouped).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }, [records]);

  const agentDistribution = useMemo((): AgentDistributionData[] => {
    if (!data?.by_agent.length) return [];

    const totalTokens = data.summary.total_tokens;

    return data.by_agent
      .filter(agent => agent.total_tokens > 0)
      .map(agent => ({
        name: agent.agent_name,
        value: agent.total_tokens,
        cost: agent.total_cost,
        percentage: totalTokens > 0 ? ((agent.total_tokens / totalTokens) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  function exportToCSV() {
    if (!records.length) return;

    const headers = ['Date', 'Agent ID', 'Model', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Cost'];
    const rows = records.map(record => [
      new Date(record.recorded_at).toLocaleDateString(),
      record.agent_id ?? 'N/A',
      record.model,
      record.input_tokens,
      record.output_tokens,
      record.input_tokens + record.output_tokens,
      record.cost.toFixed(6)
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cost-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('cost.title')}</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-1">
            {(['today', 'week', 'month', 'custom'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                {range === 'today' ? t('cost.today') : range === 'week' ? t('cost.thisWeek') : range === 'month' ? t('cost.thisMonth') : t('cost.custom')}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md text-[var(--color-text)]"
              />
              <span className="text-[var(--color-text-secondary)]">{t('cost.to')}</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md text-[var(--color-text)]"
              />
            </div>
          )}

          <button
            onClick={exportToCSV}
            disabled={!records.length}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('cost.exportCSV')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">{t('cost.totalTokens')}</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">
            {loading ? '—' : formatTokens(data?.summary.total_tokens ?? 0)}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {t('cost.inOut', { input: formatTokens(data?.summary.total_input_tokens ?? 0), output: formatTokens(data?.summary.total_output_tokens ?? 0) })}
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">{t('cost.totalCost')}</p>
          <p className="text-2xl font-bold text-emerald-400">
            {loading ? '—' : formatCost(data?.summary.total_cost ?? 0)}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {formatCost(data?.summary.total_cost ?? 0)} {t('cost.totalSpent')}
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">{t('cost.apiCalls')}</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">
            {loading ? '—' : data?.summary.total_api_calls ?? 0}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {t('cost.requestsMade')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t('cost.dailyUsage')}</h3>
          <div className="h-64">
            {loading ? (
              <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
                {t('cost.loading')}
              </div>
            ) : dailyData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)]">
                <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p>{t('cost.noData')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-text-secondary)" fontSize={12} />
                  <YAxis stroke="var(--color-text-secondary)" fontSize={12} tickFormatter={formatTokens} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text)'
                    }}
                    formatter={(value: any) => [formatTokens(value as number), 'Tokens']}
                  />
                  <Bar dataKey="input_tokens" stackId="a" fill="#6366f1" name={t('cost.input')} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="output_tokens" stackId="a" fill="#a855f7" name={t('cost.output')} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">{t('cost.agentDistribution')}</h3>
          <div className="h-64">
            {loading ? (
              <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
                {t('cost.loading')}
              </div>
            ) : agentDistribution.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)]">
                <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                </svg>
                <p>{t('cost.noData')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, payload }: any) => `${name} (${payload.percentage}%)`}
                    labelLine={false}
                  >
                    {agentDistribution.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text)'
                    }}
                    formatter={(value: any, _name: any, props: any) => [formatTokens(value as number), `${t('cost.estCost')}: ${formatCost(props.payload.cost)}`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] overflow-hidden">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">{t('cost.agentBreakdown')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-bg-tertiary)]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('cost.agent')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('cost.model')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('cost.inputTokens')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('cost.outputTokens')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('cost.totalTokens')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('cost.estCost')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('cost.apiCalls')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t('cost.share')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-[var(--color-text-secondary)]">
                    {t('cost.loading')}
                  </td>
                </tr>
              ) : data?.by_agent.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-[var(--color-text-secondary)]">
                    {t('cost.noData')}
                  </td>
                </tr>
              ) : (
                data?.by_agent.map((agent: AgentCostSummary, index: number) => {
                  const percentage = data.summary.total_tokens > 0
                    ? ((agent.total_tokens / data.summary.total_tokens) * 100).toFixed(1)
                    : '0';
                  return (
                    <tr key={agent.agent_id} className="hover:bg-[var(--color-bg-tertiary)] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium text-[var(--color-text)]">{agent.agent_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded">
                          {agent.model}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-[var(--color-text)]">
                        {formatTokens(agent.total_input_tokens)}
                      </td>
                      <td className="px-5 py-4 text-right text-[var(--color-text)]">
                        {formatTokens(agent.total_output_tokens)}
                      </td>
                      <td className="px-5 py-4 text-right text-[var(--color-text)] font-medium">
                        {formatTokens(agent.total_tokens)}
                      </td>
                      <td className="px-5 py-4 text-right text-emerald-400 font-medium">
                        {formatCost(agent.total_cost)}
                      </td>
                      <td className="px-5 py-4 text-right text-[var(--color-text)]">
                        {agent.api_calls}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                              }}
                            />
                          </div>
                          <span className="text-sm text-[var(--color-text-secondary)] w-12 text-right">
                            {percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CostOverview;