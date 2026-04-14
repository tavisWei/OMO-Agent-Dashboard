import { Router } from 'express';
import type { Agent, CreateTaskInput, Task, TaskAgentAssignmentRole, TaskDependencyType, TaskOrchestrationAction, TaskOrchestrationPattern, TaskPriority, TaskStatus, UpdateTaskInput } from '../../types/index.js';
import type { TaskAssignmentInput, TaskDependencyInput, TaskQueryFilters } from '../../db/index.js';
import {
  createTask,
  deleteTaskCascade,
  getAllAgents,
  getAllTasks,
  getProject,
  getTask,
  getTaskAssignments,
  getTaskDependencies,
  getTaskSubtasks,
  getDependentTasks,
  replaceTaskAssignments,
  replaceTaskDependencies,
  updateTask,
} from '../../db/index.js';
import {
  advanceTaskOrchestration,
  failTaskOrchestration,
  getTaskOrchestrationSnapshot,
  startTaskOrchestration,
  TASK_ORCHESTRATION_ACTIONS,
  TASK_ORCHESTRATION_PATTERNS,
} from '../orchestrator.js';
import { broadcastAll, createWSMessage } from '../websocket.js';

const router = Router();

const TASK_STATUSES: TaskStatus[] = ['backlog', 'in_progress', 'done', 'failed'];
const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
const TASK_ASSIGNMENT_ROLES: TaskAgentAssignmentRole[] = ['lead', 'worker', 'reviewer'];
const TASK_DEPENDENCY_TYPES: TaskDependencyType[] = ['blocks', 'requires'];

router.get('/', (req, res) => {
  try {
    const filters = parseTaskFilters(req.query);
    if ('error' in filters) {
      return res.status(400).json({ error: filters.error });
    }

    const tasks = getAllTasks(filters);
    res.json(tasks);
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

router.post('/', (req, res) => {
  try {
    const parsedInput = parseTaskPayload(req.body, false);
    if ('error' in parsedInput) {
      return res.status(400).json({ error: parsedInput.error });
    }

    const dependencyValidation = validateTaskRelationships(parsedInput.payload, null);
    if (dependencyValidation) {
      return res.status(400).json({ error: dependencyValidation });
    }

    const statusValidation = validateRequestedStatus(null, parsedInput.payload);
    if (statusValidation) {
      return res.status(statusValidation.statusCode).json({ error: statusValidation.error });
    }

    const title = parsedInput.payload.title;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = createTask(
      title,
      parsedInput.payload.project_id ?? null,
      parsedInput.payload.agent_id ?? null,
      parsedInput.payload.description ?? '',
      parsedInput.payload.status ?? 'backlog',
      {
        parent_task_id: parsedInput.payload.parent_task_id,
        depends_on: parsedInput.payload.depends_on,
        priority: parsedInput.payload.priority,
        labels: parsedInput.payload.labels,
        due_date: parsedInput.payload.due_date,
        estimated_tokens: parsedInput.payload.estimated_tokens,
        assigned_agents: parsedInput.payload.assigned_agents,
      },
    );

    const detail = buildTaskDetail(task.id);
    broadcastAll(createWSMessage('task_created', detail));
    res.status(201).json(detail);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const taskId = parseId(req.params.id);
    if (taskId === null) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const task = getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(buildTaskDetail(task.id));
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const taskId = parseId(req.params.id);
    if (taskId === null) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const existingTask = getTask(taskId);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const parsedInput = parseTaskPayload(req.body, true);
    if ('error' in parsedInput) {
      return res.status(400).json({ error: parsedInput.error });
    }

    if (Object.keys(parsedInput.payload).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const relationshipValidation = validateTaskRelationships(parsedInput.payload, taskId);
    if (relationshipValidation) {
      return res.status(400).json({ error: relationshipValidation });
    }

    const statusValidation = validateRequestedStatus(existingTask, parsedInput.payload);
    if (statusValidation) {
      return res.status(statusValidation.statusCode).json({ error: statusValidation.error });
    }

    const success = updateTask(taskId, parsedInput.payload as Partial<Task>);
    if (!success) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const detail = buildTaskDetail(taskId);
    broadcastAll(createWSMessage('task_updated', detail));
    res.json(detail);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const taskId = parseId(req.params.id);
    if (taskId === null) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const success = deleteTaskCascade(taskId);
    if (!success) {
      return res.status(404).json({ error: 'Task not found' });
    }

    broadcastAll(createWSMessage('task_deleted', { id: taskId }));
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

router.post('/:id/assign', (req, res) => {
  try {
    const taskId = parseId(req.params.id);
    if (taskId === null) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const task = getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const parsedAssignments = parseAssignmentsPayload(req.body);
    if ('error' in parsedAssignments) {
      return res.status(400).json({ error: parsedAssignments.error });
    }

    const validationError = validateAgentIds(parsedAssignments.assignments.map((assignment) => assignment.agent_id));
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const assignments = replaceTaskAssignments(taskId, parsedAssignments.assignments);
    const detail = buildTaskDetail(taskId);
    broadcastAll(createWSMessage('task_updated', detail));
    res.json({
      task: detail.task,
      assignments,
    });
  } catch (error) {
    console.error('Error assigning task agents:', error);
    res.status(500).json({ error: 'Failed to assign task agents' });
  }
});

router.post('/:id/dependencies', (req, res) => {
  try {
    const taskId = parseId(req.params.id);
    if (taskId === null) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const task = getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const parsedPayload = parseDependenciesMutationPayload(req.body);
    if ('error' in parsedPayload) {
      return res.status(400).json({ error: parsedPayload.error });
    }

    const existingDependencies = getTaskDependencies(taskId);
    const nextDependencies = mergeDependencyMutations(existingDependencies, parsedPayload.add, parsedPayload.remove);

    const validationError = validateDependencyInputs(nextDependencies, taskId);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const statusValidation = validateRequestedStatus(task, {
      depends_on: Array.from(new Set(nextDependencies.map((dependency) => dependency.depends_on_task_id))),
    });
    if (statusValidation) {
      return res.status(statusValidation.statusCode).json({ error: statusValidation.error });
    }

    const dependencies = replaceTaskDependencies(taskId, nextDependencies);
    const detail = buildTaskDetail(taskId);
    broadcastAll(createWSMessage('task_updated', detail));
    res.json({
      task: detail.task,
      dependencies,
    });
  } catch (error) {
    console.error('Error updating task dependencies:', error);
    res.status(500).json({ error: 'Failed to update task dependencies' });
  }
});

router.post('/:id/orchestrate', (req, res) => {
  try {
    const taskId = parseId(req.params.id);
    if (taskId === null) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const parsedInput = parseTaskOrchestrationPayload(req.body);
    if ('error' in parsedInput) {
      return res.status(400).json({ error: parsedInput.error });
    }

    let result;

    if (parsedInput.action === 'advance') {
      result = advanceTaskOrchestration(taskId);
    } else if (parsedInput.action === 'fail') {
      result = failTaskOrchestration(taskId);
    } else if ('pattern' in parsedInput) {
      result = startTaskOrchestration(taskId, {
        pattern: parsedInput.pattern,
        agent_order: parsedInput.agent_order,
      });
    } else {
      return res.status(400).json({ error: 'pattern must be sequential, parallel, or pipeline' });
    }

    if ('error' in result) {
      return res.status(result.statusCode).json({ error: result.error });
    }

    res.status(parsedInput.action === 'start' ? 201 : 200).json({
      action: result.event,
      ...result.snapshot,
    });
  } catch (error) {
    console.error('Error orchestrating task:', error);
    res.status(500).json({ error: 'Failed to orchestrate task' });
  }
});

router.get('/:id/orchestration', (req, res) => {
  try {
    const taskId = parseId(req.params.id);
    if (taskId === null) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const task = getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const orchestration = getTaskOrchestrationSnapshot(taskId);
    if (!orchestration) {
      return res.status(404).json({ error: 'Task orchestration not found' });
    }

    res.json(orchestration);
  } catch (error) {
    console.error('Error getting task orchestration:', error);
    res.status(500).json({ error: 'Failed to get task orchestration' });
  }
});

router.get('/:id/subtasks', (req, res) => {
  try {
    const taskId = parseId(req.params.id);
    if (taskId === null) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const task = getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(getTaskSubtasks(taskId));
  } catch (error) {
    console.error('Error getting subtasks:', error);
    res.status(500).json({ error: 'Failed to get subtasks' });
  }
});

function buildTaskDetail(taskId: number) {
  const task = getTask(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  const allAgents = getAllAgents();
  const agentMap = new Map<number, Agent>(allAgents.map((agent) => [agent.id, agent]));
  const assignments = getTaskAssignments(taskId);
  const dependencies = getTaskDependencies(taskId);
  const dependents = getDependentTasks(taskId);
  const subtasks = getTaskSubtasks(taskId);

  return {
    task,
    project: task.project_id !== null ? getProject(task.project_id) : null,
    legacy_agent: task.agent_id !== null ? agentMap.get(task.agent_id) ?? null : null,
    assignments,
    assigned_agent_details: task.assigned_agents
      .map((agentId) => agentMap.get(agentId))
      .filter((agent): agent is Agent => Boolean(agent)),
    dependencies: {
      blocking: dependencies.map((dependency) => ({
        ...dependency,
        task: getTask(dependency.depends_on_task_id),
      })),
      dependents: dependents.map((dependency) => ({
        ...dependency,
        task: getTask(dependency.task_id),
      })),
    },
    subtasks,
  };
}

function parseTaskFilters(query: Record<string, unknown>): TaskQueryFilters | { error: string } {
  const filters: TaskQueryFilters = {};

  if (query.project_id !== undefined) {
    const projectId = parseNullableQueryId(query.project_id, false);
    if (projectId === 'invalid' || projectId === null) {
      return { error: 'Invalid project_id filter' };
    }
    filters.project_id = projectId as number;
  }

  if (query.status !== undefined) {
    if (!isTaskStatus(query.status)) {
      return { error: 'Invalid status filter' };
    }
    filters.status = query.status;
  }

  if (query.priority !== undefined) {
    if (!isTaskPriority(query.priority)) {
      return { error: 'Invalid priority filter' };
    }
    filters.priority = query.priority;
  }

  if (query.agent_id !== undefined) {
    const agentId = parseNullableQueryId(query.agent_id, false);
    if (agentId === 'invalid' || agentId === null) {
      return { error: 'Invalid agent_id filter' };
    }
    filters.agent_id = agentId as number;
  }

  if (query.parent_task_id !== undefined) {
    const parentTaskId = parseNullableQueryId(query.parent_task_id, true);
    if (parentTaskId === 'invalid') {
      return { error: 'Invalid parent_task_id filter' };
    }
    filters.parent_task_id = parentTaskId;
  }

  return filters;
}

function parseTaskPayload(body: unknown, isUpdate: boolean): { payload: Partial<CreateTaskInput & UpdateTaskInput & Pick<Task, 'position'>> } | { error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid request body' };
  }

  const source = body as Record<string, unknown>;
  const payload: Partial<CreateTaskInput & UpdateTaskInput & Pick<Task, 'position'>> = {};

  if ('title' in source) {
    if (typeof source.title !== 'string' || source.title.trim() === '') {
      return { error: 'Title must be a non-empty string' };
    }
    payload.title = source.title.trim();
  } else if (!isUpdate) {
    return { error: 'Title is required' };
  }

  if ('description' in source) {
    if (typeof source.description !== 'string') {
      return { error: 'Description must be a string' };
    }
    payload.description = source.description;
  } else if (!isUpdate) {
    payload.description = '';
  }

  if ('project_id' in source) {
    const projectId = parseNullableBodyId(source.project_id);
    if (projectId === 'invalid') {
      return { error: 'project_id must be a positive integer or null' };
    }
    payload.project_id = projectId;
  }

  if ('agent_id' in source) {
    const agentId = parseNullableBodyId(source.agent_id);
    if (agentId === 'invalid') {
      return { error: 'agent_id must be a positive integer or null' };
    }
    payload.agent_id = agentId;
  }

  if ('parent_task_id' in source) {
    const parentTaskId = parseNullableBodyId(source.parent_task_id);
    if (parentTaskId === 'invalid') {
      return { error: 'parent_task_id must be a positive integer or null' };
    }
    payload.parent_task_id = parentTaskId;
  }

  if ('status' in source) {
    if (!isTaskStatus(source.status)) {
      return { error: 'Invalid task status' };
    }
    payload.status = source.status;
  } else if (!isUpdate) {
    payload.status = 'backlog';
  }

  if ('priority' in source) {
    if (!isTaskPriority(source.priority)) {
      return { error: 'Invalid task priority' };
    }
    payload.priority = source.priority;
  }

  if ('position' in source) {
    if (!Number.isInteger(source.position) || (source.position as number) < 0) {
      return { error: 'position must be a non-negative integer' };
    }
    payload.position = source.position as number;
  }

  if ('depends_on' in source) {
    const dependsOn = parseIntegerArray(source.depends_on);
    if (!dependsOn) {
      return { error: 'depends_on must be an array of positive integers' };
    }
    payload.depends_on = dependsOn;
  }

  if ('labels' in source) {
    const labels = parseStringArray(source.labels);
    if (!labels) {
      return { error: 'labels must be an array of strings' };
    }
    payload.labels = labels;
  }

  if ('due_date' in source) {
    if (source.due_date !== null && (!Number.isInteger(source.due_date) || (source.due_date as number) < 0)) {
      return { error: 'due_date must be a unix timestamp integer or null' };
    }
    payload.due_date = source.due_date as number | null;
  }

  if ('estimated_tokens' in source) {
    if (source.estimated_tokens !== null && (!Number.isInteger(source.estimated_tokens) || (source.estimated_tokens as number) < 0)) {
      return { error: 'estimated_tokens must be a non-negative integer or null' };
    }
    payload.estimated_tokens = source.estimated_tokens as number | null;
  }

  if ('assigned_agents' in source) {
    const assignedAgents = parseIntegerArray(source.assigned_agents);
    if (!assignedAgents) {
      return { error: 'assigned_agents must be an array of positive integers' };
    }
    payload.assigned_agents = assignedAgents;
  }

  return { payload };
}

function parseAssignmentsPayload(body: unknown): { assignments: TaskAssignmentInput[] } | { error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid request body' };
  }

  const source = body as Record<string, unknown>;
  const rawAssignments = Array.isArray(source.assignments) ? source.assignments : Array.isArray(body) ? body : null;

  if (!rawAssignments) {
    return { error: 'assignments array is required' };
  }

  const assignments: TaskAssignmentInput[] = [];
  for (const rawAssignment of rawAssignments) {
    if (!rawAssignment || typeof rawAssignment !== 'object' || Array.isArray(rawAssignment)) {
      return { error: 'Each assignment must be an object' };
    }

    const assignment = rawAssignment as Record<string, unknown>;
    const agentId = parseNullableBodyId(assignment.agent_id);
    if (agentId === 'invalid' || agentId === null) {
      return { error: 'assignment.agent_id must be a positive integer' };
    }

    const role = assignment.role ?? 'worker';
    if (!isTaskAssignmentRole(role)) {
      return { error: 'assignment.role must be lead, worker, or reviewer' };
    }

    assignments.push({ agent_id: agentId, role });
  }

  return { assignments };
}

function parseDependenciesMutationPayload(body: unknown): { add: TaskDependencyInput[]; remove: TaskDependencyInput[] } | { error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid request body' };
  }

  const source = body as Record<string, unknown>;
  const add = parseDependencyArray(source.add ?? []);
  if (!add) {
    return { error: 'add must be an array of dependency objects' };
  }

  const remove = parseDependencyArray(source.remove ?? []);
  if (!remove) {
    return { error: 'remove must be an array of dependency objects' };
  }

  return { add, remove };
}

function parseTaskOrchestrationPayload(body: unknown): {
  action: 'start';
  pattern: TaskOrchestrationPattern;
  agent_order?: number[];
} | {
  action: Exclude<TaskOrchestrationAction, 'start'>;
} | {
  error: string;
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid request body' };
  }

  const source = body as Record<string, unknown>;
  const action = source.action ?? 'start';
  if (!isTaskOrchestrationAction(action)) {
    return { error: 'action must be start, advance, or fail' };
  }

  if (action !== 'start') {
    return { action };
  }

  if (!isTaskOrchestrationPattern(source.pattern)) {
    return { error: 'pattern must be sequential, parallel, or pipeline' };
  }

  if (source.agent_order === undefined) {
    return {
      action: 'start',
      pattern: source.pattern,
    };
  }

  const agentOrder = parseIntegerArray(source.agent_order);
  if (!agentOrder) {
    return { error: 'agent_order must be an array of positive integers' };
  }

  return {
    action: 'start',
    pattern: source.pattern,
    agent_order: agentOrder,
  };
}

function parseDependencyArray(value: unknown): TaskDependencyInput[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const dependencies: TaskDependencyInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return null;
    }

    const dependency = item as Record<string, unknown>;
    const dependsOnTaskId = parseNullableBodyId(dependency.depends_on_task_id);
    if (dependsOnTaskId === 'invalid' || dependsOnTaskId === null) {
      return null;
    }

    const dependencyType = dependency.dependency_type ?? 'requires';
    if (!isTaskDependencyType(dependencyType)) {
      return null;
    }

    dependencies.push({ depends_on_task_id: dependsOnTaskId, dependency_type: dependencyType });
  }

  return dependencies;
}

function mergeDependencyMutations(
  existingDependencies: TaskDependencyInput[],
  add: TaskDependencyInput[],
  remove: TaskDependencyInput[],
): TaskDependencyInput[] {
  const dependencyMap = new Map<string, TaskDependencyInput>();

  existingDependencies.forEach((dependency) => {
    dependencyMap.set(getDependencyKey(dependency), dependency);
  });

  remove.forEach((dependency) => {
    dependencyMap.delete(getDependencyKey(dependency));
  });

  add.forEach((dependency) => {
    dependencyMap.set(getDependencyKey(dependency), dependency);
  });

  return Array.from(dependencyMap.values());
}

function validateTaskRelationships(payload: Partial<CreateTaskInput & UpdateTaskInput>, taskId: number | null): string | null {
  if (payload.project_id !== undefined && payload.project_id !== null && !getProject(payload.project_id)) {
    return 'Referenced project_id does not exist';
  }

  if (payload.parent_task_id !== undefined) {
    if (payload.parent_task_id === taskId) {
      return 'A task cannot be its own parent';
    }

    if (payload.parent_task_id !== null && !getTask(payload.parent_task_id)) {
      return 'Referenced parent_task_id does not exist';
    }
  }

  if (payload.agent_id !== undefined && payload.agent_id !== null) {
    const error = validateAgentIds([payload.agent_id]);
    if (error) {
      return error;
    }
  }

  if (payload.assigned_agents !== undefined) {
    const error = validateAgentIds(payload.assigned_agents);
    if (error) {
      return error;
    }
  }

  if (payload.depends_on !== undefined) {
    return validateDependencyInputs(
      payload.depends_on.map((dependsOnTaskId) => ({
        depends_on_task_id: dependsOnTaskId,
        dependency_type: 'requires',
      })),
      taskId,
    );
  }

  return null;
}

function validateDependencyInputs(dependencies: TaskDependencyInput[], taskId: number | null): string | null {
  for (const dependency of dependencies) {
    if (dependency.depends_on_task_id === taskId) {
      return 'A task cannot depend on itself';
    }

    const dependencyTask = getTask(dependency.depends_on_task_id);
    if (!dependencyTask) {
      return `Dependency task ${dependency.depends_on_task_id} does not exist`;
    }
  }

  return null;
}

function validateRequestedStatus(existingTask: Task | null, payload: Partial<CreateTaskInput & UpdateTaskInput>) {
  const nextStatus = payload.status ?? existingTask?.status ?? 'backlog';
  const currentStatus = existingTask?.status ?? 'backlog';

  if (nextStatus !== currentStatus && !isValidStatusTransition(currentStatus, nextStatus)) {
    return {
      statusCode: 400,
      error: `Invalid task status transition from ${currentStatus} to ${nextStatus}`,
    };
  }

  if (nextStatus === 'in_progress') {
    const taskId = existingTask?.id ?? null;
    const dependencyIds = getBlockingDependencyIds(taskId, payload.depends_on);
    const unresolvedDependencies = dependencyIds
      .map((dependencyId) => getTask(dependencyId))
      .filter((dependencyTask): dependencyTask is Task => Boolean(dependencyTask && dependencyTask.status !== 'done'));

    if (unresolvedDependencies.length > 0) {
      return {
        statusCode: 400,
        error: `Task is blocked by unfinished dependencies: ${unresolvedDependencies.map((task) => task.id).join(', ')}`,
      };
    }
  }

  return null;
}

function getBlockingDependencyIds(taskId: number | null, explicitDependencyIds?: number[]): number[] {
  if (explicitDependencyIds !== undefined) {
    return Array.from(new Set(explicitDependencyIds).values());
  }

  const dependencyIds = new Set<number>();

  if (taskId !== null) {
    const task = getTask(taskId);
    task?.depends_on.forEach((dependencyId) => dependencyIds.add(dependencyId));
    getTaskDependencies(taskId).forEach((dependency) => dependencyIds.add(dependency.depends_on_task_id));
  }

  return Array.from(dependencyIds.values());
}

function validateAgentIds(agentIds: number[]): string | null {
  const knownAgentIds = new Set(getAllAgents().map((agent) => agent.id));
  const missingAgentIds = Array.from(new Set(agentIds)).filter((agentId) => !knownAgentIds.has(agentId));
  return missingAgentIds.length > 0
    ? `Referenced agent IDs do not exist: ${missingAgentIds.join(', ')}`
    : null;
}

function isValidStatusTransition(currentStatus: TaskStatus, nextStatus: TaskStatus): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
    backlog: ['in_progress'],
    in_progress: ['done', 'failed'],
    done: [],
    failed: [],
  };

  return allowedTransitions[currentStatus].includes(nextStatus);
}

function parseNullableQueryId(value: unknown, allowNull: boolean): number | null | 'invalid' {
  if (Array.isArray(value)) {
    return 'invalid';
  }

  if (allowNull && (value === 'null' || value === 'root')) {
    return null;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return 'invalid';
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 'invalid';
}

function parseNullableBodyId(value: unknown): number | null | 'invalid' {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  return Number.isInteger(value) && (value as number) > 0 ? (value as number) : 'invalid';
}

function parseId(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseIntegerArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsedValues = value.filter((item): item is number => Number.isInteger(item) && item > 0);
  return parsedValues.length === value.length ? Array.from(new Set(parsedValues)) : null;
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsedValues = value.filter((item): item is string => typeof item === 'string');
  return parsedValues.length === value.length ? parsedValues : null;
}

function getDependencyKey(dependency: TaskDependencyInput): string {
  return `${dependency.depends_on_task_id}:${dependency.dependency_type ?? 'requires'}`;
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && TASK_STATUSES.includes(value as TaskStatus);
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && TASK_PRIORITIES.includes(value as TaskPriority);
}

function isTaskAssignmentRole(value: unknown): value is TaskAgentAssignmentRole {
  return typeof value === 'string' && TASK_ASSIGNMENT_ROLES.includes(value as TaskAgentAssignmentRole);
}

function isTaskDependencyType(value: unknown): value is TaskDependencyType {
  return typeof value === 'string' && TASK_DEPENDENCY_TYPES.includes(value as TaskDependencyType);
}

function isTaskOrchestrationAction(value: unknown): value is TaskOrchestrationAction {
  return typeof value === 'string' && TASK_ORCHESTRATION_ACTIONS.includes(value as TaskOrchestrationAction);
}

function isTaskOrchestrationPattern(value: unknown): value is TaskOrchestrationPattern {
  return typeof value === 'string' && TASK_ORCHESTRATION_PATTERNS.includes(value as TaskOrchestrationPattern);
}

export default router;
