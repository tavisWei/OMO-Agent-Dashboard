import type { TaskStatus } from '../types/index.js';

/**
 * Infer the current TaskStatus for a task based on runtime state signals.
 *
 * @param task       - The task db record (status, parent_task_id, etc.)
 * @param session    - Orchestration session snapshot (if any)
 * @param todos      - Subtask list (if the task has subtodos)
 * @param hasErrorParts - Whether any subtask/step has errored
 * @returns The inferred TaskStatus
 */
export function inferTaskStatus(
  task: { status: TaskStatus; parent_task_id?: number | null },
  session: { orchestration_status?: string } | null,
  todos: Array<{ status?: string }> | null,
  hasErrorParts: boolean,
): TaskStatus {
  // If there's an active orchestration session, use its status
  if (session) {
    switch (session.orchestration_status) {
      case 'completed':
        return 'done';
      case 'failed':
        return hasErrorParts ? 'needs_fix' : 'failed';
      case 'running':
      case 'step_complete':
        return 'in_progress';
      case 'pending':
        return 'backlog';
      default:
        break;
    }
  }

  // If task has error parts and no active session, mark as needs_fix
  if (hasErrorParts) {
    return 'needs_fix';
  }

  // If there are subtasks (todos), enumerate their states
  if (todos && todos.length > 0) {
    const allDone = todos.every((t) => t.status === 'completed' || t.status === 'done');
    const anyFailed = todos.some((t) => t.status === 'failed');

    if (anyFailed) {
      return 'needs_fix';
    }

    if (allDone) {
      // If a reviewer was assigned (parent_task_id suggests it's part of a pipeline), signal review
      // NB: The caller may override this based on agent assignment roles
      return 'review_required';
    }

    // Some todos still in progress
    return 'in_progress';
  }

  // Fallback: return current DB status
  // A task that was 'backlog' stays backlog unless a session/subtask proves otherwise
  if (task.status === 'backlog' || task.status === 'blocked') {
    return task.status;
  }

  // For all other states, if no session and no todos, we can't infer anything new
  return task.status;
}
