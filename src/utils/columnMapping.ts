import type { KanbanColumnId, TaskStatus } from '../types/index.js';

/**
 * Maps a KanbanColumnId to the canonical TaskStatus.
 *
 * This decouples the visual board layout (6 columns) from the richer
 * 7-value task-status enum used in the domain model.
 */
export const COLUMN_TO_STATUS: Record<KanbanColumnId, TaskStatus> = {
  backlog: 'backlog',
  todo: 'backlog',
  in_progress: 'in_progress',
  in_review: 'review_required',
  blocked: 'blocked',
  done: 'done',
};
