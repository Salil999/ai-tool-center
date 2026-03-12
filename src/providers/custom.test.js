const fs = require('fs');
const path = require('path');
const os = require('os');
const custom = require('./custom');

describe('providers/custom', () => {
  let tmpDir;
  let configPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-custom-test-'));
    configPath = path.join(tmpDir, 'mcp.json');
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch (_) {}
  });

  it('has id and name', () => {
    expect(custom.id).toBe('custom');
    expect(custom.name).toBe('Custom');
  });

  describe('importConfig', () => {
    it('throws when path not safe', () => {
      expect(() => custom.importConfig('/etc/passwd')).toThrow('Path is not allowed');
    });

    it('throws when file not found', () => {
      const missingPath = path.join(process.cwd(), 'nonexistent-' + Date.now() + '.json');
      expect(() => custom.importConfig(missingPath)).toThrow('File not found');
    });

    it('throws when configKey missing', () => {
      fs.writeFileSync(configPath, JSON.stringify({}), 'utf8');
      expect(() => custom.importConfig(configPath, 'mcpServers')).toThrow('No "mcpServers" key found');
    });

    it('imports servers from file', () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          mcpServers: {
            x: { command: 'node', args: [] },
          },
        }),
        'utf8'
      );
      const servers = custom.importConfig(configPath);
      expect(servers).toHaveProperty('x');
      expect(servers.x).toMatchObject({ name: 'x', command: 'node' });
    });
  });

  describe('exportConfig', () => {
    it('throws for unsafe path', () => {
      expect(() => custom.exportConfig({}, '/etc/passwd')).toThrow('Invalid or unsafe');
    });

    it('writes config to file', () => {
      const servers = {
        a: { name: 'A', enabled: true, type: 'stdio', command: 'node', args: [] },
      };
      const result = custom.exportConfig(servers, configPath);
      expect(result).toMatchObject({ success: true });
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      expect(data.mcpServers).toHaveProperty('A');
    });
  });
});
