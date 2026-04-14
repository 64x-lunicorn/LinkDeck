import { describe, it, expect } from 'vitest';
import { createIconPicker } from './icon-picker.js';

/* Mock DOM environment — vitest default is node, so we
   skip tests that need full DOM and test the pure logic. */

describe('icon-picker module', () => {
  it('exports createIconPicker function', () => {
    expect(typeof createIconPicker).toBe('function');
  });
});
