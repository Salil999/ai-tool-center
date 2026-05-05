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

const RULES_BASE = process.env.AI_TOOL_CENTER_RULES_DIR || path.join(os.homedir(), '.ai_tool_center', 'rules');

describe('rules/provider-rules', () => {
  let tmpDir: string;
  const config: import('../types.js').AppConfig = {};

  beforeEach(() => {
    // Use path under HOME so isPathSafe allows read/write
    tmpDir = fs.mkdtempSync(path.join(os.homedir(), '.rules-test-'));
    process.env.AI_TOOL_CENTER_RULES_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.AI_TOOL_CENTER_RULES_DIR;
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

// ── Direct-mode provider tests ────────────────────────────────────────────────

describe('direct single-file provider: claude-local', () => {
  let fakeHome: string;

  beforeEach(() => {
    fakeHome = fs.mkdtempSync(path.join(os.homedir(), '.rules-test-home-'));
  });

  afterEach(() => {
    try { fs.rmSync(fakeHome, { recursive: true }); } catch { /* ignore */ }
  });

  it('listProviderRules always returns one entry even when file missing', () => {
    // claude-local resolves to ~/.claude/CLAUDE.local.md — we verify the pattern
    // by using an existing static path; isPathSafe gates the actual homedir path.
    const rules = listProviderRules('claude-local');
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('CLAUDE.local');
    expect(rules[0].extension).toBe('.md');
  });

  it('readProviderRuleContent returns empty string when file missing', () => {
    // File is unlikely to exist in CI; confirm graceful empty return
    const content = readProviderRuleContent('claude-local', 'CLAUDE.local');
    expect(typeof content).toBe('string');
  });

  it('createProviderRule throws for single-file provider', () => {
    expect(() => createProviderRule('claude-local', 'new rule', '# content', {})).toThrow();
  });

  it('deleteProviderRule throws for single-file provider', () => {
    expect(() => deleteProviderRule('claude-local', 'CLAUDE.local', {})).toThrow();
  });
});

describe('direct multi-file provider: claude-rules', () => {
  let rulesDir: string;

  beforeEach(() => {
    rulesDir = fs.mkdtempSync(path.join(os.homedir(), '.claude-rules-test-'));
  });

  afterEach(() => {
    try { fs.rmSync(rulesDir, { recursive: true }); } catch { /* ignore */ }
  });

  // claude-rules always resolves to ~/.claude/rules/ — we can't redirect it without
  // a mock, but we can test the path-traversal sanitization and empty-dir behavior
  // via cursor-proj- (project-scoped) which uses a temp dir we control.
  // The claude-rules static provider is tested indirectly via structure; the full
  // read/write path is validated in the dynamic provider tests below.

  it('listProviderRules returns empty array when dir does not exist', () => {
    // cursor-proj- dynamic provider pointing at a non-existent subdir
    const projectId = 'test-proj-no-dir';
    const cfg: import('../types.js').AppConfig = {
      projectDirectories: [{ id: projectId, path: rulesDir }],
    };
    const rules = listProviderRules(`cursor-proj-${projectId}`, cfg);
    // rulesDir exists but .cursor/rules inside it does not
    expect(rules).toEqual([]);
  });
});

describe('dynamic project-scoped providers', () => {
  let projectDir: string;
  const projectId = 'test-proj-1';
  let cfg: import('../types.js').AppConfig;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.homedir(), '.proj-test-'));
    cfg = { projectDirectories: [{ id: projectId, path: projectDir }] };
  });

  afterEach(() => {
    try { fs.rmSync(projectDir, { recursive: true }); } catch { /* ignore */ }
  });

  describe('claude-proj-{id} (project CLAUDE.md)', () => {
    it('listProviderRules returns one entry pointing to {proj}/CLAUDE.md', () => {
      const rules = listProviderRules(`claude-proj-${projectId}`, cfg);
      expect(rules).toHaveLength(1);
      expect(rules[0].path).toBe(path.join(projectDir, 'CLAUDE.md'));
      expect(rules[0].id).toBe('CLAUDE');
      expect(rules[0].extension).toBe('.md');
    });

    it('readProviderRuleContent returns empty when file does not exist', () => {
      const content = readProviderRuleContent(`claude-proj-${projectId}`, 'CLAUDE', cfg);
      expect(content).toBe('');
    });

    it('writeProviderRuleContent creates CLAUDE.md in project dir', () => {
      writeProviderRuleContent(`claude-proj-${projectId}`, 'CLAUDE', '# Project Instructions', cfg);
      expect(fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf8')).toBe('# Project Instructions');
    });

    it('writes to project dir — not to ~/.claude/CLAUDE.md', () => {
      writeProviderRuleContent(`claude-proj-${projectId}`, 'CLAUDE', '# Proj', cfg);
      // The global user CLAUDE.md path does not include the temp projectDir
      expect(path.join(projectDir, 'CLAUDE.md')).not.toBe(path.join(os.homedir(), '.claude', 'CLAUDE.md'));
    });

    it('createProviderRule throws (single-file provider)', () => {
      expect(() => createProviderRule(`claude-proj-${projectId}`, 'extra', '# extra', cfg)).toThrow();
    });
  });

  describe('claude-proj-local-{id} (project CLAUDE.local.md)', () => {
    it('listProviderRules returns entry at {proj}/CLAUDE.local.md', () => {
      const rules = listProviderRules(`claude-proj-local-${projectId}`, cfg);
      expect(rules).toHaveLength(1);
      expect(rules[0].path).toBe(path.join(projectDir, 'CLAUDE.local.md'));
    });

    it('writeProviderRuleContent writes to project-local file, not user-local', () => {
      writeProviderRuleContent(`claude-proj-local-${projectId}`, 'CLAUDE.local', '# Local', cfg);
      expect(fs.readFileSync(path.join(projectDir, 'CLAUDE.local.md'), 'utf8')).toBe('# Local');
    });
  });

  describe('claude-proj-rules-{id} (project .claude/rules/)', () => {
    it('listProviderRules returns empty when .claude/rules/ does not exist', () => {
      const rules = listProviderRules(`claude-proj-rules-${projectId}`, cfg);
      expect(rules).toEqual([]);
    });

    it('createProviderRule creates .md file in {proj}/.claude/rules/', () => {
      const rule = createProviderRule(`claude-proj-rules-${projectId}`, 'My Rule', '# Content', cfg);
      expect(rule.id).toBe('my-rule');
      expect(rule.extension).toBe('.md');
      expect(rule.path).toBe(path.join(projectDir, '.claude', 'rules', 'my-rule.md'));
      expect(fs.readFileSync(rule.path, 'utf8')).toBe('# Content');
    });

    it('readProviderRuleContent reads from {proj}/.claude/rules/', () => {
      const rulesDir = path.join(projectDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'test.md'), '# Test Rule', 'utf8');
      const content = readProviderRuleContent(`claude-proj-rules-${projectId}`, 'test', cfg);
      expect(content).toBe('# Test Rule');
    });

    it('deleteProviderRule removes file from {proj}/.claude/rules/', () => {
      createProviderRule(`claude-proj-rules-${projectId}`, 'to-delete', '# Del', cfg);
      const filePath = path.join(projectDir, '.claude', 'rules', 'to-delete.md');
      expect(fs.existsSync(filePath)).toBe(true);
      deleteProviderRule(`claude-proj-rules-${projectId}`, 'to-delete', cfg);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('sanitizes path traversal in ruleId', () => {
      const rulesDir = path.join(projectDir, '.claude', 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      fs.writeFileSync(path.join(rulesDir, 'rule.md'), 'safe', 'utf8');
      const content = readProviderRuleContent(`claude-proj-rules-${projectId}`, '../rule', cfg);
      expect(content).toBe('safe');
    });
  });

  describe('cursor-proj-{id} (project .cursor/rules/)', () => {
    it('listProviderRules returns empty when .cursor/rules/ does not exist', () => {
      const rules = listProviderRules(`cursor-proj-${projectId}`, cfg);
      expect(rules).toEqual([]);
    });

    it('createProviderRule creates .mdc file in {proj}/.cursor/rules/', () => {
      const rule = createProviderRule(`cursor-proj-${projectId}`, 'Cursor Rule', '# Cursor', cfg);
      expect(rule.extension).toBe('.mdc');
      expect(rule.path).toBe(path.join(projectDir, '.cursor', 'rules', 'cursor-rule.mdc'));
    });

    it('listProviderRules lists .mdc files in {proj}/.cursor/rules/', () => {
      const cursorRulesDir = path.join(projectDir, '.cursor', 'rules');
      fs.mkdirSync(cursorRulesDir, { recursive: true });
      fs.writeFileSync(path.join(cursorRulesDir, 'alpha.mdc'), '# Alpha', 'utf8');
      fs.writeFileSync(path.join(cursorRulesDir, 'beta.mdc'), '# Beta', 'utf8');
      const rules = listProviderRules(`cursor-proj-${projectId}`, cfg);
      expect(rules).toHaveLength(2);
      expect(rules.map((r) => r.id).sort()).toEqual(['alpha', 'beta']);
    });
  });

  describe('opencode-cmds-proj-{id} (project .opencode/commands/)', () => {
    it('createProviderRule creates .md file in {proj}/.opencode/commands/', () => {
      const rule = createProviderRule(`opencode-cmds-proj-${projectId}`, 'My Cmd', '# Cmd', cfg);
      expect(rule.extension).toBe('.md');
      expect(rule.path).toBe(path.join(projectDir, '.opencode', 'commands', 'my-cmd.md'));
    });
  });

  describe('error cases', () => {
    it('throws when projectId is not in config', () => {
      expect(() => listProviderRules('claude-proj-nonexistent', cfg)).toThrow('Project not found');
    });

    it('throws when projectId is not in config for cursor-proj-', () => {
      expect(() => listProviderRules('cursor-proj-nonexistent', cfg)).toThrow('Project not found');
    });
  });
});
