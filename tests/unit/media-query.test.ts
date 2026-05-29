import assert from 'node:assert';
import { describe, it } from '../../src/test-runner/index.js';
import {
  parseMediaQuery,
  evaluateMediaQuery,
} from '../../src/dom/media-query.js';
import { Window } from '../../src/dom/window.js';
import type { MediaContext } from '../../src/dom/media-query.js';

const defaultContext: MediaContext = {
  width: 1024,
  height: 768,
  colorScheme: 'light',
  reducedMotion: false,
  mediaType: 'screen',
};

describe('parseMediaQuery', () => {
  it('should parse (min-width: 768px)', () => {
    const result = parseMediaQuery('(min-width: 768px)');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.negated, false);
    assert.strictEqual(result[0]!.conditions.length, 1);
    assert.deepStrictEqual(result[0]!.conditions[0], {
      type: 'min-width',
      value: 768,
    });
  });

  it('should parse (max-width: 1024px)', () => {
    const result = parseMediaQuery('(max-width: 1024px)');
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0]!.conditions[0], {
      type: 'max-width',
      value: 1024,
    });
  });

  it('should parse (min-height: 600px) and (max-height: 900px)', () => {
    const minResult = parseMediaQuery('(min-height: 600px)');
    assert.deepStrictEqual(minResult[0]!.conditions[0], {
      type: 'min-height',
      value: 600,
    });

    const maxResult = parseMediaQuery('(max-height: 900px)');
    assert.deepStrictEqual(maxResult[0]!.conditions[0], {
      type: 'max-height',
      value: 900,
    });
  });

  it('should parse screen and (min-width: 768px)', () => {
    const result = parseMediaQuery('screen and (min-width: 768px)');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.conditions.length, 2);
    assert.deepStrictEqual(result[0]!.conditions[0], {
      type: 'media-type',
      value: 'screen',
    });
    assert.deepStrictEqual(result[0]!.conditions[1], {
      type: 'min-width',
      value: 768,
    });
  });

  it('should parse not print', () => {
    const result = parseMediaQuery('not print');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.negated, true);
    assert.deepStrictEqual(result[0]!.conditions[0], {
      type: 'media-type',
      value: 'print',
    });
  });

  it('should parse comma-separated: screen, print', () => {
    const result = parseMediaQuery('screen, print');
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0]!.conditions[0], {
      type: 'media-type',
      value: 'screen',
    });
    assert.deepStrictEqual(result[1]!.conditions[0], {
      type: 'media-type',
      value: 'print',
    });
  });

  it('should parse (prefers-color-scheme: dark)', () => {
    const result = parseMediaQuery('(prefers-color-scheme: dark)');
    assert.deepStrictEqual(result[0]!.conditions[0], {
      type: 'prefers-color-scheme',
      value: 'dark',
    });
  });

  it('should parse (prefers-reduced-motion: reduce)', () => {
    const result = parseMediaQuery('(prefers-reduced-motion: reduce)');
    assert.deepStrictEqual(result[0]!.conditions[0], {
      type: 'prefers-reduced-motion',
      value: 'reduce',
    });
  });

  it('should return unknown condition for invalid query', () => {
    const result = parseMediaQuery('invalid-query');
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0]!.conditions[0], { type: 'unknown' });
  });

  it('should return unknown for empty query', () => {
    const result = parseMediaQuery('');
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0]!.conditions[0], { type: 'unknown' });
  });

  it('should return unknown for condition without parens', () => {
    const result = parseMediaQuery('(gibberish)');
    assert.deepStrictEqual(result[0]!.conditions[0], { type: 'unknown' });
  });

  it('should return unknown for non-px values', () => {
    const result = parseMediaQuery('(min-width: 50em)');
    assert.deepStrictEqual(result[0]!.conditions[0], { type: 'unknown' });
  });

  it('should return unknown for unsupported CSS property in parens', () => {
    const result = parseMediaQuery('(color: red)');
    assert.deepStrictEqual(result[0]!.conditions[0], { type: 'unknown' });
  });
});

describe('evaluateMediaQuery', () => {
  it('should evaluate min-width: true when width >= value', () => {
    const parsed = parseMediaQuery('(min-width: 768px)');
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, width: 768 }),
      true,
    );
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, width: 1024 }),
      true,
    );
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, width: 500 }),
      false,
    );
  });

  it('should evaluate max-width: true when width <= value', () => {
    const parsed = parseMediaQuery('(max-width: 1024px)');
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, width: 1024 }),
      true,
    );
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, width: 500 }),
      true,
    );
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, width: 1200 }),
      false,
    );
  });

  it('should evaluate min-height and max-height', () => {
    const minH = parseMediaQuery('(min-height: 600px)');
    assert.strictEqual(
      evaluateMediaQuery(minH, { ...defaultContext, height: 600 }),
      true,
    );
    assert.strictEqual(
      evaluateMediaQuery(minH, { ...defaultContext, height: 400 }),
      false,
    );

    const maxH = parseMediaQuery('(max-height: 900px)');
    assert.strictEqual(
      evaluateMediaQuery(maxH, { ...defaultContext, height: 900 }),
      true,
    );
    assert.strictEqual(
      evaluateMediaQuery(maxH, { ...defaultContext, height: 1000 }),
      false,
    );
  });

  it('should evaluate and conditions (both must match)', () => {
    const parsed = parseMediaQuery(
      'screen and (min-width: 768px) and (max-width: 1024px)',
    );
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, width: 800 }),
      true,
    );
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, width: 500 }),
      false,
    );
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, width: 1200 }),
      false,
    );
  });

  it('should evaluate not negation', () => {
    const parsed = parseMediaQuery('not print');
    // Default mediaType is 'screen', so not print => true
    assert.strictEqual(evaluateMediaQuery(parsed, defaultContext), true);
    // When mediaType is 'print', not print => false
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, mediaType: 'print' }),
      false,
    );
  });

  it('should evaluate comma-separated (OR)', () => {
    const parsed = parseMediaQuery('(min-width: 2000px), (max-width: 600px)');
    // Width 500 matches max-width: 600px
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, width: 500 }),
      true,
    );
    // Width 3000 matches min-width: 2000px
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, width: 3000 }),
      true,
    );
    // Width 1000 matches neither
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, width: 1000 }),
      false,
    );
  });

  it('should evaluate media type all', () => {
    const parsed = parseMediaQuery('all');
    assert.strictEqual(evaluateMediaQuery(parsed, defaultContext), true);
  });

  it('should evaluate prefers-color-scheme', () => {
    const parsed = parseMediaQuery('(prefers-color-scheme: dark)');
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, colorScheme: 'dark' }),
      true,
    );
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, colorScheme: 'light' }),
      false,
    );
  });

  it('should evaluate prefers-reduced-motion', () => {
    const parsed = parseMediaQuery('(prefers-reduced-motion: reduce)');
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, reducedMotion: true }),
      true,
    );
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, reducedMotion: false }),
      false,
    );
  });

  it('should evaluate prefers-reduced-motion: no-preference', () => {
    const parsed = parseMediaQuery('(prefers-reduced-motion: no-preference)');
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, reducedMotion: false }),
      true,
    );
    assert.strictEqual(
      evaluateMediaQuery(parsed, { ...defaultContext, reducedMotion: true }),
      false,
    );
  });

  it('should return false for unknown conditions', () => {
    const parsed = parseMediaQuery('invalid-query');
    assert.strictEqual(evaluateMediaQuery(parsed, defaultContext), false);
  });
});

describe('MediaQueryList dynamic matching', () => {
  it('matchMedia returns correct matches based on innerWidth', () => {
    const win = new Window({ innerWidth: 1024, innerHeight: 768 });
    const mql = win.matchMedia('(min-width: 768px)');
    assert.strictEqual(mql.matches, true);

    const mql2 = win.matchMedia('(min-width: 1200px)');
    assert.strictEqual(mql2.matches, false);
  });

  it('matchMedia evaluates max-width correctly', () => {
    const win = new Window({ innerWidth: 600, innerHeight: 768 });
    const mql = win.matchMedia('(max-width: 768px)');
    assert.strictEqual(mql.matches, true);

    const mql2 = win.matchMedia('(max-width: 400px)');
    assert.strictEqual(mql2.matches, false);
  });

  it('changing dimensions via setDimensions fires change event', () => {
    const win = new Window({ innerWidth: 500, innerHeight: 768 });
    const mql = win.matchMedia('(min-width: 768px)');
    assert.strictEqual(mql.matches, false);

    let eventFired = false;
    let eventMatches: boolean | null = null;
    mql.addEventListener('change', (e) => {
      eventFired = true;
      eventMatches = e.matches;
    });

    win.setDimensions(1024, 768);
    assert.strictEqual(mql.matches, true);
    assert.strictEqual(eventFired, true);
    assert.strictEqual(eventMatches, true);
  });

  it('change event only fires when matches state actually changes', () => {
    const win = new Window({ innerWidth: 1024, innerHeight: 768 });
    const mql = win.matchMedia('(min-width: 768px)');
    assert.strictEqual(mql.matches, true);

    let callCount = 0;
    mql.addEventListener('change', () => {
      callCount++;
    });

    // Change dimensions but still above 768px - no change event
    win.setDimensions(900, 768);
    assert.strictEqual(callCount, 0);
    assert.strictEqual(mql.matches, true);

    // Drop below 768px - should fire
    win.setDimensions(600, 768);
    assert.strictEqual(callCount, 1);
    assert.strictEqual(mql.matches, false);
  });

  it('prefers-color-scheme matches configured scheme', () => {
    const winDark = new Window({ colorScheme: 'dark' });
    const mqlDark = winDark.matchMedia('(prefers-color-scheme: dark)');
    assert.strictEqual(mqlDark.matches, true);

    const winLight = new Window({ colorScheme: 'light' });
    const mqlLight = winLight.matchMedia('(prefers-color-scheme: dark)');
    assert.strictEqual(mqlLight.matches, false);
  });

  it('prefers-reduced-motion matches configuration', () => {
    const winReduced = new Window({ reducedMotion: true });
    const mql = winReduced.matchMedia('(prefers-reduced-motion: reduce)');
    assert.strictEqual(mql.matches, true);

    const winDefault = new Window({ reducedMotion: false });
    const mql2 = winDefault.matchMedia('(prefers-reduced-motion: reduce)');
    assert.strictEqual(mql2.matches, false);
  });

  it('setDimensions updates innerWidth and innerHeight', () => {
    const win = new Window({ innerWidth: 800, innerHeight: 600 });
    win.setDimensions(1920, 1080);
    assert.strictEqual(win.innerWidth, 1920);
    assert.strictEqual(win.innerHeight, 1080);
  });

  it('setDimensions fires change on height-based queries', () => {
    const win = new Window({ innerWidth: 1024, innerHeight: 500 });
    const mql = win.matchMedia('(min-height: 768px)');
    assert.strictEqual(mql.matches, false);

    let fired = false;
    mql.addEventListener('change', () => {
      fired = true;
    });

    win.setDimensions(1024, 900);
    assert.strictEqual(mql.matches, true);
    assert.strictEqual(fired, true);
  });

  it('deprecated addListener/removeListener still work', () => {
    const win = new Window();
    const mql = win.matchMedia('(min-width: 768px)');
    let called = false;
    const listener = (): void => {
      called = true;
    };
    mql.addListener(listener);
    mql.removeListener(listener);
    assert.strictEqual(called, false);
  });

  it('media property returns the query string', () => {
    const win = new Window();
    const mql = win.matchMedia('(max-width: 600px)');
    assert.strictEqual(mql.media, '(max-width: 600px)');
  });

  it('defaults colorScheme to light and reducedMotion to false', () => {
    const win = new Window();
    const mqlScheme = win.matchMedia('(prefers-color-scheme: light)');
    assert.strictEqual(mqlScheme.matches, true);

    const mqlMotion = win.matchMedia('(prefers-reduced-motion: reduce)');
    assert.strictEqual(mqlMotion.matches, false);
  });
});
