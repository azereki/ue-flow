import { test, expect } from '@playwright/test';

test.describe('ue-flow smoke tests', () => {
  test('mock-render loads and displays nodes', async ({ page }) => {
    await page.goto('/examples/mock-render.html');

    // Wait for React Flow to render nodes
    await page.waitForSelector('.react-flow__nodes', { timeout: 10_000 });

    // Verify blueprint nodes rendered
    const nodes = page.locator('.react-flow__node');
    await expect(nodes.first()).toBeVisible();
    const count = await nodes.count();
    expect(count).toBeGreaterThan(0);
  });

  test('comment nodes render behind regular nodes', async ({ page }) => {
    await page.goto('/examples/mock-render.html');
    await page.waitForSelector('.react-flow__nodes', { timeout: 10_000 });

    // Comment nodes should exist
    const comments = page.locator('.react-flow__node-commentNode');
    await expect(comments.first()).toBeVisible();

    // Comment nodes should have negative z-index (behind regular nodes)
    const zIndex = await comments.first().evaluate(
      (el) => window.getComputedStyle(el).zIndex,
    );
    expect(Number(zIndex)).toBeLessThan(0);
  });

  test('sidebar sections are expandable', async ({ page }) => {
    await page.goto('/examples/mock-render.html');
    await page.waitForSelector('.react-flow__nodes', { timeout: 10_000 });

    // Sidebar section headers should be visible as expandable buttons
    await expect(page.getByRole('button', { name: /EVENTS \d/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /FUNCTIONS \d/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /VARIABLES \d/ })).toBeVisible();
  });

  test('tab bar shows active graph', async ({ page }) => {
    await page.goto('/examples/mock-render.html');
    await page.waitForSelector('.react-flow__nodes', { timeout: 10_000 });

    // EventGraph tab should be visible and active
    const tab = page.locator('[role="tab"]').first();
    await expect(tab).toBeVisible();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  test('export toolbar buttons are present', async ({ page }) => {
    await page.goto('/examples/mock-render.html');
    await page.waitForSelector('.react-flow__nodes', { timeout: 10_000 });

    await expect(page.getByRole('button', { name: /Copy T3D/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /JSON/i })).toBeVisible();
  });
});
