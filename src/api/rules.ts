import { Router, Request, Response } from '../router.js';
import {
  MULTI_FILE_RULE_PROVIDERS,
  getOrderedProviderRules,
  readProviderRuleContent,
  writeProviderRuleContent,
  createProviderRule,
  deleteProviderRule,
  syncProviderRulesToTarget,
} from '../rules/provider-rules.js';
import { getRulesProviders, getRuleProviderPath } from '../rules/providers.js';
import { lintProviderRule, lintRuleContent } from '../rules/lint.js';
import type { GetConfig, SaveConfig } from '../types.js';

export function createRulesRouter(getConfig: GetConfig, saveConfig: SaveConfig) {
  const router = Router();

  router.get('/providers', (_req: Request, res: Response) => {
    const config = getConfig();
    const ruleProviders = getRulesProviders(config);
    const builtIn = ruleProviders
      .filter((p) => p.id === 'cursor')
      .map((p) => ({ id: p.id, name: 'Cursor Rules' }));
    const custom = (config.customRuleConfigs || []).map((c) => ({
      id: `custom-${c.id}`,
      name: c.name,
    }));
    res.json([...builtIn, ...custom]);
  });

  router.get('/providers/:providerId/rules', (req: Request, res: Response) => {
    const config = getConfig();
    const providerId = String(req.params.providerId ?? '');
    const isBuiltIn = providerId === 'cursor';
    const isCustom = providerId.startsWith('custom-') && (config.customRuleConfigs || []).some((c) => `custom-${c.id}` === providerId);
    if (!isBuiltIn && !isCustom) {
      return res.status(400).json({ error: `Unknown provider: ${providerId}` });
    }
    try {
      const rules = getOrderedProviderRules(providerId, config);
      res.json(rules);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/providers/:providerId/rules/:ruleId/content', (req: Request, res: Response) => {
    const config = getConfig();
    const providerId = String(req.params.providerId ?? '');
    const ruleId = String(req.params.ruleId ?? '');
    try {
      const content = readProviderRuleContent(providerId, ruleId, config);
      res.json({ content });
    } catch (err) {
      res.status(404).json({ error: (err as Error).message });
    }
  });

  router.put('/providers/:providerId/rules/:ruleId/content', (req: Request, res: Response) => {
    const config = getConfig();
    const providerId = String(req.params.providerId ?? '');
    const ruleId = String(req.params.ruleId ?? '');
    const content = typeof req.body === 'string' ? req.body : (req.body?.content as string ?? '');
    try {
      writeProviderRuleContent(providerId, ruleId, content, config);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.post('/providers/:providerId/rules', (req: Request, res: Response) => {
    const config = getConfig();
    const providerId = String(req.params.providerId ?? '');
    const { name, content } = (req.body || {}) as { name?: string; content?: string };
    const effectiveName = (name ?? '').trim();
    if (!effectiveName) {
      return res.status(400).json({ error: 'name is required' });
    }
    try {
        const rule = createProviderRule(providerId, effectiveName, (content ?? '').trim(), config);
      const order = config.providerRuleOrder?.[providerId] ?? [];
      if (!order.includes(rule.id)) {
        config.providerRuleOrder = config.providerRuleOrder ?? {};
        config.providerRuleOrder[providerId] = [...order, rule.id];
        saveConfig(config, {
          action: 'provider_rule_create',
          details: { providerId, ruleId: rule.id, ruleName: rule.name },
        });
      }
      res.status(201).json(rule);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.delete('/providers/:providerId/rules/:ruleId', (req: Request, res: Response) => {
    const config = getConfig();
    const providerId = String(req.params.providerId ?? '');
    const ruleId = String(req.params.ruleId ?? '');
    try {
      deleteProviderRule(providerId, ruleId, config);
      if (config.providerRuleOrder?.[providerId]) {
        config.providerRuleOrder[providerId] = config.providerRuleOrder[providerId].filter((id) => id !== ruleId);
        saveConfig(config, {
          action: 'provider_rule_delete',
          details: { providerId, ruleId },
        });
      }
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Lint rule content without an existing rule (e.g. when adding new)
  router.post('/providers/:providerId/rules/validate-content', (req: Request, res: Response) => {
    const content = (req.body?.content as string) ?? '';
    try {
      const report = lintRuleContent(content);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Lint an existing rule file on disk
  router.get('/providers/:providerId/rules/:ruleId/lint', (req: Request, res: Response) => {
    const config = getConfig();
    const providerId = String(req.params.providerId ?? '');
    const ruleId = String(req.params.ruleId ?? '');
    try {
      const rules = getOrderedProviderRules(providerId, config);
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) return res.status(404).json({ error: 'Rule not found' });
      const report = lintProviderRule(rule.path);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Lint content for an existing rule (e.g. while editing)
  router.post('/providers/:providerId/rules/:ruleId/lint-content', (req: Request, res: Response) => {
    const config = getConfig();
    const providerId = String(req.params.providerId ?? '');
    const ruleId = String(req.params.ruleId ?? '');
    const rules = getOrderedProviderRules(providerId, config);
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    const content = (req.body?.content as string) ?? '';
    const fileName = `${ruleId}${rule.extension}`;
    try {
      const report = lintRuleContent(content, fileName);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.patch('/providers/:providerId/rules/reorder', (req: Request, res: Response) => {
    const config = getConfig();
    const providerId = String(req.params.providerId ?? '');
    const { order } = (req.body || {}) as { order?: string[] };
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array' });
    }
    const rules = getOrderedProviderRules(providerId, config);
    const validOrder = order.filter((id) => rules.some((r) => r.id === id));
    const extra = rules.filter((r) => !validOrder.includes(r.id)).map((r) => r.id);
    config.providerRuleOrder = config.providerRuleOrder ?? {};
    config.providerRuleOrder[providerId] = [...validOrder, ...extra];
    saveConfig(config, {
      action: 'provider_rule_reorder',
      details: { providerId, order: config.providerRuleOrder[providerId] },
    });
    res.json({ order: config.providerRuleOrder[providerId] });
  });

  return router;
}
