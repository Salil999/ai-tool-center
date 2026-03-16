import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { loadConfig, saveConfig, getConfigPath } from './config/loader.js';
import { createAllRoutes } from './api/routes.js';
import { RouteResponse, matchRoute } from './router.js';
import type { AppConfig, SaveConfig } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface CreateAppOptions {
  configPath?: string;
  baseUrl?: string;
  port?: number;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function resolveStaticDir(): string {
  const distDir = path.join(__dirname, '..', 'dist');
  const publicDir = path.join(__dirname, '..', 'public');
  const cwdDist = path.join(process.cwd(), 'dist');
  const cwdPublic = path.join(process.cwd(), 'public');
  if (fs.existsSync(distDir)) return distDir;
  if (fs.existsSync(cwdDist)) return cwdDist;
  if (fs.existsSync(publicDir)) return publicDir;
  return cwdPublic;
}

export function createApp(options: CreateAppOptions = {}) {
  const configPath = getConfigPath(options.configPath);
  const baseUrl = options.baseUrl || `http://localhost:${options.port || 3847}`;
  let config = loadConfig(configPath);

  const getConfig = (): AppConfig => {
    config = loadConfig(configPath);
    return config;
  };

  const saveConfigFn: SaveConfig = (cfg: AppConfig) => {
    config = cfg;
    saveConfig(configPath, cfg);
  };

  const routes = createAllRoutes({ getConfig, saveConfig: saveConfigFn, baseUrl });

  const staticDir = resolveStaticDir();

  async function fetch(req: globalThis.Request): Promise<globalThis.Response> {
    const url = new URL(req.url);
    const method = req.method;
    const pathname = url.pathname;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // API routes
    const match = matchRoute(routes, method, pathname);
    if (match) {
      let body: any = {};
      if (method !== 'GET' && method !== 'HEAD') {
        try {
          body = await req.json();
        } catch {
          body = {};
        }
      }

      const routeReq = {
        params: match.params,
        body,
        query: Object.fromEntries(url.searchParams),
      };
      const routeRes = new RouteResponse();

      try {
        await match.handler(routeReq, routeRes);
      } catch (err) {
        console.error('Unhandled error:', err);
        routeRes._statusCode = 500;
        routeRes._body = JSON.stringify({ error: 'Internal server error' });
        routeRes._headers['content-type'] = 'application/json';
      }

      return routeRes.toResponse(CORS_HEADERS);
    }

    // API 404 catch-all
    if (pathname.startsWith('/api')) {
      return new Response(JSON.stringify({ error: 'API route not found' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      });
    }

    // Static file serving
    const filePath = path.join(staticDir, pathname === '/' ? 'index.html' : pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const file = Bun.file(filePath);
      return new Response(file, {
        headers: { ...CORS_HEADERS, 'content-type': getMimeType(filePath) },
      });
    }

    // SPA fallback — serve index.html for non-API routes
    const indexPath = path.join(staticDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      const file = Bun.file(indexPath);
      return new Response(file, {
        headers: { ...CORS_HEADERS, 'content-type': 'text/html' },
      });
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  }

  return { fetch };
}
