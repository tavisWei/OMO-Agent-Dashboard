import { useTranslation } from 'react-i18next';
import { StatusBadge } from './StatusBadge';
import type { AgentWithUsage } from '../types';

interface AgentCardProps {
  agent: AgentWithUsage;
  onEdit?: (agent: AgentWithUsage) => void;
}

const AGENT_ICONS: Record<string, string> = {
  'gpt-4': '🤖',
  'gpt-3.5': '🤖',
  'claude': '🧠',
  'gemini': '✨',
  'default': '🔧',
};

function getAgentIcon(model: string): string {
  const lowerModel = model.toLowerCase();
  for (const [key, icon] of Object.entries(AGENT_ICONS)) {
    if (lowerModel.includes(key)) return icon;
  }
  return AGENT_ICONS.default;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

export function AgentCard({ agent, onEdit }: AgentCardProps) {
  const { t } = useTranslation();
  const icon = getAgentIcon(agent.model);

  return (
    <div className="group relative bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100">{agent.name}</h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                agent.source === 'omo_config' 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' 
                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/20'
              }`}>
                {agent.source === 'omo_config' ? 'OMO' : 'Custom'}
              </span>
            </div>
            <StatusBadge status={agent.status} />
          </div>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(agent)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-all duration-200"
            aria-label={t('agents.edit')}
            title={t('agents.edit')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{t('agents.model')}</span>
          <span className="text-slate-300 font-mono text-xs bg-slate-900/50 px-2 py-0.5 rounded">
            {agent.model}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{t('agents.tokens')}</span>
          <span className="text-slate-300 font-medium">
            {formatTokens(agent.totalTokens)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{t('agents.cost')}</span>
          <span className="text-emerald-400 font-medium">
            ${agent.totalCost.toFixed(4)}
          </span>
        </div>
      </div>

      {agent.last_heartbeat && (
        <div className="mt-3 pt-3 border-t border-slate-700/30">
          <span className="text-xs text-slate-500">
            {t('agents.lastActive')}: {new Date(agent.last_heartbeat).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

export default AgentCard;
