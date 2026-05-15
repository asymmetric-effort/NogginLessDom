import { test, expect } from '@playwright/test';

test.describe('Site Deployment Verification', () => {
  test('homepage loads with 200 status', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('homepage has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NogginLessDom/);
  });

  test('page has meta description', async ({ page }) => {
    await page.goto('/');
    const description = await page.getAttribute(
      'meta[name="description"]',
      'content',
    );
    expect(description).toBeTruthy();
    expect(description).toContain('NogginLessDom');
  });

  test('page has noscript fallback content', async ({ page }) => {
    await page.goto('/');
    const noscript = page.locator('noscript');
    await expect(noscript).toBeAttached();
    const noscriptHTML = await noscript.innerHTML();
    expect(noscriptHTML).toContain('NogginLessDom');
    expect(noscriptHTML).toContain('Getting Started');
    expect(noscriptHTML).toContain('API Reference');
  });

  test('page has JS bundle loaded', async ({ page }) => {
    await page.goto('/');
    const scripts = await page.locator('script[type="module"]').count();
    expect(scripts).toBeGreaterThan(0);
  });

  test('page has root mount point', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });
});

test.describe('SEO Verification', () => {
  test('sitemap.xml exists and is valid', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('<urlset');
    expect(body).toContain('<url>');
  });

  test('robots.txt exists and allows crawling', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('User-agent');
    expect(body).toContain('Allow');
  });

  test('llms.txt exists with project info', async ({ request }) => {
    const response = await request.get('/llms.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('NogginLessDom');
  });

  test('favicon exists', async ({ request }) => {
    // Try PNG logo first, fall back to SVG
    const pngResponse = await request.get('/logo.png');
    const svgResponse = await request.get('/favicon.svg');
    const hasIcon =
      pngResponse.status() === 200 || svgResponse.status() === 200;
    expect(hasIcon).toBe(true);
  });
});

test.describe('Static Assets', () => {
  test('JS bundle is served', async ({ request }) => {
    const response = await request.get('/');
    const html = await response.text();
    // Extract the JS bundle path from the HTML
    const match = /src="([^"]*\.js)"/.exec(html);
    if (match) {
      const jsResponse = await request.get(match[1]!);
      expect(jsResponse.status()).toBe(200);
    }
  });
});
