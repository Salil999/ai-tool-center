import fs from 'fs';
import path from 'path';
import os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  listProviderRules,
  getOrderedProviderRules,
  readProviderRuleContent,
  writeProviderRuleContent,
  createProviderRule,
  deleteProviderRule,
} from './provider-rules.js';

const RULES_BASE = process.env.AI_TOOLS_MANAGER_RULES_DIR || path.join(os.homedir(), '.ai_tools_manager', 'rules');

describe('rules/provider-rules', () => {
  let tmpDir: string;
  const config: import('../types.js').AppConfig = {};

  beforeEach(() => {
    // Use path under HOME so isPathSafe allows read/write
    tmpDir = fs.mkdtempSync(path.join(os.homedir(), '.rules-test-'));
    process.env.AI_TOOLS_MANAGER_RULES_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.AI_TOOLS_MANAGER_RULES_DIR;
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  describe('listProviderRules', () => {
    it('returns empty array for non-existent cursor dir', () => {
      const rules = listProviderRules('cursor');
      expect(rules).toEqual([]);
    });

    it('lists .mdc files in cursor dir', () => {
      const cursorDir = path.join(tmpDir, 'cursor');
      fs.mkdirSync(cursorDir, { recursive: true });
      fs.writeFileSync(path.join(cursorDir, 'my-rule.mdc'), '# Rule', 'utf8');
      fs.writeFileSync(path.join(cursorDir, 'other.mdc'), '# Other', 'utf8');
      fs.writeFileSync(path.join(cursorDir, 'skip.txt'), 'not a rule', 'utf8');

      const rules = listProviderRules('cursor');
      expect(rules).toHaveLength(2);
      expect(rules.map((r) => r.id).sort()).toEqual(['my-rule', 'other']);
    });
  });

  describe('readProviderRuleContent', () => {
    it('returns empty string for non-existent rule', () => {
      const content = readProviderRuleContent('cursor', 'nonexistent');
      expect(content).toBe('');
    });

    it('reads existing rule content', () => {
      const cursorDir = path.join(tmpDir, 'cursor');
      fs.mkdirSync(cursorDir, { recursive: true });
      fs.writeFileSync(path.join(cursorDir, 'test.mdc'), '# Hello\nContent here', 'utf8');

      const content = readProviderRuleContent('cursor', 'test');
      expect(content).toBe('# Hello\nContent here');
    });

    it('sanitizes path traversal characters from ruleId', () => {
      // ruleId with ../ is sanitized to empty then 'rule' - we read safe path
      const cursorDir = path.join(tmpDir, 'cursor');
      fs.mkdirSync(cursorDir, { recursive: true });
      fs.writeFileSync(path.join(cursorDir, 'rule.mdc'), 'safe', 'utf8');
      const content = readProviderRuleContent('cursor', '../rule');
      expect(content).toBe('safe');
    });
  });

  describe('writeProviderRuleContent', () => {
    it('writes content to new rule file', () => {
      const cursorDir = path.join(tmpDir, 'cursor');
      writeProviderRuleContent('cursor', 'new-rule', '# New content', config);

      expect(fs.existsSync(path.join(cursorDir, 'new-rule.mdc'))).toBe(true);
      expect(fs.readFileSync(path.join(cursorDir, 'new-rule.mdc'), 'utf8')).toBe('# New content');
    });
  });

  describe('createProviderRule', () => {
    it('creates a new rule file', () => {
      const rule = createProviderRule('cursor', 'My Rule', '# Content', config);
      expect(rule.id).toBe('my-rule');
      expect(rule.name).toBe('my rule');
      expect(fs.existsSync(rule.path)).toBe(true);
      expect(fs.readFileSync(rule.path, 'utf8')).toBe('# Content');
    });

    it('appends suffix for duplicate names', () => {
      createProviderRule('cursor', 'dup', '# First', config);
      const rule2 = createProviderRule('cursor', 'dup', '# Second', config);
      expect(rule2.id).toBe('dup-1');
    });
  });

  describe('deleteProviderRule', () => {
    it('removes rule file', () => {
      createProviderRule('cursor', 'to-delete', '# Content', config);
      const cursorDir = path.join(tmpDir, 'cursor');
      expect(fs.existsSync(path.join(cursorDir, 'to-delete.mdc'))).toBe(true);

      deleteProviderRule('cursor', 'to-delete', config);
      expect(fs.existsSync(path.join(cursorDir, 'to-delete.mdc'))).toBe(false);
    });
  });

  describe('getOrderedProviderRules', () => {
    it('returns rules in config order when providerRuleOrder is set', () => {
      const cursorDir = path.join(tmpDir, 'cursor');
      fs.mkdirSync(cursorDir, { recursive: true });
      fs.writeFileSync(path.join(cursorDir, 'a.mdc'), '# A', 'utf8');
      fs.writeFileSync(path.join(cursorDir, 'b.mdc'), '# B', 'utf8');
      fs.writeFileSync(path.join(cursorDir, 'c.mdc'), '# C', 'utf8');

      const cfg: import('../types.js').AppConfig = {
        providerRuleOrder: { cursor: ['c', 'a', 'b'] },
      };
      const rules = getOrderedProviderRules('cursor', cfg);
      expect(rules.map((r) => r.id)).toEqual(['c', 'a', 'b']);
    });
  });
});
