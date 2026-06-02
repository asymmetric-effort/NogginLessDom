import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStyleSheet,
  collectApplicableStyles,
  collectApplicableStylesWithImportance,
} from '../../src/dom/css-cascade.js';
import type { MediaContext } from '../../src/dom/media-query.js';
import { Document, Element } from '../../src/dom/index.js';

function makeElement(doc: Document, tag: string, className?: string): Element {
  const el = doc.createElement(tag);
  if (className) el.className = className;
  return el;
}

describe('CSS @media rules in stylesheet parser', () => {
  describe('parseStyleSheet with @media', () => {
    it('should parse @media (min-width: 768px) block', () => {
      const css = `
        @media (min-width: 768px) {
          .container { width: 750px; }
        }
      `;
      const rules = parseStyleSheet(css);
      assert.equal(rules.length, 1);
      assert.equal(rules[0]!.selector, '.container');
      assert.equal(rules[0]!.properties.get('width'), '750px');
      assert.equal(rules[0]!.mediaQuery, '(min-width: 768px)');
    });

    it('should parse multiple rules inside @media', () => {
      const css = `
        @media (max-width: 600px) {
          .a { color: red; }
          .b { color: blue; }
        }
      `;
      const rules = parseStyleSheet(css);
      assert.equal(rules.length, 2);
      assert.equal(rules[0]!.mediaQuery, '(max-width: 600px)');
      assert.equal(rules[1]!.mediaQuery, '(max-width: 600px)');
    });

    it('should parse @media combined with regular rules', () => {
      const css = `
        .global { font-size: 14px; }
        @media (min-width: 768px) {
          .container { width: 750px; }
        }
        .footer { color: gray; }
      `;
      const rules = parseStyleSheet(css);
      assert.equal(rules.length, 3);
      assert.equal(rules[0]!.selector, '.global');
      assert.equal(rules[0]!.mediaQuery, undefined);
      assert.equal(rules[1]!.selector, '.container');
      assert.equal(rules[1]!.mediaQuery, '(min-width: 768px)');
      assert.equal(rules[2]!.selector, '.footer');
      assert.equal(rules[2]!.mediaQuery, undefined);
    });

    it('should parse multiple @media blocks', () => {
      const css = `
        @media (min-width: 768px) {
          .a { color: red; }
        }
        @media (max-width: 600px) {
          .b { color: blue; }
        }
      `;
      const rules = parseStyleSheet(css);
      assert.equal(rules.length, 2);
      assert.equal(rules[0]!.mediaQuery, '(min-width: 768px)');
      assert.equal(rules[1]!.mediaQuery, '(max-width: 600px)');
    });

    it('should skip non-media @-rules', () => {
      const css = `
        @charset "utf-8";
        @media (min-width: 768px) {
          .a { color: red; }
        }
      `;
      const rules = parseStyleSheet(css);
      assert.equal(rules.length, 1);
      assert.equal(rules[0]!.selector, '.a');
    });

    it('should handle complex media queries', () => {
      const css = `
        @media screen and (min-width: 768px) {
          .a { color: red; }
        }
      `;
      const rules = parseStyleSheet(css);
      assert.equal(rules.length, 1);
      assert.equal(rules[0]!.mediaQuery, 'screen and (min-width: 768px)');
    });
  });

  describe('collectApplicableStyles with mediaContext', () => {
    const wideContext: MediaContext = {
      width: 1024,
      height: 768,
      colorScheme: 'light',
      reducedMotion: false,
      mediaType: 'screen',
    };

    const narrowContext: MediaContext = {
      width: 500,
      height: 768,
      colorScheme: 'light',
      reducedMotion: false,
      mediaType: 'screen',
    };

    it('should apply @media rules when condition matches', () => {
      const css = `
        @media (min-width: 768px) {
          .container { width: 750px; }
        }
      `;
      const rules = parseStyleSheet(css);
      const doc = new Document();
      const el = makeElement(doc, 'div', 'container');

      const styles = collectApplicableStyles(el, rules, wideContext);
      assert.equal(styles.get('width'), '750px');
    });

    it('should not apply @media rules when condition does not match', () => {
      const css = `
        @media (min-width: 768px) {
          .container { width: 750px; }
        }
      `;
      const rules = parseStyleSheet(css);
      const doc = new Document();
      const el = makeElement(doc, 'div', 'container');

      const styles = collectApplicableStyles(el, rules, narrowContext);
      assert.equal(styles.get('width'), undefined);
    });

    it('should apply both regular and matching @media rules', () => {
      const css = `
        .container { color: black; }
        @media (min-width: 768px) {
          .container { width: 750px; }
        }
      `;
      const rules = parseStyleSheet(css);
      const doc = new Document();
      const el = makeElement(doc, 'div', 'container');

      const styles = collectApplicableStyles(el, rules, wideContext);
      assert.equal(styles.get('color'), 'black');
      assert.equal(styles.get('width'), '750px');
    });

    it('should skip @media rules when no mediaContext is provided', () => {
      const css = `
        .container { color: black; }
        @media (min-width: 768px) {
          .container { width: 750px; }
        }
      `;
      const rules = parseStyleSheet(css);
      const doc = new Document();
      const el = makeElement(doc, 'div', 'container');

      const styles = collectApplicableStyles(el, rules);
      assert.equal(styles.get('color'), 'black');
      assert.equal(styles.get('width'), undefined);
    });

    it('should handle max-width media query', () => {
      const css = `
        @media (max-width: 600px) {
          .mobile { display: block; }
        }
      `;
      const rules = parseStyleSheet(css);
      const doc = new Document();
      const el = makeElement(doc, 'div', 'mobile');

      const stylesNarrow = collectApplicableStyles(el, rules, narrowContext);
      assert.equal(stylesNarrow.get('display'), 'block');

      const stylesWide = collectApplicableStyles(el, rules, wideContext);
      assert.equal(stylesWide.get('display'), undefined);
    });
  });

  describe('collectApplicableStylesWithImportance with mediaContext', () => {
    it('should respect media queries in importance tracking', () => {
      const css = `
        .item { color: red; }
        @media (min-width: 768px) {
          .item { color: blue !important; }
        }
      `;
      const rules = parseStyleSheet(css);
      const doc = new Document();
      const el = makeElement(doc, 'div', 'item');

      const wideCtx: MediaContext = {
        width: 1024,
        height: 768,
        colorScheme: 'light',
        reducedMotion: false,
        mediaType: 'screen',
      };

      const { styles, important } = collectApplicableStylesWithImportance(
        el,
        rules,
        wideCtx,
      );
      assert.equal(styles.get('color'), 'blue');
      assert.ok(important.has('color'));
    });

    it('should skip media rules when context not provided', () => {
      const css = `
        .item { color: red; }
        @media (min-width: 768px) {
          .item { color: blue !important; }
        }
      `;
      const rules = parseStyleSheet(css);
      const doc = new Document();
      const el = makeElement(doc, 'div', 'item');

      const { styles } = collectApplicableStylesWithImportance(el, rules);
      assert.equal(styles.get('color'), 'red');
    });
  });

  describe('Nested @media rules', () => {
    it('should handle media rules with multiple selectors', () => {
      const css = `
        @media (min-width: 768px) {
          .a, .b { color: red; }
        }
      `;
      const rules = parseStyleSheet(css);
      assert.equal(rules.length, 2);
      assert.equal(rules[0]!.selector, '.a');
      assert.equal(rules[1]!.selector, '.b');
      assert.equal(rules[0]!.mediaQuery, '(min-width: 768px)');
      assert.equal(rules[1]!.mediaQuery, '(min-width: 768px)');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty @media block', () => {
      const css = `
        @media (min-width: 768px) { }
      `;
      const rules = parseStyleSheet(css);
      assert.equal(rules.length, 0);
    });

    it('should handle @media with important properties', () => {
      const css = `
        @media (min-width: 768px) {
          .a { color: red !important; }
        }
      `;
      const rules = parseStyleSheet(css);
      assert.equal(rules.length, 1);
      assert.ok(rules[0]!.importantProperties?.has('color'));
    });
  });
});
