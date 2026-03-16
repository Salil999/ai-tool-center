/**
 * Minimal Express-compatible router for Bun.serve.
 * Provides Router, Request, and Response types that are drop-in
 * replacements for the Express equivalents used in this codebase.
 */

export interface Request {
  params: Record<string, string>;
  body: any;
  query: Record<string, string>;
}

export interface Response {
  json(data: unknown): void;
  status(code: number): Response;
  send(body?: string): void;
  redirect(url: string): void;
}

export type Handler = (req: Request, res: Response) => void | Promise<void>;

interface RouteEntry {
  method: string;
  segments: Array<{ type: 'literal' | 'param'; value: string }>;
  handler: Handler;
}

interface RouterInstance {
  get(path: string, handler: Handler): void;
  post(path: string, handler: Handler): void;
  put(path: string, handler: Handler): void;
  patch(path: string, handler: Handler): void;
  delete(path: string, handler: Handler): void;
  _routes: RouteEntry[];
}

function parsePattern(pattern: string): RouteEntry['segments'] {
  if (pattern === '/') return [];
  return pattern
    .split('/')
    .filter(Boolean)
    .map((seg) =>
      seg.startsWith(':')
        ? { type: 'param' as const, value: seg.slice(1) }
        : { type: 'literal' as const, value: seg }
    );
}

export function Router(): RouterInstance {
  const routes: RouteEntry[] = [];

  function addRoute(method: string, pattern: string, handler: Handler) {
    routes.push({ method, segments: parsePattern(pattern), handler });
  }

  return {
    get: (p, h) => addRoute('GET', p, h),
    post: (p, h) => addRoute('POST', p, h),
    put: (p, h) => addRoute('PUT', p, h),
    patch: (p, h) => addRoute('PATCH', p, h),
    delete: (p, h) => addRoute('DELETE', p, h),
    _routes: routes,
  };
}

export class RouteResponse implements Response {
  _statusCode = 200;
  _body: string | null = null;
  _headers: Record<string, string> = {};
  _redirect: string | null = null;

  status(code: number): this {
    this._statusCode = code;
    return this;
  }

  json(data: unknown): void {
    this._body = JSON.stringify(data);
    this._headers['content-type'] = 'application/json';
  }

  send(body?: string): void {
    this._body = body ?? '';
  }

  redirect(url: string): void {
    this._redirect = url;
    this._statusCode = 302;
  }

  toResponse(extraHeaders: Record<string, string> = {}): globalThis.Response {
    const headers = { ...extraHeaders, ...this._headers };
    if (this._redirect) {
      return new globalThis.Response(null, {
        status: this._statusCode,
        headers: { ...headers, Location: this._redirect },
      });
    }
    // 204 No Content must not have a body per HTTP spec
    const body = this._statusCode === 204 ? null : this._body;
    return new globalThis.Response(body, {
      status: this._statusCode,
      headers,
    });
  }
}

export interface MountedRoute {
  prefix: string;
  router: RouterInstance;
}

export function matchRoute(
  routes: MountedRoute[],
  method: string,
  pathname: string
): { handler: Handler; params: Record<string, string> } | null {
  for (const { prefix, router } of routes) {
    if (!pathname.startsWith(prefix)) continue;
    const subPath = pathname.slice(prefix.length) || '/';
    const pathSegments = subPath === '/' ? [] : subPath.split('/').filter(Boolean);

    for (const route of router._routes) {
      if (route.method !== method) continue;
      if (route.segments.length !== pathSegments.length) continue;

      const params: Record<string, string> = {};
      let matched = true;

      for (let i = 0; i < route.segments.length; i++) {
        const seg = route.segments[i];
        if (seg.type === 'literal') {
          if (seg.value !== pathSegments[i]) {
            matched = false;
            break;
          }
        } else {
          params[seg.value] = decodeURIComponent(pathSegments[i]);
        }
      }

      if (matched) return { handler: route.handler, params };
    }
  }
  return null;
}
