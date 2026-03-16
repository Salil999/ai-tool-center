import path from 'path';
import os from 'os';

const HOME = os.homedir();

/**
 * Resolve a platform-specific application config path.
 * macOS: ~/Library/Application Support/{app}
 * Windows: %APPDATA%/{app}
 * Linux: ~/.config/{app}
 */
export function platformConfigPath(app: string, ...rest: string[]): string {
  let base: string;
  if (process.platform === 'darwin') {
    base = path.join(HOME, 'Library', 'Application Support', app);
  } else if (process.platform === 'win32') {
    base = path.join(process.env.APPDATA || HOME, app);
  } else {
    base = path.join(HOME, '.config', app);
  }
  return rest.length ? path.join(base, ...rest) : base;
}
