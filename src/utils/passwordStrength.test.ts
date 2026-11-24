import { describe, it, expect } from 'vitest';
import { evaluatePasswordStrength } from './passwordStrength';

describe('evaluatePasswordStrength', () => {
  describe('empty password', () => {
    it('returns empty level, empty label, score 0, and all rules false for empty string', () => {
      const result = evaluatePasswordStrength('');

      expect(result).toEqual({
        score: 0,
        level: 'empty',
        label: '',
        rules: {
          minLength: false,
          hasUpper: false,
          hasLower: false,
          hasNumber: false,
          hasSpecial: false,
        },
      });
    });
  });

  describe('individual rule flags', () => {
    it('evaluates minLength boundary at 11 vs 12 characters', () => {
      const elevenChars = evaluatePasswordStrength('aaaaaaaaaaa');
      expect(elevenChars.rules.minLength).toBe(false);
      expect(elevenChars.rules.hasLower).toBe(true);
      expect(elevenChars.score).toBe(1);

      const twelveChars = evaluatePasswordStrength('aaaaaaaaaaaa');
      expect(twelveChars.rules.minLength).toBe(true);
      expect(twelveChars.rules.hasLower).toBe(true);
      expect(twelveChars.score).toBe(2);
    });

    it('detects hasUpper individually', () => {
      const result = evaluatePasswordStrength('A');

      expect(result.rules).toEqual({
        minLength: false,
        hasUpper: true,
        hasLower: false,
        hasNumber: false,
        hasSpecial: false,
      });
      expect(result.score).toBe(1);
    });

    it('detects hasLower individually', () => {
      const result = evaluatePasswordStrength('a');

      expect(result.rules).toEqual({
        minLength: false,
        hasUpper: false,
        hasLower: true,
        hasNumber: false,
        hasSpecial: false,
      });
      expect(result.score).toBe(1);
    });

    it('detects hasNumber individually', () => {
      const result = evaluatePasswordStrength('7');

      expect(result.rules).toEqual({
        minLength: false,
        hasUpper: false,
        hasLower: false,
        hasNumber: true,
        hasSpecial: false,
      });
      expect(result.score).toBe(1);
    });

    it('detects hasSpecial individually', () => {
      const result = evaluatePasswordStrength('!');

      expect(result.rules).toEqual({
        minLength: false,
        hasUpper: false,
        hasLower: false,
        hasNumber: false,
        hasSpecial: true,
      });
      expect(result.score).toBe(1);
    });
  });

  describe('score boundaries and strength levels', () => {
    it('returns weak for score 1', () => {
      const result = evaluatePasswordStrength('abc');

      expect(result.score).toBe(1);
      expect(result.level).toBe('weak');
      expect(result.label).toBe('Weak');
    });

    it('returns weak for score 2 (upper boundary of weak)', () => {
      const result = evaluatePasswordStrength('abcABC');

      expect(result.score).toBe(2);
      expect(result.level).toBe('weak');
      expect(result.label).toBe('Weak');
    });

    it('returns medium for score 3 (lower boundary of medium)', () => {
      const result = evaluatePasswordStrength('abcABC1');

      expect(result.score).toBe(3);
      expect(result.level).toBe('medium');
      expect(result.label).toBe('Medium');
    });

    it('returns medium for score 4 (upper boundary of medium, including 11-char password meeting all other rules)', () => {
      const result = evaluatePasswordStrength('Abcdefgh1!x');

      expect(result.score).toBe(4);
      expect(result.level).toBe('medium');
      expect(result.label).toBe('Medium');
      expect(result.rules).toEqual({
        minLength: false,
        hasUpper: true,
        hasLower: true,
        hasNumber: true,
        hasSpecial: true,
      });
    });

    it('returns strong for score 5 (all rules met, including 12-char boundary)', () => {
      const result = evaluatePasswordStrength('Abcdefgh1!xy');

      expect(result.score).toBe(5);
      expect(result.level).toBe('strong');
      expect(result.label).toBe('Strong');
      expect(result.rules).toEqual({
        minLength: true,
        hasUpper: true,
        hasLower: true,
        hasNumber: true,
        hasSpecial: true,
      });
    });
  });
});
