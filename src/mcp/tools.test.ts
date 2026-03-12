import { parseCommand, OAuthRequiredError } from './tools.js';

describe('mcp/tools', () => {
  describe('parseCommand', () => {
    it('parses command and args from string', () => {
      expect(parseCommand('npx -y @modelcontextprotocol/server-filesystem')).toEqual({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
      });
    });

    it('handles command only', () => {
      expect(parseCommand('node')).toEqual({ command: 'node', args: [] });
    });

    it('handles empty string', () => {
      expect(parseCommand('')).toEqual({ command: '', args: [] });
    });

    it('trims whitespace', () => {
      expect(parseCommand('  npx -y x  ')).toEqual({ command: 'npx', args: ['-y', 'x'] });
    });

    it('handles null/undefined', () => {
      expect(parseCommand(null as unknown as string)).toEqual({ command: '', args: [] });
      expect(parseCommand(undefined as unknown as string)).toEqual({ command: '', args: [] });
    });

    it('splits on whitespace', () => {
      expect(parseCommand('cmd a b c')).toEqual({ command: 'cmd', args: ['a', 'b', 'c'] });
    });
  });

  describe('OAuthRequiredError', () => {
    it('extends Error with code OAUTH_REQUIRED', () => {
      const err = new OAuthRequiredError();
      expect(err).toBeInstanceOf(Error);
      expect(err.code).toBe('OAUTH_REQUIRED');
      expect(err.message).toContain('Authorization required');
    });

    it('accepts custom message', () => {
      const err = new OAuthRequiredError('Custom message');
      expect(err.message).toBe('Custom message');
    });
  });
});
