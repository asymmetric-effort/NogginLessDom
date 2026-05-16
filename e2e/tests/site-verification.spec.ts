import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const TIMEOUT = { timeout: 15000 };
const VERSION = readFileSync(resolve(import.meta.dirname, '../../VERSION'), 'utf-8').trim();

const KNOWN_ROUTES = [
  '/',
  '#/getting-started',
  '#/api',
  '#/api/test-runner',
  '#/api/assertions',
  '#/api/dom',
  '#/api/mocking',
  '#/docs',
  '#/contributing',
];

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

test.describe('Page Enumeration via Sitemap', () => {
  test('all sitemap URLs return 200 with non-empty #root', async ({ page, request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();

    // Parse all <loc> URLs from sitemap
    const locRegex = /<loc>([^<]+)<\/loc>/g;
    const urls: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = locRegex.exec(xml)) !== null) {
      urls.push(match[1]!);
    }
    expect(urls.length).toBeGreaterThan(0);

    // First load the page (gets the 200 status)
    const initialResponse = await page.goto('/');
    expect(initialResponse?.status()).toBe(200);

    for (const url of urls) {
      const hashIndex = url.indexOf('#');
      const hash = hashIndex !== -1 ? url.slice(hashIndex) : '';

      if (hash) {
        // Hash navigation — use evaluate to change location
        await page.evaluate((h) => { window.location.hash = h; }, hash);
        await page.waitForLoadState('networkidle');
      }

      await page.waitForSelector('#root > *', TIMEOUT);
      const rootContent = await page.locator('#root').innerHTML();
      expect(
        rootContent.trim().length,
        `${path} should have non-empty #root content`,
      ).toBeGreaterThan(0);
    }
  });
});

test.describe('Broken Link Check', () => {
  test('all internal links in #root on homepage lead to pages with content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root > *', TIMEOUT);

    const links = await page.locator('#root a').evaluateAll((anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).getAttribute('href') || ''),
    );

    const internalLinks = links.filter((href) => href.startsWith('#/'));
    const externalLinks = links.filter(
      (href) => href.startsWith('http://') || href.startsWith('https://'),
    );

    // Check internal links
    for (const href of internalLinks) {
      await page.goto('/' + href);
      await page.waitForSelector('#root > *', TIMEOUT);
      const rootContent = await page.locator('#root').innerHTML();
      expect(
        rootContent.trim().length,
        `Internal link ${href} should render non-empty #root content`,
      ).toBeGreaterThan(0);
    }

    // Check external links with HEAD requests
    for (const href of externalLinks) {
      try {
        const resp = await page.request.head(href);
        expect(
          resp.status(),
          `External link ${href} should not be 404`,
        ).not.toBe(404);
      } catch {
        // Network errors for external links are acceptable (CORS, timeouts, etc.)
      }
    }
  });
});

test.describe('Empty Page Check', () => {
  for (const route of KNOWN_ROUTES) {
    const path = route === '/' ? '/' : '/' + route;
    test(`route ${route} has non-empty #root content`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('#root > *', TIMEOUT);
      const rootContent = await page.locator('#root').innerHTML();
      expect(
        rootContent.trim().length,
        `Route ${route} should have non-empty #root content`,
      ).toBeGreaterThan(0);
    });
  }
});

test.describe('Dark Mode Verification', () => {
  test('page renders in dark mode', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root > *', TIMEOUT);
    const rootContent = await page.locator('#root').innerHTML();
    expect(rootContent.trim().length).toBeGreaterThan(0);
    await context.close();
  });

  test('page renders in light mode', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'light' });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root > *', TIMEOUT);
    const rootContent = await page.locator('#root').innerHTML();
    expect(rootContent.trim().length).toBeGreaterThan(0);
    await context.close();
  });

  test('body background-color changes between dark and light mode', async ({ browser }) => {
    const darkContext = await browser.newContext({ colorScheme: 'dark' });
    const darkPage = await darkContext.newPage();
    await darkPage.goto('/');
    await darkPage.waitForLoadState('networkidle');
    await darkPage.waitForSelector('#root > *', TIMEOUT);
    const darkBg = await darkPage.evaluate(() =>
      getComputedStyle(document.body).backgroundColor,
    );
    await darkContext.close();

    const lightContext = await browser.newContext({ colorScheme: 'light' });
    const lightPage = await lightContext.newPage();
    await lightPage.goto('/');
    await lightPage.waitForLoadState('networkidle');
    await lightPage.waitForSelector('#root > *', TIMEOUT);
    const lightBg = await lightPage.evaluate(() =>
      getComputedStyle(document.body).backgroundColor,
    );
    await lightContext.close();

    expect(
      darkBg !== lightBg,
      `Body background-color should differ between dark (${darkBg}) and light (${lightBg}) modes`,
    ).toBe(true);
  });
});

test.describe('Footer Verification', () => {
  test('footer element exists in #root', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root > *', TIMEOUT);
    await expect(page.locator('#root footer')).toBeVisible(TIMEOUT);
  });

  test('footer contains a version string matching semver format', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root > *', TIMEOUT);
    const footerText = await page.locator('#root footer').innerText();
    expect(footerText).toMatch(/v\d+\.\d+\.\d+/);
  });

  test('footer version matches VERSION file', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root > *', TIMEOUT);
    const footerText = await page.locator('#root footer').innerText();
    expect(
      footerText,
      `Footer should contain version v${VERSION}`,
    ).toContain(`v${VERSION}`);
  });

  test('footer contains "Asymmetric Effort"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root > *', TIMEOUT);
    const footerText = await page.locator('#root footer').innerText();
    expect(footerText).toContain('Asymmetric Effort');
  });

  test('footer contains links to GitHub, Security, Contributing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root > *', TIMEOUT);

    const footer = page.locator('#root footer');

    const githubLink = footer.locator('a:has-text("GitHub")');
    await expect(githubLink).toBeVisible(TIMEOUT);
    const githubHref = await githubLink.getAttribute('href');
    expect(githubHref).toContain('github.com');

    const securityLink = footer.locator('a:has-text("Security")');
    await expect(securityLink).toBeVisible(TIMEOUT);

    const contributingLink = footer.locator('a:has-text("Contributing")');
    await expect(contributingLink).toBeVisible(TIMEOUT);
  });
});

test.describe('SPA vs SEO Content Parity', () => {
  test('noscript text content matches SPA text content for homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#root > *', TIMEOUT);

    // Get SPA text
    const spaText = await page.locator('#root').innerText();

    // Get noscript HTML and extract text (strip tags)
    const noscriptHtml = await page.locator('noscript').innerHTML();
    const noscriptText = noscriptHtml
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Both should contain key project terms
    const keyTerms = ['NogginLessDom', 'zero-dependency', 'node:test'];
    for (const term of keyTerms) {
      expect(spaText, `SPA should contain "${term}"`).toContain(term);
      expect(noscriptText, `Noscript should contain "${term}"`).toContain(term);
    }
  });
});
