import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig, saveConfig, getConfigPath, DEFAULT_CONFIG } from './loader.js';

describe('config/loader', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-loader-test-'));
    configPath = path.join(tmpDir, 'config.json');
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  describe('saveConfig', () => {
    it('writes config to file', () => {
      const config = { servers: { a: { name: 'A', command: 'node' } }, customProviders: [] };
      saveConfig(configPath, config);
      expect(fs.existsSync(configPath)).toBe(true);
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(data).toEqual(config);
    });

    it('creates directory if needed', () => {
      const nestedPath = path.join(tmpDir, 'a', 'b', 'config.json');
      saveConfig(nestedPath, { servers: {}, customProviders: [] });
      expect(fs.existsSync(nestedPath)).toBe(true);
    });
  });

  describe('loadConfig', () => {
    it('creates default config when file does not exist', () => {
      const cursorPath = path.join(os.homedir(), '.cursor', 'mcp.json');
      const cursorExists = fs.existsSync(cursorPath);
      const config = loadConfig(configPath);
      expect(config).toMatchObject(DEFAULT_CONFIG);
      expect(config.servers).toBeDefined();
      if (!cursorExists) {
        expect(config.servers).toEqual({});
      }
    });

    it('loads existing config', () => {
      const config = { servers: { x: { name: 'X', command: 'node' } }, customProviders: [] };
      saveConfig(configPath, config);
      const loaded = loadConfig(configPath);
      expect(loaded).toMatchObject(config);
      expect(loaded.servers).toEqual(config.servers);
    });

    it('merges with DEFAULT_CONFIG', () => {
      const config = { servers: {}, customProviders: [] };
      saveConfig(configPath, config);
      const loaded = loadConfig(configPath);
      expect(loaded.customProviders).toEqual([]);
    });

    it('throws on invalid JSON', () => {
      fs.writeFileSync(configPath, 'not json', 'utf8');
      expect(() => loadConfig(configPath)).toThrow('Failed to load config');
    });
  });

  describe('getConfigPath', () => {
    it('returns override when provided', () => {
      expect(getConfigPath('/custom/path')).toBe('/custom/path');
    });

    it('returns env when set', () => {
      const orig = process.env.MCP_MANAGER_CONFIG;
      process.env.MCP_MANAGER_CONFIG = '/env/path';
      try {
        expect(getConfigPath()).toBe('/env/path');
      } finally {
        if (orig !== undefined) process.env.MCP_MANAGER_CONFIG = orig;
        else delete process.env.MCP_MANAGER_CONFIG;
      }
    });
  });
});
