import { test, expect } from '@playwright/test';

const TIMEOUT = { timeout: 15000 };

test.describe('Site Deployment Verification', () => {
  test('homepage loads with 200 status', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
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
    expect(description).toContain('NogginLessDom');
  });
});

test.describe('Noscript Fallback Verification', () => {
  test('noscript contains project name and description', async ({ page }) => {
    await page.goto('/');
    const noscript = page.locator('noscript');
    await expect(noscript).toBeAttached();
    const html = await noscript.innerHTML();
    expect(html).toContain('NogginLessDom');
  });

  test('noscript contains all navigation sections', async ({ page }) => {
    await page.goto('/');
    const html = await page.locator('noscript').innerHTML();
    expect(html).toContain('Getting Started');
    expect(html).toContain('API Reference');
    expect(html).toContain('Contributing');
  });

  test('noscript contains install command', async ({ page }) => {
    await page.goto('/');
    const html = await page.locator('noscript').innerHTML();
    expect(html).toContain('bun add -d @asymmetric-effort/nogginlessdom');
  });
});

test.describe('SPA Rendering Verification', () => {
  test('SPA renders content into #root', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for SPA to render
    await page.waitForSelector('#root > *', TIMEOUT);

    const rootContent = await page.locator('#root').innerHTML();
    expect(
      rootContent.trim().length,
      `SPA did not render into #root. JS errors: ${errors.join('; ') || 'none'}`,
    ).toBeGreaterThan(0);
  });

  test('SPA renders header with project name', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root > *', TIMEOUT);
    await expect(page.locator('#root header')).toBeVisible(TIMEOUT);
    await expect(
      page.locator('#root header >> text=NogginLessDom'),
    ).toBeVisible(TIMEOUT);
  });

  test('SPA renders navigation links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root > *', TIMEOUT);
    await expect(
      page.locator('#root header a[href="#/getting-started"]'),
    ).toBeVisible(TIMEOUT);
    await expect(
      page.locator('#root header a[href="#/api"]'),
    ).toBeVisible(TIMEOUT);
  });

  test('SPA renders footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root > *', TIMEOUT);
    await expect(page.locator('#root footer')).toBeVisible(TIMEOUT);
  });

  test('SPA hash navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root > *', TIMEOUT);

    // Navigate to getting-started
    await page.click('a[href="#/getting-started"]');
    await expect(
      page.locator('#root >> text=Getting Started').first(),
    ).toBeVisible(TIMEOUT);

    // Navigate back home
    await page.click('a[href="#/"]');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('#root h1 >> text=NogginLessDom').first(),
    ).toBeVisible(TIMEOUT);
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

  test('JSON-LD structured data is present', async ({ page }) => {
    await page.goto('/');
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toBeAttached();
    const content = await jsonLd.textContent();
    expect(content).toContain('NogginLessDom');
    expect(content).toContain('SoftwareSourceCode');
  });

  test('favicon or logo exists', async ({ request }) => {
    const pngResponse = await request.get('/logo.png');
    const svgResponse = await request.get('/favicon.svg');
    expect(
      pngResponse.status() === 200 || svgResponse.status() === 200,
    ).toBe(true);
  });
});
