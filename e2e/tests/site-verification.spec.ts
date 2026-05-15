import { test, expect } from '@playwright/test';

const TIMEOUT = { timeout: 30000 };

test.describe('Site Deployment Verification', () => {
  test('homepage loads and JS renders content', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Wait for JS to execute
    await page.waitForLoadState('networkidle');

    // Log page content for debugging if #root is empty
    const rootContent = await page.locator('#root').innerHTML();
    if (!rootContent || rootContent.trim() === '') {
      const bodyHTML = await page.locator('body').innerHTML();
      console.log('Page body HTML:', bodyHTML.slice(0, 2000));
      console.log('Console errors:', consoleErrors);
    }

    // The #root div should have content after SPA hydration
    expect(rootContent.length).toBeGreaterThan(0);
  });

  test('homepage has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NogginLessDom/, TIMEOUT);
  });

  test('page has meta description', async ({ page }) => {
    await page.goto('/');
    const description = await page.getAttribute(
      'meta[name="description"]',
      'content',
    );
    expect(description).toBeTruthy();
  });

  test('SPA renders visible content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for any content to appear in #root
    await page.waitForSelector('#root > *', { timeout: 15000 }).catch(() => {});

    // Get what actually rendered
    const rootChildren = await page.locator('#root').evaluate(
      (el) => el.children.length,
    );

    // If SPA rendered, check for expected elements
    if (rootChildren > 0) {
      // Check for any text content on the page
      const pageText = await page.locator('#root').textContent();
      expect(pageText).toBeTruthy();
    } else {
      // SPA didn't render — capture diagnostics
      const html = await page.content();
      console.log('Full page HTML (first 3000 chars):', html.slice(0, 3000));
      // Fail with descriptive message
      expect(rootChildren, 'SPA should render content into #root').toBeGreaterThan(0);
    }
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
});
