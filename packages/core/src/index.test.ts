import { describe, expect, it } from 'vitest';
import { VERSION } from './index.js';

describe('@sp-treeview/core', () => {
  it('exports a VERSION string', () => {
    expect(VERSION).toBe('4.0.0');
  });
});
