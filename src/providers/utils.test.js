const {
  isPathSafe,
  ensureDir,
  readConfig,
  writeConfig,
  expandPath,
  resolvePath,
  toCanonicalId,
  defToCanonical,
  canonicalToMcpServers,
  canonicalToVSCodeServers,
  serverSignature,
  isDuplicate,
  mergeServers,
  HOME,
} = require('./utils');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('providers/utils', () => {
  describe('toCanonicalId', () => {
    it('converts display name to lowercase hyphenated id', () => {
      expect(toCanonicalId('My Server')).toBe('my-server');
      expect(toCanonicalId('Some MCP Server')).toBe('some-mcp-server');
    });

    it('strips non-alphanumeric chars except hyphens', () => {
      expect(toCanonicalId('server_123')).toBe('server123');
      expect(toCanonicalId('Test.Server')).toBe('testserver');
    });

    it('returns "server" for empty or invalid input', () => {
      expect(toCanonicalId('')).toBe('server');
      expect(toCanonicalId(null)).toBe('server');
      expect(toCanonicalId(undefined)).toBe('server');
    });

    it('handles already canonical ids', () => {
      expect(toCanonicalId('my-server')).toBe('my-server');
    });
  });

  describe('defToCanonical', () => {
    it('converts http def with url', () => {
      const def = { url: 'https://example.com', headers: { Authorization: 'Bearer x' } };
      expect(defToCanonical('my-server', def)).toEqual({
        name: 'my-server',
        enabled: true,
        type: 'http',
        command: undefined,
        args: [],
        env: {},
        url: 'https://example.com',
        headers: { Authorization: 'Bearer x' },
      });
    });

    it('converts stdio def with command', () => {
      const def = { command: 'npx', args: ['-y', 'mcp-server'], env: { FOO: 'bar' } };
      expect(defToCanonical('stdio-server', def)).toEqual({
        name: 'stdio-server',
        enabled: true,
        type: 'stdio',
        command: 'npx',
        args: ['-y', 'mcp-server'],
        env: { FOO: 'bar' },
        url: undefined,
        headers: undefined,
      });
    });

    it('defaults args and env to empty', () => {
      const def = { command: 'node' };
      expect(defToCanonical('simple', def)).toMatchObject({
        args: [],
        env: {},
      });
    });
  });

  describe('canonicalToMcpServers', () => {
    it('skips disabled servers', () => {
      const servers = {
        a: { name: 'A', enabled: false, type: 'stdio', command: 'node' },
      };
      expect(canonicalToMcpServers(servers)).toEqual({ mcpServers: {} });
    });

    it('converts stdio servers', () => {
      const servers = {
        a: { name: 'A', enabled: true, type: 'stdio', command: 'npx', args: ['-y', 'x'], env: { FOO: 'bar' } },
      };
      expect(canonicalToMcpServers(servers)).toEqual({
        mcpServers: {
          A: { command: 'npx', args: ['-y', 'x'], env: { FOO: 'bar' } },
        },
      });
    });

    it('converts http servers with headers', () => {
      const servers = {
        a: { name: 'A', enabled: true, url: 'https://x.com', headers: { Authorization: 'Bearer t' } },
      };
      expect(canonicalToMcpServers(servers)).toEqual({
        mcpServers: {
          A: { url: 'https://x.com', headers: { Authorization: 'Bearer t' } },
        },
      });
    });

    it('omits empty args and env', () => {
      const servers = {
        a: { name: 'A', enabled: true, type: 'stdio', command: 'node' },
      };
      expect(canonicalToMcpServers(servers)).toEqual({
        mcpServers: { A: { command: 'node' } },
      });
    });
  });

  describe('canonicalToVSCodeServers', () => {
    it('adds type: stdio for stdio servers', () => {
      const servers = {
        a: { name: 'A', enabled: true, type: 'stdio', command: 'node' },
      };
      expect(canonicalToVSCodeServers(servers)).toEqual({
        servers: { A: { type: 'stdio', command: 'node' } },
      });
    });

    it('adds type: http for http servers', () => {
      const servers = {
        a: { name: 'A', enabled: true, url: 'https://x.com' },
      };
      expect(canonicalToVSCodeServers(servers)).toEqual({
        servers: { A: { type: 'http', url: 'https://x.com' } },
      });
    });

    it('handles sse type when checked before url', () => {
      const servers = {
        a: { name: 'A', enabled: true, type: 'sse', url: 'https://x.com' },
      };
      const result = canonicalToVSCodeServers(servers);
      expect(result.servers.A).toMatchObject({ url: 'https://x.com' });
    });
  });

  describe('serverSignature', () => {
    it('returns url-based signature for http servers', () => {
      expect(serverSignature({ url: 'https://example.com/path' })).toBe('url:https://example.com/path');
    });

    it('returns stdio signature for command servers', () => {
      expect(serverSignature({ command: 'npx', args: ['-y', 'x'] })).toBe('stdio:npx -y x');
    });

    it('returns null for invalid server', () => {
      expect(serverSignature({})).toBe(null);
      expect(serverSignature({ command: '' })).toBe(null);
    });
  });

  describe('isDuplicate', () => {
    it('detects duplicate by url', () => {
      const server = { url: 'https://x.com' };
      const existing = { a: { url: 'https://x.com' } };
      expect(isDuplicate(server, existing)).toBe(true);
    });

    it('detects duplicate by command+args', () => {
      const server = { command: 'npx', args: ['-y', 'x'] };
      const existing = { a: { command: 'npx', args: ['-y', 'x'] } };
      expect(isDuplicate(server, existing)).toBe(true);
    });

    it('returns false for unique server', () => {
      const server = { url: 'https://y.com' };
      const existing = { a: { url: 'https://x.com' } };
      expect(isDuplicate(server, existing)).toBe(false);
    });
  });

  describe('mergeServers', () => {
    it('skips duplicates', () => {
      const existing = { a: { url: 'https://x.com', name: 'A' } };
      const imported = { b: { url: 'https://x.com', name: 'B' } };
      expect(mergeServers(existing, imported)).toEqual(existing);
    });

    it('adds new servers with unique ids', () => {
      const existing = { a: { url: 'https://x.com', name: 'A' } };
      const imported = { b: { url: 'https://y.com', name: 'B' } };
      expect(mergeServers(existing, imported)).toEqual({
        a: existing.a,
        b: imported.b,
      });
    });

    it('suffixes id on collision', () => {
      const existing = { a: { url: 'https://x.com', name: 'A' } };
      const imported = { a: { url: 'https://y.com', name: 'A2' } };
      expect(mergeServers(existing, imported)).toMatchObject({
        a: existing.a,
        'a-1': imported.a,
      });
    });
  });

  describe('expandPath', () => {
    it('expands ~ to home', () => {
      expect(expandPath('~')).toBe(HOME);
      expect(expandPath('~/foo')).toBe(path.join(HOME, 'foo'));
    });

    it('returns path unchanged when no tilde', () => {
      expect(expandPath('/abs/path')).toBe('/abs/path');
      expect(expandPath('relative')).toBe('relative');
    });

    it('handles non-string', () => {
      expect(expandPath(null)).toBe(null);
    });
  });

  describe('resolvePath', () => {
    it('resolves expanded path', () => {
      const result = resolvePath('~/test-resolve');
      expect(result).toBe(path.resolve(path.join(HOME, 'test-resolve')));
    });
  });

  describe('isPathSafe', () => {
    it('allows paths under home', () => {
      expect(isPathSafe(path.join(HOME, 'foo'))).toBe(true);
      expect(isPathSafe(path.join(HOME, '.cursor', 'mcp.json'))).toBe(true);
    });

    it('allows paths under cwd', () => {
      expect(isPathSafe(path.resolve(process.cwd(), 'foo'))).toBe(true);
    });

    it('rejects paths outside home and cwd', () => {
      expect(isPathSafe('/etc/passwd')).toBe(false);
      expect(isPathSafe('/usr/bin')).toBe(false);
    });
  });

  describe('readConfig', () => {
    it('returns null for non-existent file', () => {
      expect(readConfig('/nonexistent/path/config.json')).toBe(null);
    });

    it('parses existing JSON file', () => {
      const tmpDir = path.join(process.cwd(), 'tmp-test-' + Date.now());
      fs.mkdirSync(tmpDir, { recursive: true });
      const configPath = path.join(tmpDir, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ servers: {} }), 'utf8');
      try {
        expect(readConfig(configPath)).toEqual({ servers: {} });
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('writeConfig', () => {
    it('writes config to safe path', () => {
      const tmpDir = path.join(process.cwd(), 'tmp-test-' + Date.now());
      fs.mkdirSync(tmpDir, { recursive: true });
      const configPath = path.join(tmpDir, 'subdir', 'config.json');
      try {
        writeConfig(configPath, { foo: 'bar' });
        expect(fs.existsSync(configPath)).toBe(true);
        expect(JSON.parse(fs.readFileSync(configPath, 'utf8'))).toEqual({ foo: 'bar' });
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('throws for unsafe path', () => {
      expect(() => writeConfig('/etc/passwd', {})).toThrow('Path is outside allowed directories');
    });
  });

  describe('ensureDir', () => {
    it('creates directory if not exists', () => {
      const tmpDir = path.join(process.cwd(), 'tmp-test-' + Date.now());
      fs.mkdirSync(tmpDir, { recursive: true });
      const subDir = path.join(tmpDir, 'a', 'b', 'c');
      try {
        ensureDir(path.join(subDir, 'file.txt'));
        expect(fs.existsSync(subDir)).toBe(true);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
