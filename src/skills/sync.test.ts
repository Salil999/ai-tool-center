import { describe, it, expect } from 'vitest';
import { isDuplicateSkill } from './sync.js';

describe('skills/sync', () => {
  describe('isDuplicateSkill', () => {
    it('detects duplicate by normalized name', () => {
      const existing = {
        'my-skill': {
          path: '/path/to/skill',
          name: 'my-skill',
          enabled: true,
        },
      };
      expect(isDuplicateSkill('my-skill', existing)).toBe(true);
      expect(isDuplicateSkill('My-Skill', existing)).toBe(true);
      expect(isDuplicateSkill('my skill', existing)).toBe(true);
    });

    it('returns false for unique skill name', () => {
      const existing = {
        'my-skill': {
          path: '/path/to/skill',
          name: 'my-skill',
          enabled: true,
        },
      };
      expect(isDuplicateSkill('other-skill', existing)).toBe(false);
      expect(isDuplicateSkill('different', existing)).toBe(false);
    });

    it('returns false for empty existing', () => {
      expect(isDuplicateSkill('my-skill', {})).toBe(false);
    });
  });
});
