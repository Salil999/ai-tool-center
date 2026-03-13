import fs from 'fs';
import path from 'path';
import os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadCreds, saveCreds, getCredsDir, type CredentialsData } from './store.js';

describe('credentials/store', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creds-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  describe('getCredsDir', () => {
    it('returns override when provided', () => {
      expect(getCredsDir(tmpDir)).toBe(tmpDir);
    });

    it('returns default dir when no override', () => {
      const dir = getCredsDir();
      expect(dir).toContain('.ai_tools_manager');
      expect(dir).toContain('creds');
    });
  });

  describe('loadCreds', () => {
    it('returns empty data when file does not exist', () => {
      const credsPath = path.join(tmpDir, 'creds.json');
      const data = loadCreds(tmpDir);
      expect(data).toEqual({ order: [], items: {} });
      expect(fs.existsSync(credsPath)).toBe(false);
    });

    it('loads existing credentials', () => {
      const creds: CredentialsData = {
        order: ['key1', 'key2'],
        items: {
          key1: { name: 'KEY1', value: 'secret1' },
          key2: { name: 'KEY2', value: 'secret2' },
        },
      };
      saveCreds(creds, tmpDir);
      const loaded = loadCreds(tmpDir);
      expect(loaded.order).toEqual(['key1', 'key2']);
      expect(loaded.items).toEqual(creds.items);
    });

    it('returns empty data on corrupt JSON', () => {
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'creds.json'), 'not valid json', 'utf8');
      const data = loadCreds(tmpDir);
      expect(data).toEqual({ order: [], items: {} });
    });
  });

  describe('saveCreds', () => {
    it('writes credentials to file', () => {
      const creds: CredentialsData = {
        order: ['x'],
        items: { x: { name: 'X', value: 'val' } },
      };
      saveCreds(creds, tmpDir);
      const filePath = path.join(tmpDir, 'creds.json');
      expect(fs.existsSync(filePath)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(parsed).toEqual(creds);
    });

    it('creates directory if needed', () => {
      const nestedDir = path.join(tmpDir, 'a', 'b');
      const creds: CredentialsData = { order: [], items: {} };
      saveCreds(creds, nestedDir);
      expect(fs.existsSync(path.join(nestedDir, 'creds.json'))).toBe(true);
    });
  });
});
