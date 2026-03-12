import fs from 'fs';
import path from 'path';
import os from 'os';
import cursor from './cursor.js';

describe('providers/cursor', () => {
  const cursorPath = path.join(os.homedir(), '.cursor', 'mcp.json');
  let existedBefore: boolean;

  beforeEach(() => {
    existedBefore = fs.existsSync(cursorPath);
    if (existedBefore) {
      try {
        fs.copyFileSync(cursorPath, cursorPath + '.bak');
      } catch {
        /* ignore */
      }
    }
  });

  afterEach(() => {
    if (existedBefore && fs.existsSync(cursorPath + '.bak')) {
      fs.renameSync(cursorPath + '.bak', cursorPath);
    } else if (!existedBefore && fs.existsSync(cursorPath)) {
      fs.unlinkSync(cursorPath);
    }
  });

  it('has id and name', () => {
    expect(cursor.id).toBe('cursor');
    expect(cursor.name).toBe('Cursor');
  });

  it('getPath returns cursor config path', () => {
    expect(cursor.getPath()).toBe(cursorPath);
  });

  it.skip('importConfig throws when file does not exist', () => {
    if (fs.existsSync(cursorPath)) fs.unlinkSync(cursorPath);
    expect(() => cursor.importConfig()).toThrow('Config file not found');
  });

  it.skip('importConfig parses mcpServers', () => {
    fs.mkdirSync(path.dirname(cursorPath), { recursive: true });
    fs.writeFileSync(
      cursorPath,
      JSON.stringify({
        mcpServers: {
          'test-server': { command: 'npx', args: ['-y', 'x'] },
        },
      }),
      'utf8'
    );
    try {
      const servers = cursor.importConfig();
      expect(servers).toHaveProperty('test-server');
      expect(servers['test-server']).toMatchObject({
        name: 'test-server',
        command: 'npx',
        args: ['-y', 'x'],
      });
    } finally {
      if (!existedBefore) fs.unlinkSync(cursorPath);
    }
  });

  it.skip('exportConfig writes merged config', () => {
    fs.mkdirSync(path.dirname(cursorPath), { recursive: true });
    const servers = {
      a: { name: 'A', enabled: true, type: 'stdio', command: 'node', args: [] },
    };
    const result = cursor.exportConfig(servers);
    expect(result).toMatchObject({ success: true, path: cursorPath });
    const data = JSON.parse(fs.readFileSync(cursorPath, 'utf8'));
    expect(data.mcpServers).toHaveProperty('A');
    expect(data.mcpServers.A).toMatchObject({ command: 'node' });
  });
});
