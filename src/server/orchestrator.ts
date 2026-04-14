import {
  createTaskOrchestration as createTaskOrchestrationRecord,
  getAllAgents,
  getTask,
  getTaskAssignments,
  getTaskDependencies,
  getTaskOrchestration,
  updateTask,
  updateTaskOrchestration,
} from '../db/index.js';
import { broadcastAll, createWSMessage } from './websocket.js';
import type {
  Agent,
  Task,
  TaskAgentAssignment,
  TaskOrchestration,
  TaskOrchestrationAction,
  TaskOrchestrationAgentOrderEntry,
  TaskOrchestrationEvent,
  TaskOrchestrationPattern,
  TaskOrchestrationSnapshot,
  TaskOrchestrationStep,
  TaskOrchestrationStepState,
} from '../types/index.js';

export const TASK_ORCHESTRATION_PATTERNS: TaskOrchestrationPattern[] = ['sequential', 'parallel', 'pipeline'];
export const TASK_ORCHESTRATION_ACTIONS: TaskOrchestrationAction[] = ['start', 'advance', 'fail'];

interface StartTaskOrchestrationInput {
  pattern: TaskOrchestrationPattern;
  agent_order?: number[];
}

interface OrchestrationSuccessResult {
  event: TaskOrchestrationEvent;
  snapshot: TaskOrchestrationSnapshot;
}

interface OrchestrationErrorResult {
  error: string;
  statusCode: number;
}

const ASSIGNMENT_ROLE_PRIORITY: Record<TaskAgentAssignment['role'], number> = {
  lead: 0,
  worker: 1,
  reviewer: 2,
};

export function startTaskOrchestration(
  taskId: number,
  input: StartTaskOrchestrationInput,
): OrchestrationSuccessResult | OrchestrationErrorResult {
  const task = getTask(taskId);
  if (!task) {
    return { error: 'Task not found', statusCode: 404 };
  }

  if (task.status === 'done' || task.status === 'failed') {
    return {
      error: `Task ${task.id} cannot start orchestration from status ${task.status}`,
      statusCode: 409,
    };
  }

  const blockingTasks = getBlockingTasks(task);
  if (blockingTasks.length > 0) {
    return {
      error: `Task is blocked by unfinished dependencies: ${blockingTasks.map((dependencyTask) => dependencyTask.id).join(', ')}`,
      statusCode: 409,
    };
  }

  const agentOrderResult = buildAgentOrder(task, input.agent_order);
  if ('error' in agentOrderResult) {
    return agentOrderResult;
  }

  createTaskOrchestrationRecord(taskId, {
    pattern: input.pattern,
    agent_order: agentOrderResult.agent_order,
    current_step: 0,
    status: 'pending',
  });

  if (task.status !== 'in_progress') {
    updateTask(taskId, { status: 'in_progress' });
  }

  const orchestration = updateTaskOrchestration(taskId, { status: 'running', current_step: 0 });
  if (!orchestration) {
    return { error: 'Failed to start task orchestration', statusCode: 500 };
  }

  const snapshot = buildTaskOrchestrationSnapshot(getTask(taskId) ?? task, orchestration);
  emitOrchestrationEvent('started', snapshot);

  return { event: 'started', snapshot };
}

export function advanceTaskOrchestration(taskId: number): OrchestrationSuccessResult | OrchestrationErrorResult {
  const task = getTask(taskId);
  if (!task) {
    return { error: 'Task not found', statusCode: 404 };
  }

  const orchestration = getTaskOrchestration(taskId);
  if (!orchestration) {
    return { error: 'Task orchestration not found', statusCode: 404 };
  }

  if (orchestration.status === 'completed' || orchestration.status === 'failed') {
    return {
      error: `Task orchestration is already ${orchestration.status}`,
      statusCode: 409,
    };
  }

  const nextState = getNextOrchestrationState(orchestration);
  const updatedOrchestration = updateTaskOrchestration(taskId, nextState);
  if (!updatedOrchestration) {
    return { error: 'Failed to advance task orchestration', statusCode: 500 };
  }

  if (updatedOrchestration.status === 'completed') {
    updateTask(taskId, { status: 'done' });
  }

  const nextTask = getTask(taskId) ?? task;
  const snapshot = buildTaskOrchestrationSnapshot(nextTask, updatedOrchestration);
  const event: TaskOrchestrationEvent = updatedOrchestration.status === 'completed' ? 'completed' : 'advanced';
  emitOrchestrationEvent(event, snapshot);

  return { event, snapshot };
}

export function failTaskOrchestration(taskId: number): OrchestrationSuccessResult | OrchestrationErrorResult {
  const task = getTask(taskId);
  if (!task) {
    return { error: 'Task not found', statusCode: 404 };
  }

  const orchestration = getTaskOrchestration(taskId);
  if (!orchestration) {
    return { error: 'Task orchestration not found', statusCode: 404 };
  }

  if (orchestration.status === 'completed' || orchestration.status === 'failed') {
    return {
      error: `Task orchestration is already ${orchestration.status}`,
      statusCode: 409,
    };
  }

  const updatedOrchestration = updateTaskOrchestration(taskId, {
    current_step: getFailedStepIndex(orchestration),
    status: 'failed',
  });
  if (!updatedOrchestration) {
    return { error: 'Failed to fail task orchestration', statusCode: 500 };
  }

  updateTask(taskId, { status: 'failed' });

  const nextTask = getTask(taskId) ?? task;
  const snapshot = buildTaskOrchestrationSnapshot(nextTask, updatedOrchestration);
  emitOrchestrationEvent('failed', snapshot);

  return { event: 'failed', snapshot };
}

export function getTaskOrchestrationSnapshot(taskId: number): TaskOrchestrationSnapshot | null {
  const task = getTask(taskId);
  const orchestration = getTaskOrchestration(taskId);

  if (!task || !orchestration) {
    return null;
  }

  return buildTaskOrchestrationSnapshot(task, orchestration);
}

function buildTaskOrchestrationSnapshot(
  task: Task,
  orchestration: TaskOrchestration,
): TaskOrchestrationSnapshot {
  const steps = buildOrchestrationSteps(orchestration);

  return {
    task,
    orchestration,
    steps,
    progress: buildProgress(steps),
    available_actions: getAvailableActions(orchestration.status),
  };
}

function buildOrchestrationSteps(orchestration: TaskOrchestration): TaskOrchestrationStep[] {
  switch (orchestration.pattern) {
    case 'parallel':
      return buildParallelSteps(orchestration);
    case 'pipeline':
      return buildPipelineSteps(orchestration);
    case 'sequential':
    default:
      return buildSequentialSteps(orchestration);
  }
}

function buildSequentialSteps(orchestration: TaskOrchestration): TaskOrchestrationStep[] {
  return orchestration.agent_order.map((agent, index) => ({
    ...agent,
    index,
    state: getLinearStepState(index, orchestration),
    is_current: orchestration.status === 'running' && index === orchestration.current_step,
    output_key: null,
    input_from_step: null,
  }));
}

function buildParallelSteps(orchestration: TaskOrchestration): TaskOrchestrationStep[] {
  return orchestration.agent_order.map((agent, index) => ({
    ...agent,
    index,
    state: getParallelStepState(index, orchestration),
    is_current: orchestration.status !== 'completed' && orchestration.status !== 'failed' && index >= orchestration.current_step,
    output_key: null,
    input_from_step: null,
  }));
}

function buildPipelineSteps(orchestration: TaskOrchestration): TaskOrchestrationStep[] {
  return orchestration.agent_order.map((agent, index) => ({
    ...agent,
    index,
    state: getLinearStepState(index, orchestration),
    is_current: orchestration.status === 'running' && index === orchestration.current_step,
    output_key: `pipeline_step_${index + 1}_output`,
    input_from_step: index === 0 ? null : index - 1,
  }));
}

function buildProgress(steps: TaskOrchestrationStep[]) {
  const totalSteps = steps.length;
  const completedSteps = steps.filter((step) => step.state === 'completed').length;
  const activeSteps = steps.filter((step) => step.state === 'active').length;
  const pendingSteps = steps.filter((step) => step.state === 'pending').length;

  return {
    total_steps: totalSteps,
    completed_steps: completedSteps,
    active_steps: activeSteps,
    pending_steps: pendingSteps,
    completion_percentage: totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100),
  };
}

function getAvailableActions(status: TaskOrchestration['status']): TaskOrchestrationAction[] {
  switch (status) {
    case 'pending':
    case 'running':
    case 'step_complete':
      return ['advance', 'fail'];
    case 'completed':
    case 'failed':
      return ['start'];
  }
}

function getLinearStepState(
  index: number,
  orchestration: TaskOrchestration,
): TaskOrchestrationStepState {
  if (orchestration.status === 'completed') {
    return 'completed';
  }

  if (orchestration.status === 'failed') {
    if (index < orchestration.current_step) {
      return 'completed';
    }

    return index === getFailedStepIndex(orchestration) ? 'failed' : 'pending';
  }

  if (index < orchestration.current_step) {
    return 'completed';
  }

  if (orchestration.status === 'running' && index === orchestration.current_step) {
    return 'active';
  }

  return 'pending';
}

function getParallelStepState(
  index: number,
  orchestration: TaskOrchestration,
): TaskOrchestrationStepState {
  if (orchestration.status === 'completed') {
    return 'completed';
  }

  if (orchestration.status === 'failed') {
    if (index < orchestration.current_step) {
      return 'completed';
    }

    return index === getFailedStepIndex(orchestration) ? 'failed' : 'pending';
  }

  if (index < orchestration.current_step) {
    return 'completed';
  }

  if (orchestration.status === 'running' || orchestration.status === 'step_complete') {
    return 'active';
  }

  return 'pending';
}

function getNextOrchestrationState(
  orchestration: TaskOrchestration,
): Pick<TaskOrchestration, 'current_step' | 'status'> {
  switch (orchestration.pattern) {
    case 'parallel':
      return getNextParallelState(orchestration);
    case 'pipeline':
    case 'sequential':
    default:
      return getNextLinearState(orchestration);
  }
}

function getNextLinearState(
  orchestration: TaskOrchestration,
): Pick<TaskOrchestration, 'current_step' | 'status'> {
  const totalSteps = orchestration.agent_order.length;

  if (orchestration.status === 'pending') {
    return { current_step: Math.min(orchestration.current_step, Math.max(totalSteps - 1, 0)), status: 'running' };
  }

  if (orchestration.status === 'step_complete') {
    return { current_step: Math.min(orchestration.current_step, Math.max(totalSteps - 1, 0)), status: 'running' };
  }

  const nextCompletedSteps = Math.min(orchestration.current_step + 1, totalSteps);
  return nextCompletedSteps >= totalSteps
    ? { current_step: totalSteps, status: 'completed' }
    : { current_step: nextCompletedSteps, status: 'step_complete' };
}

function getNextParallelState(
  orchestration: TaskOrchestration,
): Pick<TaskOrchestration, 'current_step' | 'status'> {
  const totalSteps = orchestration.agent_order.length;

  if (orchestration.status === 'pending') {
    return { current_step: 0, status: 'running' };
  }

  const nextCompletedSteps = Math.min(orchestration.current_step + 1, totalSteps);
  return nextCompletedSteps >= totalSteps
    ? { current_step: totalSteps, status: 'completed' }
    : { current_step: nextCompletedSteps, status: 'step_complete' };
}

function getBlockingTasks(task: Task): Task[] {
  const dependencyIds = new Set<number>(task.depends_on);
  getTaskDependencies(task.id).forEach((dependency) => dependencyIds.add(dependency.depends_on_task_id));

  return Array.from(dependencyIds)
    .map((dependencyId) => getTask(dependencyId))
    .filter((dependencyTask): dependencyTask is Task => Boolean(dependencyTask && dependencyTask.status !== 'done'));
}

function buildAgentOrder(
  task: Task,
  requestedOrder?: number[],
): { agent_order: TaskOrchestrationAgentOrderEntry[] } | OrchestrationErrorResult {
  const normalizedAssignments = getNormalizedAssignments(task);
  if (normalizedAssignments.length === 0) {
    return {
      error: 'Task must have at least one assigned agent before orchestration can start',
      statusCode: 409,
    };
  }

  const assignmentMap = new Map<number, TaskAgentAssignment>();
  normalizedAssignments.forEach((assignment) => {
    if (!assignmentMap.has(assignment.agent_id)) {
      assignmentMap.set(assignment.agent_id, assignment);
    }
  });

  const requestedAgentIds = requestedOrder !== undefined
    ? dedupeAgentIds(requestedOrder)
    : Array.from(assignmentMap.keys());

  if (requestedAgentIds.length === 0) {
    return { error: 'agent_order must include at least one assigned agent', statusCode: 400 };
  }

  const missingAgentIds = requestedAgentIds.filter((agentId) => !assignmentMap.has(agentId));
  if (missingAgentIds.length > 0) {
    return {
      error: `agent_order includes agents not assigned to task: ${missingAgentIds.join(', ')}`,
      statusCode: 400,
    };
  }

  const agentMap = new Map<number, Agent>(getAllAgents().map((agent) => [agent.id, agent]));

  return {
    agent_order: requestedAgentIds.map((agentId) => {
      const assignment = assignmentMap.get(agentId);
      if (!assignment) {
        throw new Error(`Missing task assignment for agent ${agentId}`);
      }

      return {
        agent_id: agentId,
        role: assignment.role,
        label: agentMap.get(agentId)?.name ?? `Agent ${agentId}`,
      };
    }),
  };
}

function getNormalizedAssignments(task: Task): TaskAgentAssignment[] {
  const storedAssignments = getTaskAssignments(task.id)
    .slice()
    .sort((left, right) => (
      ASSIGNMENT_ROLE_PRIORITY[left.role] - ASSIGNMENT_ROLE_PRIORITY[right.role]
      || left.assigned_at.localeCompare(right.assigned_at)
      || left.agent_id - right.agent_id
    ));

  if (storedAssignments.length > 0) {
    return storedAssignments;
  }

  const fallbackAgentIds = dedupeAgentIds([
    ...task.assigned_agents,
    ...(task.agent_id !== null ? [task.agent_id] : []),
  ]);

  return fallbackAgentIds.map((agentId) => ({
    task_id: task.id,
    agent_id: agentId,
    role: task.agent_id === agentId ? 'lead' : 'worker',
    assigned_at: task.created_at,
  }));
}

function getFailedStepIndex(orchestration: TaskOrchestration): number {
  if (orchestration.agent_order.length === 0) {
    return 0;
  }

  return Math.min(orchestration.current_step, orchestration.agent_order.length - 1);
}

function dedupeAgentIds(agentIds: number[]): number[] {
  const uniqueAgentIds = new Set<number>();

  agentIds.forEach((agentId) => {
    if (Number.isInteger(agentId) && agentId > 0) {
      uniqueAgentIds.add(agentId);
    }
  });

  return Array.from(uniqueAgentIds.values());
}

function emitOrchestrationEvent(
  event: TaskOrchestrationEvent,
  snapshot: TaskOrchestrationSnapshot,
): void {
  broadcastAll(createWSMessage('orchestration_update', {
    event,
    task_id: snapshot.task.id,
    orchestration: snapshot.orchestration,
    steps: snapshot.steps,
    progress: snapshot.progress,
  }));
}
