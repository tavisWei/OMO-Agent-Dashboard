import { test, expect } from '@playwright/test';

async function createProject(request: any, name: string) {
  const response = await request.post('http://localhost:3001/api/projects', {
    data: { name, description: `${name} description` },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createAgent(request: any, name: string) {
  const response = await request.post('http://localhost:3001/api/agents', {
    data: { name, model: 'gpt-4', temperature: 0.7, top_p: 0.9, max_tokens: 4096 },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createTask(request: any, title: string, projectId?: number, agentId?: number) {
  const response = await request.post('http://localhost:3001/api/tasks', {
    data: { title, description: `${title} description`, project_id: projectId ?? null, agent_id: agentId ?? null, priority: 'high', status: 'backlog' },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('OMO Agent Dashboard smoke flows', () => {
  test('root page and navigation render', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /OMO Agent/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /models|模型库/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /agents|智能体/i })).toBeVisible();
    await expect(page.getByText(/backlog|待办/i)).toBeVisible();
  });

  test('model library page renders seeded models', async ({ page }) => {
    await page.goto('/models');
    await expect(page.getByRole('heading', { name: /Model Library|模型库/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'GPT-4', exact: true })).toBeVisible();
  });

  test('agents page opens new agent dialog', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.getByRole('heading', { name: /Agents|智能体/i })).toBeVisible();
    await page.getByRole('button', { name: /New Agent|新建智能体/i }).click();
    await expect(page.getByRole('heading', { name: /New Agent|新建智能体/i })).toBeVisible();
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  test('kanban new task dialog exposes richer fields', async ({ page, request }) => {
    await createAgent(request, `Agent-${Date.now()}`);
    await page.goto('/');
    await page.getByRole('button', { name: /New Task|新建任务/i }).click();
    await expect(page.locator('#task-priority')).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Assign Agents|分配智能体/i }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Depends On|依赖于/i }).first()).toBeVisible();
  });

  test('task detail route renders created task', async ({ page, request }) => {
    const agent = await createAgent(request, `Detail-Agent-${Date.now()}`);
    const created = await createTask(request, `Task-${Date.now()}`, null, agent.id);
    await page.goto(`/tasks/${created.task.id}`);
    await expect(page.getByRole('heading', { name: created.task.title, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Subtasks|子任务/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Assigned Agents|已分配智能体/i })).toBeVisible();
  });

  test('project detail route renders created project', async ({ page, request }) => {
    const project = await createProject(request, `Project-${Date.now()}`);
    await page.goto(`/project/${project.id}`);
    await expect(page.getByRole('heading', { name: project.name, exact: true })).toBeVisible();
    await expect(page.getByText(/Project Agents|项目智能体/i)).toBeVisible();
  });

  test('agent detail route renders created agent', async ({ page, request }) => {
    const agent = await createAgent(request, `Profile-Agent-${Date.now()}`);
    await page.goto(`/agent/${agent.id}`);
    await expect(page.getByRole('heading', { name: agent.name, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Assigned Tasks|已分配任务/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Recent Activity|最近活动/i })).toBeVisible();
  });
});
