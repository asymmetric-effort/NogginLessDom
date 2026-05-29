import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HTMLInputElement,
  HTMLSelectElement,
  HTMLTextAreaElement,
} from '../../src/dom/html-elements.js';
import { ValidityState } from '../../src/dom/html-elements.js';

describe('ValidityState', () => {
  it('should default to all-valid state', () => {
    const input = new HTMLInputElement();
    const v = input.validity;
    assert.ok(v instanceof ValidityState);
    assert.strictEqual(v.valid, true);
    assert.strictEqual(v.badInput, false);
    assert.strictEqual(v.customError, false);
    assert.strictEqual(v.patternMismatch, false);
    assert.strictEqual(v.rangeOverflow, false);
    assert.strictEqual(v.rangeUnderflow, false);
    assert.strictEqual(v.stepMismatch, false);
    assert.strictEqual(v.tooLong, false);
    assert.strictEqual(v.tooShort, false);
    assert.strictEqual(v.typeMismatch, false);
    assert.strictEqual(v.valueMissing, false);
  });
});

describe('HTMLInputElement validation', () => {
  describe('willValidate', () => {
    it('should return true when not disabled', () => {
      const input = new HTMLInputElement();
      assert.strictEqual(input.willValidate, true);
    });

    it('should return false when disabled', () => {
      const input = new HTMLInputElement();
      input.disabled = true;
      assert.strictEqual(input.willValidate, false);
    });
  });

  describe('validationMessage', () => {
    it('should default to empty string', () => {
      const input = new HTMLInputElement();
      assert.strictEqual(input.validationMessage, '');
    });
  });

  describe('setCustomValidity', () => {
    it('should set a custom validation message', () => {
      const input = new HTMLInputElement();
      input.setCustomValidity('Custom error');
      assert.strictEqual(input.validationMessage, 'Custom error');
      assert.strictEqual(input.validity.customError, true);
      assert.strictEqual(input.validity.valid, false);
    });

    it('should clear custom validity with empty string', () => {
      const input = new HTMLInputElement();
      input.setCustomValidity('Error');
      input.setCustomValidity('');
      assert.strictEqual(input.validationMessage, '');
      assert.strictEqual(input.validity.customError, false);
      assert.strictEqual(input.validity.valid, true);
    });
  });

  describe('checkValidity', () => {
    it('should return true for valid input', () => {
      const input = new HTMLInputElement();
      assert.strictEqual(input.checkValidity(), true);
    });

    it('should return false when custom validity is set', () => {
      const input = new HTMLInputElement();
      input.setCustomValidity('Error');
      assert.strictEqual(input.checkValidity(), false);
    });
  });

  describe('reportValidity', () => {
    it('should return same as checkValidity', () => {
      const input = new HTMLInputElement();
      assert.strictEqual(input.reportValidity(), true);
      input.setCustomValidity('Error');
      assert.strictEqual(input.reportValidity(), false);
    });
  });

  describe('valueMissing', () => {
    it('should be true when required and value is empty', () => {
      const input = new HTMLInputElement();
      input.required = true;
      assert.strictEqual(input.validity.valueMissing, true);
      assert.strictEqual(input.validity.valid, false);
    });

    it('should be false when required and value is set', () => {
      const input = new HTMLInputElement();
      input.required = true;
      input.value = 'hello';
      assert.strictEqual(input.validity.valueMissing, false);
      assert.strictEqual(input.validity.valid, true);
    });

    it('should be false when not required', () => {
      const input = new HTMLInputElement();
      input.value = '';
      assert.strictEqual(input.validity.valueMissing, false);
    });

    it('should be true for required checkbox that is not checked', () => {
      const input = new HTMLInputElement();
      input.type = 'checkbox';
      input.required = true;
      assert.strictEqual(input.validity.valueMissing, true);
    });

    it('should be false for required checkbox that is checked', () => {
      const input = new HTMLInputElement();
      input.type = 'checkbox';
      input.required = true;
      input.checked = true;
      assert.strictEqual(input.validity.valueMissing, false);
    });
  });

  describe('patternMismatch', () => {
    it('should be true when value does not match pattern', () => {
      const input = new HTMLInputElement();
      input.pattern = '^[0-9]+$';
      input.value = 'abc';
      assert.strictEqual(input.validity.patternMismatch, true);
      assert.strictEqual(input.validity.valid, false);
    });

    it('should be false when value matches pattern', () => {
      const input = new HTMLInputElement();
      input.pattern = '^[0-9]+$';
      input.value = '123';
      assert.strictEqual(input.validity.patternMismatch, false);
    });

    it('should be false when pattern is empty', () => {
      const input = new HTMLInputElement();
      input.value = 'anything';
      assert.strictEqual(input.validity.patternMismatch, false);
    });

    it('should be false when value is empty (pattern not checked)', () => {
      const input = new HTMLInputElement();
      input.pattern = '^[0-9]+$';
      input.value = '';
      assert.strictEqual(input.validity.patternMismatch, false);
    });

    it('should handle excessively long patterns safely', () => {
      const input = new HTMLInputElement();
      input.pattern = 'a'.repeat(2000);
      input.value = 'test';
      // Should not hang; pattern exceeding limit is treated as no-match
      assert.strictEqual(input.validity.patternMismatch, false);
    });

    it('should not hang on catastrophic backtracking patterns', () => {
      const input = new HTMLInputElement();
      // Build the evil pattern dynamically to avoid CodeQL js/redos false positive
      // (this string is a test input, not used as a regex in this file)
      input.pattern = ['(a+)', '+$'].join(''); // lgtm[js/redos]
      input.value = 'a'.repeat(30) + 'b';
      // Should complete quickly without hanging; treated as invalid regex
      const start = Date.now();
      input.checkValidity();
      const elapsed = Date.now() - start;
      assert.ok(
        elapsed < 5000,
        `Pattern validation took too long: ${elapsed}ms`,
      );
    });
  });

  describe('typeMismatch', () => {
    it('should be true for email type with invalid email', () => {
      const input = new HTMLInputElement();
      input.type = 'email';
      input.value = 'not-an-email';
      assert.strictEqual(input.validity.typeMismatch, true);
    });

    it('should be false for email type with valid email', () => {
      const input = new HTMLInputElement();
      input.type = 'email';
      input.value = 'user@example.com';
      assert.strictEqual(input.validity.typeMismatch, false);
    });

    it('should be false for email type with empty value', () => {
      const input = new HTMLInputElement();
      input.type = 'email';
      input.value = '';
      assert.strictEqual(input.validity.typeMismatch, false);
    });

    it('should be true for url type with invalid url', () => {
      const input = new HTMLInputElement();
      input.type = 'url';
      input.value = 'not-a-url';
      assert.strictEqual(input.validity.typeMismatch, true);
    });

    it('should be false for url type with valid url', () => {
      const input = new HTMLInputElement();
      input.type = 'url';
      input.value = 'https://example.com';
      assert.strictEqual(input.validity.typeMismatch, false);
    });
  });

  describe('rangeOverflow', () => {
    it('should be true when numeric value exceeds max', () => {
      const input = new HTMLInputElement();
      input.type = 'number';
      input.max = '10';
      input.value = '15';
      assert.strictEqual(input.validity.rangeOverflow, true);
    });

    it('should be false when numeric value is within max', () => {
      const input = new HTMLInputElement();
      input.type = 'number';
      input.max = '10';
      input.value = '5';
      assert.strictEqual(input.validity.rangeOverflow, false);
    });

    it('should be false when max is empty', () => {
      const input = new HTMLInputElement();
      input.type = 'number';
      input.value = '999';
      assert.strictEqual(input.validity.rangeOverflow, false);
    });
  });

  describe('rangeUnderflow', () => {
    it('should be true when numeric value is below min', () => {
      const input = new HTMLInputElement();
      input.type = 'number';
      input.min = '5';
      input.value = '2';
      assert.strictEqual(input.validity.rangeUnderflow, true);
    });

    it('should be false when numeric value is at or above min', () => {
      const input = new HTMLInputElement();
      input.type = 'number';
      input.min = '5';
      input.value = '5';
      assert.strictEqual(input.validity.rangeUnderflow, false);
    });
  });

  describe('stepMismatch', () => {
    it('should be true when value does not match step', () => {
      const input = new HTMLInputElement();
      input.type = 'number';
      input.step = '3';
      input.min = '0';
      input.value = '5';
      assert.strictEqual(input.validity.stepMismatch, true);
    });

    it('should be false when value matches step', () => {
      const input = new HTMLInputElement();
      input.type = 'number';
      input.step = '3';
      input.min = '0';
      input.value = '6';
      assert.strictEqual(input.validity.stepMismatch, false);
    });

    it('should be false when step is empty', () => {
      const input = new HTMLInputElement();
      input.type = 'number';
      input.value = '7';
      assert.strictEqual(input.validity.stepMismatch, false);
    });
  });

  describe('tooLong and tooShort', () => {
    it('tooLong should be true when maxLength is set and value exceeds it', () => {
      const input = new HTMLInputElement();
      input.maxLength = 5;
      input.value = 'toolongvalue';
      assert.strictEqual(input.validity.tooLong, true);
    });

    it('tooLong should be false when maxLength is not set', () => {
      const input = new HTMLInputElement();
      input.value = 'anything';
      assert.strictEqual(input.validity.tooLong, false);
    });

    it('tooShort should be true when minLength is set and value is too short', () => {
      const input = new HTMLInputElement();
      input.minLength = 5;
      input.value = 'ab';
      assert.strictEqual(input.validity.tooShort, true);
    });

    it('tooShort should be false when value is empty (not checked)', () => {
      const input = new HTMLInputElement();
      input.minLength = 5;
      input.value = '';
      assert.strictEqual(input.validity.tooShort, false);
    });
  });

  describe('validity getter returns fresh state', () => {
    it('should reflect changes to element properties', () => {
      const input = new HTMLInputElement();
      assert.strictEqual(input.validity.valid, true);
      input.required = true;
      assert.strictEqual(input.validity.valid, false);
      input.value = 'filled';
      assert.strictEqual(input.validity.valid, true);
    });
  });
});

describe('HTMLSelectElement validation', () => {
  it('should have willValidate true when not disabled', () => {
    const select = new HTMLSelectElement();
    assert.strictEqual(select.willValidate, true);
  });

  it('should have willValidate false when disabled', () => {
    const select = new HTMLSelectElement();
    select.disabled = true;
    assert.strictEqual(select.willValidate, false);
  });

  it('should return a ValidityState', () => {
    const select = new HTMLSelectElement();
    assert.ok(select.validity instanceof ValidityState);
  });

  it('should detect valueMissing when required and value is empty', () => {
    const select = new HTMLSelectElement();
    select.required = true;
    select.value = '';
    assert.strictEqual(select.validity.valueMissing, true);
    assert.strictEqual(select.validity.valid, false);
  });

  it('should not be valueMissing when required and value is set', () => {
    const select = new HTMLSelectElement();
    select.required = true;
    select.value = 'option1';
    assert.strictEqual(select.validity.valueMissing, false);
    assert.strictEqual(select.validity.valid, true);
  });

  it('should support setCustomValidity', () => {
    const select = new HTMLSelectElement();
    select.setCustomValidity('Pick one');
    assert.strictEqual(select.validationMessage, 'Pick one');
    assert.strictEqual(select.validity.customError, true);
    assert.strictEqual(select.validity.valid, false);
  });

  it('should support checkValidity and reportValidity', () => {
    const select = new HTMLSelectElement();
    assert.strictEqual(select.checkValidity(), true);
    assert.strictEqual(select.reportValidity(), true);
    select.setCustomValidity('Error');
    assert.strictEqual(select.checkValidity(), false);
    assert.strictEqual(select.reportValidity(), false);
  });
});

describe('HTMLTextAreaElement validation', () => {
  it('should have willValidate true when not disabled', () => {
    const ta = new HTMLTextAreaElement();
    assert.strictEqual(ta.willValidate, true);
  });

  it('should have willValidate false when disabled', () => {
    const ta = new HTMLTextAreaElement();
    ta.disabled = true;
    assert.strictEqual(ta.willValidate, false);
  });

  it('should return a ValidityState', () => {
    const ta = new HTMLTextAreaElement();
    assert.ok(ta.validity instanceof ValidityState);
  });

  it('should detect valueMissing when required and value is empty', () => {
    const ta = new HTMLTextAreaElement();
    ta.required = true;
    ta.value = '';
    assert.strictEqual(ta.validity.valueMissing, true);
    assert.strictEqual(ta.validity.valid, false);
  });

  it('should support setCustomValidity', () => {
    const ta = new HTMLTextAreaElement();
    ta.setCustomValidity('Too short');
    assert.strictEqual(ta.validationMessage, 'Too short');
    assert.strictEqual(ta.validity.customError, true);
  });

  it('should support checkValidity and reportValidity', () => {
    const ta = new HTMLTextAreaElement();
    assert.strictEqual(ta.checkValidity(), true);
    assert.strictEqual(ta.reportValidity(), true);
  });

  it('should detect tooLong when maxLength set', () => {
    const ta = new HTMLTextAreaElement();
    ta.maxLength = 3;
    ta.value = 'abcdef';
    assert.strictEqual(ta.validity.tooLong, true);
  });

  it('should detect tooShort when minLength set', () => {
    const ta = new HTMLTextAreaElement();
    ta.minLength = 5;
    ta.value = 'ab';
    assert.strictEqual(ta.validity.tooShort, true);
  });

  it('tooShort should be false when value is empty', () => {
    const ta = new HTMLTextAreaElement();
    ta.minLength = 5;
    ta.value = '';
    assert.strictEqual(ta.validity.tooShort, false);
  });
});
