import { describe, it, expect } from 'vitest';
import app from '../index';

describe('API', () => {
  it('default export has fetch function', () => {
    expect(app).toBeDefined();
    expect(typeof app.fetch).toBe('function');
  });
});
