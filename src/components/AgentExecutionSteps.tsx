import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { PartRow, PartData, PartType } from '../types/opencode';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AgentExecutionStepsProps {
  parts: PartRow[];
}

// ---------------------------------------------------------------------------
// Helpers (replicated from EvidenceChain.tsx patterns)
// ---------------------------------------------------------------------------

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

const partTypeColors: Record<PartType, string> = {
  thinking: 'border-slate-500 bg-slate-500',
  tool_call: 'border-blue-500 bg-blue-500',
  tool_result: 'border-green-500 bg-green-500',
  text: 'border-slate-400 bg-slate-400',
  file: 'border-purple-500 bg-purple-500',
  step_start: 'border-amber-500 bg-amber-500',
};

const partTypeLineColors: Record<PartType, string> = {
  thinking: 'border-slate-500/50',
  tool_call: 'border-blue-500/50',
  tool_result: 'border-green-500/50',
  text: 'border-slate-600/50',
  file: 'border-purple-500/50',
  step_start: 'border-amber-500/50',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepStartHeader({ data }: { data: PartData }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
      <span className="text-sm font-semibold text-amber-400">
        {data.label ?? 'Step'}
      </span>
    </div>
  );
}

function ThinkingPanel({ data }: { data: PartData }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
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
    ? JSON.stringify(data.input).slice(0, 200) + (JSON.stringify(data.input).length > 200 ? '\u2026' : '')
    : null;

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-sm font-mono font-semibold text-blue-400">{tool}</span>
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
  const outputPreview = output.length > 500 ? output.slice(0, 500) + '\u2026' : output;

  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        isError
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-green-500/30 bg-green-500/5'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {isError ? (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span
          className={`text-sm font-mono font-semibold ${isError ? 'text-red-400' : 'text-green-400'}`}
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
        <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-mono font-semibold text-purple-400 truncate">
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

// ---------------------------------------------------------------------------
// Timeline step renderer
// ---------------------------------------------------------------------------

function TimelineStep({
  part,
  isLast,
}: {
  part: PartRow;
  isLast: boolean;
}) {
  const parsed = safeParsePartData(part.data);
  const type = parsed?.type ?? 'text';
  const time = new Date(part.time_created).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Determine if this is an error tool_result for the circle color override
  const isErrorResult = type === 'tool_result' && parsed?.isError === true;
  const circleColor = isErrorResult
    ? 'border-red-500 bg-red-500'
    : partTypeColors[type] ?? 'border-slate-500 bg-slate-500';

  const lineColor = isErrorResult
    ? 'border-red-500/50'
    : partTypeLineColors[type] ?? 'border-slate-700/50';

  return (
    <li className="relative flex gap-4 pb-2" role="listitem">
      {/* Vertical line segment: extends from top of this node to top of the next */}
      {!isLast && (
        <div
          className={`absolute left-[11px] top-[28px] bottom-0 w-0 border-l-2 ${lineColor}`}
          aria-hidden="true"
        />
      )}

      {/* Circle node */}
      <div
        className={`relative z-10 shrink-0 w-[22px] h-[22px] rounded-full border-2 ${circleColor} flex items-center justify-center ${
          isLast ? 'animate-pulse' : ''
        }`}
        aria-hidden="true"
      >
        {/* Inner dot for visual depth */}
        <div className={`w-1.5 h-1.5 rounded-full ${isErrorResult ? 'bg-red-500' : circleColor.split(' ')[1] ?? 'bg-slate-500'}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-3">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            {type}
          </span>
          <span className="text-[10px] text-slate-600">{time}</span>
          {isLast && (
            <span className="text-[10px] text-amber-400/80 font-medium animate-pulse">
              active
            </span>
          )}
        </div>

        {/* Step content */}
        <div>
          {type === 'step_start' && <StepStartHeader data={parsed!} />}
          {type === 'thinking' && <ThinkingPanel data={parsed!} />}
          {type === 'tool_call' && <ToolCallCard data={parsed!} />}
          {type === 'tool_result' && <ToolResultCard data={parsed!} />}
          {type === 'text' && <TextBlock data={parsed!} />}
          {type === 'file' && <FileCard data={parsed!} />}
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AgentExecutionSteps({ parts }: AgentExecutionStepsProps) {
  // Empty state
  if (!parts || parts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 space-y-3 text-[var(--color-text-secondary)]">
        <svg
          className="w-8 h-8 opacity-40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xs">No execution steps recorded</span>
      </div>
    );
  }

  // Sort by time_created ascending
  const sorted = [...parts].sort((a, b) => a.time_created - b.time_created);

  return (
    <div className="py-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">
          Agent Execution Steps
        </h3>
        <span className="text-[10px] text-slate-500">
          {sorted.length} step{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline */}
      <ol className="relative m-0 list-none" role="list">
        {sorted.map((part, index) => (
          <TimelineStep
            key={part.id}
            part={part}
            isLast={index === sorted.length - 1}
          />
        ))}
      </ol>
    </div>
  );
}

export default AgentExecutionSteps;
