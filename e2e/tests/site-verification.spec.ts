import { test, expect } from '@playwright/test';

test.describe('Site Deployment Verification', () => {
  test('homepage loads successfully', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('homepage has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NogginLessDom/);
  });

  test('homepage displays project name', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=NogginLessDom')).toBeVisible();
  });

  test('homepage has navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('a[href="#/getting-started"]')).toBeVisible();
    await expect(page.locator('a[href="#/api"]')).toBeVisible();
  });

  test('homepage has hero section with install command', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('text=bun add -d @asymmetric-effort/nogginlessdom'),
    ).toBeVisible();
  });

  test('homepage has feature cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Zero Dependencies')).toBeVisible();
    await expect(page.locator('text=Vitest Parity')).toBeVisible();
    await expect(page.locator('text=DOM Simulation')).toBeVisible();
    await expect(page.locator('text=Supply Chain Security')).toBeVisible();
  });

  test('homepage has footer with copyright', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer')).toBeVisible();
    await expect(
      page.locator('text=Asymmetric Effort, LLC'),
    ).toBeVisible();
  });
});

test.describe('Site Navigation', () => {
  test('getting started page loads', async ({ page }) => {
    await page.goto('/#/getting-started');
    await expect(page.locator('text=Getting Started')).toBeVisible();
  });

  test('API reference page loads', async ({ page }) => {
    await page.goto('/#/api');
    await expect(page.locator('text=API Reference')).toBeVisible();
  });

  test('docs page loads', async ({ page }) => {
    await page.goto('/#/docs');
    await expect(page.locator('text=Documentation')).toBeVisible();
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/#/nonexistent');
    await expect(page.locator('text=404')).toBeVisible();
  });

  test('navigation between pages works', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="#/getting-started"]');
    await expect(page.locator('text=Installation')).toBeVisible();
    await page.click('a[href="#/"]');
    await expect(page.locator('text=NogginLessDom')).toBeVisible();
  });
});

test.describe('SEO Verification', () => {
  test('sitemap.xml exists and is valid', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('<urlset');
    expect(body).toContain('nogginlessdom.asymmetric-effort.com');
  });

  test('robots.txt exists and allows crawling', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('User-agent');
    expect(body).toContain('Allow');
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
    expect(description).toContain('zero-dependency');
  });

  test('page has JSON-LD structured data', async ({ page }) => {
    await page.goto('/');
    const jsonLd = await page.locator(
      'script[type="application/ld+json"]',
    );
    await expect(jsonLd).toBeAttached();
    const content = await jsonLd.textContent();
    expect(content).toContain('NogginLessDom');
  });

  test('noscript fallback exists', async ({ page }) => {
    await page.goto('/');
    const noscript = await page.locator('noscript');
    await expect(noscript).toBeAttached();
  });
});
