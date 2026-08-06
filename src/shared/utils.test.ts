import { describe, it, expect } from 'vitest';
import { generateId, nowISO, toCents, fromCents } from './utils';

describe('utils', () => {
  describe('generateId', () => {
    it('returns a non-empty string', () => {
      expect(generateId()).toBeTypeOf('string');
      expect(generateId().length).toBeGreaterThan(0);
    });

    it('returns unique values', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('nowISO', () => {
    it('returns ISO 8601 string', () => {
      const iso = nowISO();
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('toCents / fromCents', () => {
    it('converts decimal to cents', () => {
      expect(toCents(10)).toBe(1000);
      expect(toCents(10.5)).toBe(1050);
      expect(toCents(0.01)).toBe(1);
      expect(toCents(0)).toBe(0);
    });

    it('converts cents to decimal', () => {
      expect(fromCents(1000)).toBe(10);
      expect(fromCents(1050)).toBe(10.5);
      expect(fromCents(1)).toBe(0.01);
      expect(fromCents(0)).toBe(0);
    });

    it('rounds correctly', () => {
      expect(toCents(10.505)).toBe(1051);
      expect(toCents(10.504)).toBe(1050);
    });

    it('is reversible', () => {
      const amounts = [0, 1, 10.5, 100, 999.99, 1500.75];
      for (const amount of amounts) {
        expect(fromCents(toCents(amount))).toBeCloseTo(amount, 2);
      }
    });
  });
});
