import type { Request, Response } from '../router.js';
import { slugify, uniqueId } from '../utils/slugify.js';
import type { AppConfig, GetConfig, SaveConfig } from '../types.js';

/**
 * Generate a unique ID from a body payload, avoiding collisions with existing IDs.
 * Looks for body.id or body.name, slugifies it, then appends a suffix if needed.
 */
export function generateIdFromBody(
  body: Record<string, unknown>,
  existingIds: string[],
  fallback = 'item'
): string {
  const base = slugify(String(body.id || body.name || fallback), fallback);
  return uniqueId(base, existingIds);
}

/**
 * Create a reorder handler for any ordered collection in config.
 * Reduces the duplicated reorder PATCH handler across servers, skills, rules, etc.
 */
export function handleReorder(
  getConfig: GetConfig,
  saveConfig: SaveConfig,
  options: {
    /** Config key holding the items record (e.g. 'servers', 'skills'). */
    itemsKey: keyof AppConfig;
    /** Config key holding the order array (e.g. 'serverOrder', 'skillOrder'). */
    orderKey: keyof AppConfig;
    /** Error message for invalid input. */
    errorMessage?: string;
  }
) {
  return (req: Request, res: Response) => {
    const config = getConfig();
    const order = (req.body as { order?: string[] })?.order;
    if (!Array.isArray(order)) {
      return res.status(400).json({
        error: options.errorMessage || `order must be an array of ${String(options.itemsKey)} IDs`,
      });
    }
    const items = (config[options.itemsKey] || {}) as Record<string, unknown>;
    const validOrder = order.filter((id) => items[id]);
    const extraIds = Object.keys(items).filter((id) => !validOrder.includes(id));
    const newOrder = [...validOrder, ...extraIds];
    (config as Record<string, unknown>)[options.orderKey as string] = newOrder;
    saveConfig(config);
    res.json({ order: newOrder });
  };
}

/**
 * Create an enabled toggle handler for items in a config record.
 */
export function handleToggleEnabled(
  getConfig: GetConfig,
  saveConfig: SaveConfig,
  options: {
    /** Config key holding the items record. */
    itemsKey: keyof AppConfig;
    /** Name used in error messages (e.g. 'Server', 'Skill'). */
    entityName: string;
  }
) {
  return (req: Request, res: Response) => {
    const config = getConfig();
    const id = String(req.params.id ?? '');
    const items = (config[options.itemsKey] || {}) as Record<string, { enabled?: boolean }>;
    const item = items[id];
    if (!item) return res.status(404).json({ error: `${options.entityName} not found` });
    const enabled = (req.body as { enabled?: boolean })?.enabled;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be boolean' });
    item.enabled = enabled;
    saveConfig(config);
    res.json({ id, enabled });
  };
}

/**
 * Get ordered IDs from a config items record and optional order array.
 * Shared logic used by list endpoints for servers, skills, etc.
 */
export function getOrderedIds(
  items: Record<string, unknown>,
  order?: string[]
): string[] {
  const allOrder = order || Object.keys(items);
  const orderedIds = allOrder.filter((id) => items[id]);
  const extraIds = Object.keys(items).filter((id) => !orderedIds.includes(id));
  return [...orderedIds, ...extraIds];
}
