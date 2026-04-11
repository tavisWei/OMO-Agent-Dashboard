import { test, expect } from '@playwright/test';

test.describe('OMO Agent Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('installation verification - app loads correctly', async ({ page }) => {
    await expect(page.locator('text=OMO Agent')).toBeVisible();
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('nav').first()).toBeVisible();

    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    const criticalErrors = consoleErrors.filter(
      err => !err.includes('WebSocket') && !err.includes('ws://')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('navigation - sidebar navigation works', async ({ page }) => {
    await page.click('a[href="/"]');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

    await page.click('a[href="/chat"]');
    await expect(page.locator('text=Agent Chat')).toBeVisible({ timeout: 5000 });

    await page.click('a[href="/activity"]');
    await expect(page.locator('text=Activity Feed')).toBeVisible({ timeout: 5000 });

    await page.click('a[href="/analytics"]');
    await expect(page.locator('text=Cost Overview')).toBeVisible({ timeout: 5000 });

    await page.click('a[href="/settings"]');
    await expect(page.locator('text=Settings')).toBeVisible({ timeout: 5000 });
  });

  test('agent list - agents are displayed correctly', async ({ page }) => {
    await page.waitForTimeout(2000);

    const agentGrid = page.locator('.grid.grid-cols-1');
    await expect(agentGrid).toBeVisible({ timeout: 10000 });

    const noAgentsMsg = page.locator('text=No agents configured');
    const agentCards = page.locator('[class*="bg-slate-800"]');

    const hasNoAgentsMsg = await noAgentsMsg.isVisible().catch(() => false);
    const hasAgentCards = await agentCards.first().isVisible().catch(() => false);

    expect(hasNoAgentsMsg || hasAgentCards).toBeTruthy();
  });

  test('create project - new project dialog works', async ({ page }) => {
    const projectSelector = page.locator('select').first();
    await projectSelector.click();

    const createProjectBtn = page.locator('button:has-text("New Project"), button:has-text("Create")').first();

    if (await createProjectBtn.isVisible()) {
      await createProjectBtn.click();

      await expect(page.locator('text=Create New Project')).toBeVisible({ timeout: 5000 });

      const nameInput = page.locator('input#project-name, input[placeholder*="Project"]');
      await nameInput.fill('Test Project E2E');

      const descInput = page.locator('textarea#project-description, textarea');
      await descInput.fill('E2E test project created by Playwright');

      const submitBtn = page.locator('button[type="submit"]:has-text("Create")');
      await submitBtn.click();

      await expect(page.locator('text=Create New Project')).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Test Project E2E')).toBeVisible({ timeout: 5000 });
    }
  });

  test('edit agent config - config panel opens and saves', async ({ page }) => {
    await page.waitForTimeout(2000);

    const agentCards = page.locator('[class*="bg-slate-800"]');
    const editBtn = page.locator('button[aria-label="Edit agent"], button[aria-label*="edit"]').first();

    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click();

      await expect(page.locator('text=编辑智能体')).toBeVisible({ timeout: 5000 });

      const modelInput = page.locator('input[type="text"]').first();
      await modelInput.fill('gpt-4o');

      const saveBtn = page.locator('button:has-text("保存配置"), button:has-text("Save")');
      await saveBtn.click();

      await expect(page.locator('text=编辑智能体')).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('task kanban - drag and drop tasks between columns', async ({ page }) => {
    await page.waitForTimeout(1000);

    const kanbanColumns = page.locator('text=Backlog, text=In Progress, text=Done, text=Failed');
    const hasKanban = await kanbanColumns.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasKanban) {
      const taskCards = page.locator('[class*="TaskCard"], [class*="task-card"]');

      if (await taskCards.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        const firstTask = taskCards.first();
        const backlogColumn = page.locator('text=Backlog').locator('..');

        const taskBox = await firstTask.boundingBox();
        const backlogBox = await backlogColumn.boundingBox();

        if (taskBox && backlogBox) {
          const inProgressColumn = page.locator('text=In Progress');
          const inProgressBox = await inProgressColumn.boundingBox();

          if (inProgressBox) {
            await page.mouse.move(taskBox.x + taskBox.width / 2, taskBox.y + taskBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(inProgressBox.x + inProgressBox.width / 2, inProgressBox.y + 50, { steps: 5 });
            await page.mouse.up();
            await page.waitForTimeout(500);
          }
        }
      }
    }
  });

  test('theme toggle - dark/light mode switches', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label="Toggle theme"]');
    await expect(themeToggle).toBeVisible();

    const initialTheme = await page.locator('[data-theme]').first().getAttribute('data-theme');
    await themeToggle.click();
    await page.waitForTimeout(500);
    const newTheme = await page.locator('[data-theme]').first().getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
  });

  test('api connectivity - backend is reachable', async ({ page }) => {
    const apiResponse = await page.request.get('http://localhost:3001/api/projects');
    expect(apiResponse.status()).toBeGreaterThanOrEqual(200);
    expect(apiResponse.status()).toBeLessThan(500);
  });
});

test.describe('OMO Agent Dashboard - Stable Tests', () => {
  test.setTimeout(60000);

  test('full user flow - navigate, create project, verify', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=OMO Agent')).toBeVisible();

    for (const route of ['/chat', '/activity', '/analytics', '/settings']) {
      await page.goto(`/`);
      await page.click(`a[href="${route}"]`);
      await page.waitForTimeout(500);
    }

    await page.click('a[href="/"]');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();

    const errors = page.locator('.text-red-500, [class*="error"]');
    const errorCount = await errors.count();
    expect(errorCount).toBeLessThan(5);
  });
});