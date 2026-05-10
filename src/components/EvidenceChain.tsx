import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import type { PartRow, PartData, PartType } from '../types/opencode';

interface EvidenceChainProps {
  parts: PartRow[];
}

function safeParsePartData(raw: string): PartData | null {
  try {
    const parsed = JSON.parse(raw) as PartData;
    if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

const partTypeLabels: Record<PartType, string> = {
  thinking: 'Thinking',
  tool_call: 'Tool Call',
  tool_result: 'Tool Result',
  text: 'Text',
  file: 'File',
  step_start: 'Step Start',
};

const partTypeColors: Record<PartType, string> = {
  thinking: 'border-slate-500/40 bg-slate-800/30',
  tool_call: 'border-blue-500/40 bg-blue-500/10',
  tool_result: 'border-green-500/40 bg-green-500/10',
  text: 'border-slate-600/40 bg-slate-800/20',
  file: 'border-purple-500/40 bg-purple-500/10',
  step_start: 'border-amber-500/40 bg-amber-500/10',
};

const partTypeIcons: Record<PartType, string> = {
  thinking: '🧠',
  tool_call: '🔧',
  tool_result: '📋',
  text: '💬',
  file: '📄',
  step_start: '▶',
};

function ThinkingPanel({ data }: { data: PartData }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const content = data.thinking ?? '(empty)';

  return (
    <div className="rounded-lg border border-slate-500/30 bg-slate-800/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-400 hover:bg-slate-700/30 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
          aria-hidden="true" focusable="false"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="flex-1">{t('evidence.thinking')}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <pre className="text-xs text-slate-400 whitespace-pre-wrap break-words font-mono leading-relaxed">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

function ToolCallCard({ data }: { data: PartData }) {
  const tool = data.tool ?? 'unknown';
  const inputSummary = data.input
    ? JSON.stringify(data.input).slice(0, 200) + (JSON.stringify(data.input).length > 200 ? '…' : '')
    : null;

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-mono font-semibold text-blue-400">{tool}</span>
      </div>
      {inputSummary && (
        <pre className="text-xs text-slate-400 whitespace-pre-wrap break-words font-mono leading-relaxed opacity-80">
          {inputSummary}
        </pre>
      )}
    </div>
  );
}

function ToolResultCard({ data }: { data: PartData }) {
  const isError = data.isError === true;
  const output = data.output ?? '(no output)';
  const outputPreview = output.length > 500 ? output.slice(0, 500) + '…' : output;

  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        isError
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-green-500/30 bg-green-500/5'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`text-xs font-mono font-semibold ${isError ? 'text-red-400' : 'text-green-400'}`}
        >
          {isError ? 'Error' : 'Result'}
        </span>
        {data.tool_id && (
          <span className="text-[10px] text-slate-500 font-mono">{data.tool_id}</span>
        )}
      </div>
      <pre className="text-xs text-slate-400 whitespace-pre-wrap break-words font-mono leading-relaxed">
        {outputPreview}
      </pre>
    </div>
  );
}

function TextBlock({ data }: { data: PartData }) {
  const content = data.text ?? data.content ?? '';
  if (!content) {
    return (
      <div className="text-xs text-slate-500 italic px-1">(empty text block)</div>
    );
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none text-[var(--color-text-secondary)]">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function FileCard({ data }: { data: PartData }) {
  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-semibold text-purple-400">
          {data.path ?? '(unknown)'}
        </span>
      </div>
      {data.content && (
        <pre className="mt-1 text-xs text-slate-400 whitespace-pre-wrap break-words font-mono leading-relaxed line-clamp-6">
          {data.content}
        </pre>
      )}
    </div>
  );
}

function StepStartBanner({ data }: { data: PartData }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-center">
      <span className="text-xs font-medium text-amber-400">
        {data.label ?? 'Step'}
      </span>
    </div>
  );
}

function PartNode({ part }: { part: PartRow }) {
  const parsed = safeParsePartData(part.data);
  const type = parsed?.type ?? 'text';
  const time = new Date(part.time_created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex gap-3 group">
      {/* Timeline connector */}
      <div className="flex flex-col items-center shrink-0 w-8">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${parsed?.isError ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-400'} group-hover:scale-110 transition-transform`}>
          {partTypeIcons[type] ?? '•'}
        </div>
        <div className="flex-1 w-px bg-slate-700/50 my-1" />
      </div>

      {/* Part content */}
      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            {partTypeLabels[type] ?? type}
          </span>
          <span className="text-[10px] text-slate-600">{time}</span>
        </div>

        <div className={partTypeColors[type] ?? 'border-slate-600/40 bg-slate-800/20'}>
          {type === 'thinking' && <ThinkingPanel data={parsed!} />}
          {type === 'tool_call' && <ToolCallCard data={parsed!} />}
          {type === 'tool_result' && <ToolResultCard data={parsed!} />}
          {type === 'text' && <TextBlock data={parsed!} />}
          {type === 'file' && <FileCard data={parsed!} />}
          {type === 'step_start' && <StepStartBanner data={parsed!} />}
        </div>
      </div>
    </div>
  );
}

export function EvidenceChain({ parts }: EvidenceChainProps) {
  if (!parts || parts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 space-y-3 text-[var(--color-text-secondary)]">
        <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-xs">No evidence chain available</span>
      </div>
    );
  }

  return (
    <div className="space-y-0 py-2">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Evidence Chain</h3>
        <span className="text-[10px] text-slate-500">{parts.length} part{parts.length !== 1 ? 's' : ''}</span>
      </div>
      {parts.map((part) => (
        <PartNode key={part.id} part={part} />
      ))}
    </div>
  );
}

export default EvidenceChain;
