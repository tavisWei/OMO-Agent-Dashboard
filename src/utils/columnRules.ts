import type { KanbanColumnId } from '../types/index.js';
export interface ColumnRule {
  targetColumn: KanbanColumnId;
  requireGitChanges?: boolean;
  requireTodosComplete?: boolean;
  requireDiffSize?: { minAdditions?: number; minDeletions?: number };
  requireFields?: string[];
  requireReviewer?: boolean;
}

export interface RuleResult {
  pass: boolean;
  reason?: string;
}

export interface GateSession {
  summary_additions?: number;
  summary_deletions?: number;
}

export function checkColumnRule(
  rule: ColumnRule,
  session: GateSession | null,
  hasReviewer: boolean,
): RuleResult {
  if (rule.requireGitChanges) {
    const hasChanges =
      (session?.summary_additions ?? 0) > 0 ||
      (session?.summary_deletions ?? 0) > 0;
    if (!hasChanges) {
      return { pass: false, reason: 'No git changes in session' };
    }
  }

  if (rule.requireReviewer && !hasReviewer) {
    return { pass: false, reason: 'No reviewer assigned' };
  }

  return { pass: true };
}
