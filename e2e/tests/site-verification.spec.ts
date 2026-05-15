import { test, expect } from '@playwright/test';

// SPA needs JS to hydrate — increase assertion timeout and wait for network idle
const TIMEOUT = { timeout: 15000 };

async function loadPage(page: ReturnType<typeof test.info>['project'] extends never ? never : Parameters<Parameters<typeof test>[1]>[0]['page'], path = '/') {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

test.describe('Site Deployment Verification', () => {
  test('homepage loads successfully', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('homepage has correct title', async ({ page }) => {
    await loadPage(page);
    await expect(page).toHaveTitle(/NogginLessDom/, TIMEOUT);
  });

  test('homepage displays project name', async ({ page }) => {
    await loadPage(page);
    await expect(page.locator('header >> text=NogginLessDom').first()).toBeVisible(TIMEOUT);
  });

  test('homepage has navigation links', async ({ page }) => {
    await loadPage(page);
    await expect(page.locator('a[href="#/getting-started"]')).toBeVisible(TIMEOUT);
    await expect(page.locator('a[href="#/api"]')).toBeVisible(TIMEOUT);
  });

  test('homepage has install command', async ({ page }) => {
    await loadPage(page);
    await expect(
      page.locator('text=nogginlessdom').first(),
    ).toBeVisible(TIMEOUT);
  });

  test('homepage has feature section', async ({ page }) => {
    await loadPage(page);
    await expect(page.locator('text=Zero Dependencies').first()).toBeVisible(TIMEOUT);
  });

  test('homepage has footer', async ({ page }) => {
    await loadPage(page);
    await expect(page.locator('footer')).toBeVisible(TIMEOUT);
  });
});

test.describe('Site Navigation', () => {
  test('getting started page loads', async ({ page }) => {
    await loadPage(page, '/#/getting-started');
    await expect(page.locator('text=Getting Started').first()).toBeVisible(TIMEOUT);
  });

  test('API reference page loads', async ({ page }) => {
    await loadPage(page, '/#/api');
    await expect(page.locator('text=API Reference').first()).toBeVisible(TIMEOUT);
  });

  test('docs page loads', async ({ page }) => {
    await loadPage(page, '/#/docs');
    await expect(page.locator('text=Documentation').first()).toBeVisible(TIMEOUT);
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    await loadPage(page, '/#/nonexistent');
    await expect(page.locator('text=404').first()).toBeVisible(TIMEOUT);
  });
});

test.describe('SEO Verification', () => {
  test('sitemap.xml exists and is valid', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('<urlset');
  });

  test('robots.txt exists and allows crawling', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('User-agent');
  });

  test('llms.txt exists', async ({ request }) => {
    const response = await request.get('/llms.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('NogginLessDom');
  });

  test('page has meta description', async ({ page }) => {
    await page.goto('/');
    const description = await page.getAttribute(
      'meta[name="description"]',
      'content',
    );
    expect(description).toBeTruthy();
  });
});
