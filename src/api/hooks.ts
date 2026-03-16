import { Router, Request, Response } from '../router.js';
import {
  loadHooks,
  saveHooks,
  getGlobalHooksPath,
  getProjectHooksPath,
  getProjectLocalHooksPath,
  type HookItem,
} from '../hooks/store.js';
import { HOOK_PROVIDERS } from '../hooks/providers/index.js';
import { slugify, uniqueId } from '../utils/slugify.js';
import { getOrderedIds } from './route-utils.js';
import { resolvePath } from '../providers/utils.js';
import { lintRawHookConfig } from '../hooks/lint.js';
import type { HookProviderDefinition, GetConfig } from '../types.js';

function resolveProjectPath(provider: HookProviderDefinition, projectPath: string): string {
  return provider.getProjectSettingsPath(resolvePath(projectPath));
}

/**
 * Attach CRUD + import/sync routes at `prefix` within the given router.
 * `getStorePath` and `getSettingsPath` are called per-request so project paths
 * stay current.
 */
function attachScopedRoutes(
  router: ReturnType<typeof Router>,
  prefix: string,
  getStorePath: (req: Request) => string | null,
  getSettingsPath: (req: Request) => string | null,
  getProvider: (req: Request) => HookProviderDefinition | null
) {
  type Scope = { storePath: string; settingsPath: string; provider: HookProviderDefinition };

  const resolve = (req: Request, res: Response): Scope | null => {
    const storePath = getStorePath(req);
    const settingsPath = getSettingsPath(req);
    const provider = getProvider(req);
    if (!storePath || !settingsPath || !provider) {
      res.status(404).json({ error: 'Scope or provider not found' });
      return null;
    }
    return { storePath, settingsPath, provider };
  };

  router.get(prefix, (req: Request, res: Response) => {
    const scope = resolve(req, res);
    if (!scope) return;
    const data = loadHooks(scope.storePath);
    const ids = getOrderedIds(data.items, data.order);
    res.json(ids.map((id) => ({ id, ...data.items[id] })));
  });

  router.post(prefix, (req: Request, res: Response) => {
    const scope = resolve(req, res);
    if (!scope) return;
    const body = (req.body ?? {}) as Partial<HookItem>;
    const event = String(body.event ?? '').trim();
    if (!event) return res.status(400).json({ error: 'event is required' });
    const data = loadHooks(scope.storePath);
    const id = uniqueId(slugify(event, 'hook'), Object.keys(data.items));
    data.items[id] = buildItem(body, event);
    if (!data.order.includes(id)) data.order.push(id);
    saveHooks(data, scope.storePath);
    res.status(201).json({ id, ...data.items[id] });
  });

  router.patch(`${prefix}/reorder`, (req: Request, res: Response) => {
    const scope = resolve(req, res);
    if (!scope) return;
    const order = (req.body as { order?: string[] })?.order;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });
    const data = loadHooks(scope.storePath);
    data.order = getOrderedIds(data.items, order);
    saveHooks(data, scope.storePath);
    res.json({ order: data.order });
  });

  router.post(`${prefix}/import`, (req: Request, res: Response) => {
    const scope = resolve(req, res);
    if (!scope) return;
    try {
      const imported = scope.provider.importFromFile(scope.settingsPath);
      if (imported.length === 0) {
        return res.json({ importedCount: 0, message: `No hooks found in ${scope.settingsPath}` });
      }
      const data = loadHooks(scope.storePath);
      let importedCount = 0;
      for (const item of imported) {
        const id = uniqueId(slugify(item.event, 'hook'), Object.keys(data.items));
        data.items[id] = item;
        data.order.push(id);
        importedCount++;
      }
      saveHooks(data, scope.storePath);
      res.json({ importedCount });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post(`${prefix}/sync`, (req: Request, res: Response) => {
    const scope = resolve(req, res);
    if (!scope) return;
    try {
      const data = loadHooks(scope.storePath);
      const ids = getOrderedIds(data.items, data.order);
      const hooks = ids.map((id) => data.items[id]).filter(Boolean);
      scope.provider.syncToFile(hooks, scope.settingsPath);
      res.json({ success: true, syncedCount: hooks.length, path: scope.settingsPath });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get(`${prefix}/:hookId`, (req: Request, res: Response) => {
    const scope = resolve(req, res);
    if (!scope) return;
    const id = String(req.params.hookId);
    const data = loadHooks(scope.storePath);
    const item = data.items[id];
    if (!item) return res.status(404).json({ error: 'Hook not found' });
    res.json({ id, ...item });
  });

  router.put(`${prefix}/:hookId`, (req: Request, res: Response) => {
    const scope = resolve(req, res);
    if (!scope) return;
    const id = String(req.params.hookId);
    const data = loadHooks(scope.storePath);
    if (!data.items[id]) return res.status(404).json({ error: 'Hook not found' });
    const body = (req.body ?? {}) as Partial<HookItem>;
    const event = String(body.event ?? data.items[id].event).trim();
    data.items[id] = buildItem(body, event);
    saveHooks(data, scope.storePath);
    res.json({ id, ...data.items[id] });
  });

  router.delete(`${prefix}/:hookId`, (req: Request, res: Response) => {
    const scope = resolve(req, res);
    if (!scope) return;
    const id = String(req.params.hookId);
    const data = loadHooks(scope.storePath);
    if (!data.items[id]) return res.status(404).json({ error: 'Hook not found' });
    delete data.items[id];
    data.order = data.order.filter((i) => i !== id);
    saveHooks(data, scope.storePath);
    res.status(204).send();
  });

  // Raw config validator
  router.post(`${prefix}/validate-raw`, (req: Request, res: Response) => {
    const scope = resolve(req, res);
    if (!scope) return;
    const rawContent = typeof req.body === 'string' ? req.body : (req.body?.content as string ?? '');
    try {
      const report = lintRawHookConfig(rawContent, scope.provider);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });
}

export function createHooksRouter(getConfig: GetConfig) {
  const router = Router();

  // Metadata: all providers with their event/type capabilities
  router.get('/meta', (_req, res) => {
    res.json(
      HOOK_PROVIDERS.map((p) => ({
        id: p.id,
        name: p.name,
        supportedEvents: p.supportedEvents,
        matcherEvents: p.matcherEvents,
        supportedTypes: p.supportedTypes,
        supportsProjectScope: p.supportsProjectScope,
        supportsProjectLocalScope: p.supportsProjectLocalScope ?? false,
        supportsGlobalScope: p.supportsGlobalScope !== false,
        userSettingsPath: p.getUserSettingsPath(),
      }))
    );
  });

  // Per-provider scoped routes
  for (const provider of HOOK_PROVIDERS) {
    const pid = provider.id;

    // Global/user scope (skipped for workspace-only providers like VS Code)
    if (provider.supportsGlobalScope !== false) {
      attachScopedRoutes(
        router,
        `/${pid}/global`,
        () => getGlobalHooksPath(pid),
        () => provider.getUserSettingsPath(),
        () => provider
      );
    }

    // Project-local scope (e.g. .claude/settings.local.json — uncommitted)
    // Must be registered before project scope so /local is not matched as :hookId
    if (provider.supportsProjectLocalScope && provider.getProjectLocalSettingsPath) {
      attachScopedRoutes(
        router,
        `/${pid}/project/:projectId/local`,
        (req) => {
          const project = getConfig().projectDirectories?.find(
            (p) => p.id === req.params.projectId
          );
          return project ? getProjectLocalHooksPath(pid, project.id) : null;
        },
        (req) => {
          const project = getConfig().projectDirectories?.find(
            (p) => p.id === req.params.projectId
          );
          return project && provider.getProjectLocalSettingsPath
            ? provider.getProjectLocalSettingsPath(resolvePath(project.path))
            : null;
        },
        () => provider
      );
    }

    // Project scope
    if (provider.supportsProjectScope) {
      attachScopedRoutes(
        router,
        `/${pid}/project/:projectId`,
        (req) => {
          const project = getConfig().projectDirectories?.find(
            (p) => p.id === req.params.projectId
          );
          return project ? getProjectHooksPath(pid, project.id) : null;
        },
        (req) => {
          const project = getConfig().projectDirectories?.find(
            (p) => p.id === req.params.projectId
          );
          return project ? resolveProjectPath(provider, project.path) : null;
        },
        () => provider
      );
    }
  }

  return router;
}

function buildItem(body: Partial<HookItem>, event: string): HookItem {
  const type = (['command', 'http', 'prompt', 'agent'] as const).includes(body.type as 'command')
    ? (body.type as HookItem['type'])
    : 'command';

  const item: HookItem = { event, type };
  if (body.matcher !== undefined && String(body.matcher).trim()) item.matcher = String(body.matcher).trim();
  if (body.command) item.command = String(body.command);
  if (body.async !== undefined) item.async = Boolean(body.async);
  if (type === 'http' && body.url) item.url = String(body.url);
  if (type === 'http' && body.headers && typeof body.headers === 'object') item.headers = body.headers as Record<string, string>;
  if ((type === 'prompt' || type === 'agent') && body.prompt) item.prompt = String(body.prompt);
  if (body.model) item.model = String(body.model);
  if (body.timeout !== undefined && Number(body.timeout) > 0) item.timeout = Number(body.timeout);
  if (body.statusMessage) item.statusMessage = String(body.statusMessage);
  if (body.failClosed !== undefined) item.failClosed = Boolean(body.failClosed);
  if (body.loopLimit !== undefined) item.loopLimit = body.loopLimit === null ? null : Number(body.loopLimit);
  // VS Code specific
  if (body.windows !== undefined && String(body.windows).trim()) item.windows = String(body.windows).trim();
  if (body.linux !== undefined && String(body.linux).trim()) item.linux = String(body.linux).trim();
  if (body.osx !== undefined && String(body.osx).trim()) item.osx = String(body.osx).trim();
  if (body.cwd !== undefined && String(body.cwd).trim()) item.cwd = String(body.cwd).trim();
  if (body.env !== undefined && typeof body.env === 'object' && !Array.isArray(body.env)) {
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(body.env)) {
      if (typeof v === 'string') env[k] = v;
    }
    if (Object.keys(env).length > 0) item.env = env;
  }
  return item;
}
