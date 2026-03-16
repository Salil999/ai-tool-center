/**
 * Test helpers for creating app with in-memory config.
 */
import { createServersRouter } from '../api/servers.js';
import { createSyncRouter } from '../api/sync.js';
import { createConfigRouter } from '../api/config.js';
import { createImportRouter } from '../api/import.js';
import { RouteResponse, matchRoute } from '../router.js';
import type { MountedRoute } from '../router.js';
import type { AppConfig } from '../types.js';

export interface CreateTestAppOptions {
  config?: AppConfig;
  baseUrl?: string;
}

export type TestApp = { fetch: (req: globalThis.Request) => Promise<globalThis.Response> };

export function createTestApp(options: CreateTestAppOptions = {}): TestApp {
  let config: AppConfig = options.config || {
    servers: {},
  };

  const getConfig = (): AppConfig => ({ ...config });
  const saveConfig = (cfg: AppConfig) => {
    config = cfg;
  };
  const baseUrl = options.baseUrl || 'http://localhost:3847';

  const routes: MountedRoute[] = [
    { prefix: '/api/servers', router: createServersRouter(getConfig, saveConfig, baseUrl) },
    { prefix: '/api/sync', router: createSyncRouter(getConfig) },
    { prefix: '/api/config', router: createConfigRouter(getConfig, saveConfig) },
    { prefix: '/api/import', router: createImportRouter(getConfig, saveConfig) },
  ];

  async function fetch(req: globalThis.Request): Promise<globalThis.Response> {
    const url = new URL(req.url);
    const method = req.method;
    const pathname = url.pathname;

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

      return routeRes.toResponse();
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  return { fetch };
}

/**
 * Supertest-compatible request helper that works with our fetch-based app.
 */

interface TestResponse {
  status: number;
  body: any;
}

interface TestChain extends PromiseLike<TestResponse> {
  send(body: unknown): TestChain;
  query(params: Record<string, string>): TestChain;
}

export function request(app: TestApp) {
  function chain(method: string, urlPath: string): TestChain {
    let sendBody: unknown;
    let queryParams: Record<string, string> = {};

    const obj: TestChain = {
      send(body: unknown) {
        sendBody = body;
        return obj;
      },
      query(params: Record<string, string>) {
        queryParams = { ...queryParams, ...params };
        return obj;
      },
      then(onFulfilled?, onRejected?) {
        const promise = (async (): Promise<TestResponse> => {
          let url = `http://test${urlPath}`;
          const qs = new URLSearchParams(queryParams).toString();
          if (qs) url += `?${qs}`;

          const init: RequestInit = { method };
          if (sendBody !== undefined) {
            init.body = JSON.stringify(sendBody);
            init.headers = { 'Content-Type': 'application/json' };
          }
          const response = await app.fetch(new Request(url, init));
          const ct = response.headers.get('content-type') || '';
          let body: any;
          if (ct.includes('json')) {
            body = await response.json();
          } else {
            const text = await response.text();
            body = text || undefined;
          }
          return { status: response.status, body };
        })();
        return promise.then(onFulfilled, onRejected);
      },
    };
    return obj;
  }

  return {
    get: (p: string) => chain('GET', p),
    post: (p: string) => chain('POST', p),
    put: (p: string) => chain('PUT', p),
    patch: (p: string) => chain('PATCH', p),
    delete: (p: string) => chain('DELETE', p),
  };
}
