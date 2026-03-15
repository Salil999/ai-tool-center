import { Router, Request, Response } from 'express';
import { loadCreds, saveCreds } from '../credentials/store.js';
import { slugify, uniqueId } from '../utils/slugify.js';
import { getOrderedIds } from './route-utils.js';
import type { AuditStore } from '../audit/store.js';
import type { AppConfig } from '../types.js';

type GetConfig = () => AppConfig;

export function createCredentialsRouter(getConfig: GetConfig, auditStore: AuditStore) {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const data = loadCreds();
    const ids = getOrderedIds(data.items, data.order);
    const list = ids.map((id) => ({ id, ...data.items[id] }));
    res.json(list);
  });

  router.post('/', (req: Request, res: Response) => {
    const data = loadCreds();
    const body = (req.body || {}) as { name?: string; value?: string };
    const name = String(body.name || '').trim();
    const value = String(body.value ?? '');

    if (!name) return res.status(400).json({ error: 'name is required' });

    const id = uniqueId(slugify(name, 'credential'), Object.keys(data.items));

    data.items[id] = { name, value };
    data.order = data.order.filter((i) => data.items[i]);
    if (!data.order.includes(id)) data.order.push(id);

    saveCreds(data);
    const config = getConfig();
    auditStore.record('credential_create', config, config, { credentialId: id, credentialName: name, credentialValue: value });

    res.status(201).json({ id, name, value });
  });

  router.patch('/reorder', (req: Request, res: Response) => {
    const data = loadCreds();
    const order = (req.body as { order?: string[] })?.order;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of credential IDs' });
    const ids = getOrderedIds(data.items, order);
    data.order = ids;
    saveCreds(data);
    const config = getConfig();
    auditStore.record('credential_reorder', config, config, { order: data.order });
    res.json({ order: data.order });
  });

  router.get('/:id', (req: Request, res: Response) => {
    const data = loadCreds();
    const id = String(req.params.id ?? '');
    const item = data.items[id];
    if (!item) return res.status(404).json({ error: 'Credential not found' });
    res.json({ id, ...item });
  });

  router.put('/:id', (req: Request, res: Response) => {
    const data = loadCreds();
    const id = String(req.params.id ?? '');
    const item = data.items[id];
    if (!item) return res.status(404).json({ error: 'Credential not found' });

    const body = (req.body || {}) as { name?: string; value?: string };
    if (body.name !== undefined) item.name = String(body.name).trim();
    if (body.value !== undefined) item.value = String(body.value);

    if (!item.name) return res.status(400).json({ error: 'name cannot be empty' });

    saveCreds(data);
    const config = getConfig();
    auditStore.record('credential_update', config, config, { credentialId: id, credentialName: item.name, credentialValue: item.value });

    res.json({ id, ...item });
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const data = loadCreds();
    const id = String(req.params.id ?? '');
    const item = data.items[id];
    if (!item) return res.status(404).json({ error: 'Credential not found' });

    delete data.items[id];
    data.order = data.order.filter((i) => i !== id);

    saveCreds(data);
    const config = getConfig();
    auditStore.record('credential_delete', config, config, { credentialId: id, credentialName: item.name, credentialValue: item.value });

    res.status(204).send();
  });

  return router;
}
