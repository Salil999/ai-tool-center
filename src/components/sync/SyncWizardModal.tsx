import { useState, useEffect, useMemo } from 'react';
import { getServers } from '@/api-client/servers';
import { syncTo, getSyncTargets } from '@/api-client/servers';
import { getSkills, syncSkillsTo } from '@/api-client/skills';
import { getSubagents, syncSubagentsTo } from '@/api-client/subagents';
import { getRuleProviders, getProviderRules, syncRulesTo } from '@/api-client/rules';
import { getProviders } from '@/api-client/providers';
import type { BuiltinProvider } from '@/api-client/providers';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

type StepId = 'mcp' | 'skills' | 'subagents' | 'rules' | 'providers' | 'summary';
const STEP_IDS: StepId[] = ['mcp', 'skills', 'subagents', 'rules', 'providers', 'summary'];

const STEP_LABELS: Record<StepId, string> = {
  mcp: 'MCP Servers',
  skills: 'Skills',
  subagents: 'Subagents',
  rules: 'Rules',
  providers: 'Providers',
  summary: 'Summary',
};

interface WizardItem {
  id: string;
  name: string;
  meta?: string;
}

interface SyncWizardModalProps {
  onClose: () => void;
  onSyncComplete?: () => void;
}

export function SyncWizardModal({ onClose, onSyncComplete }: SyncWizardModalProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const currentStep = STEP_IDS[stepIdx];

  // Data
  const [mcpItems, setMcpItems] = useState<WizardItem[]>([]);
  const [skillItems, setSkillItems] = useState<WizardItem[]>([]);
  const [subagentItems, setSubagentItems] = useState<WizardItem[]>([]);
  const [ruleItems, setRuleItems] = useState<WizardItem[]>([]);
  const [providerItems, setProviderItems] = useState<WizardItem[]>([]);
  const [providerCaps, setProviderCaps] = useState<Record<string, BuiltinProvider['capabilities']>>({});
  const [loading, setLoading] = useState(true);

  // Selections — all tool items pre-selected, providers none pre-selected
  const [selectedMcp, setSelectedMcp] = useState<Set<string>>(new Set());
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [selectedSubagents, setSelectedSubagents] = useState<Set<string>>(new Set());
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());

  // Search per step
  const [searches, setSearches] = useState<Record<StepId, string>>({
    mcp: '', skills: '', subagents: '', rules: '', providers: '', summary: '',
  });

  // Sync execution state
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load all data on mount
  useEffect(() => {
    Promise.all([
      getServers().catch(() => []),
      getSkills().catch(() => []),
      getSubagents().catch(() => []),
      getSyncTargets().catch(() => ({ builtin: [] })),
      getProviders().catch(() => ({ builtin: [] })),
      getRuleProviders().catch(() => []),
    ]).then(async ([servers, skills, subagents, syncTargets, providers, ruleProviders]) => {
      const mcp = (servers as Record<string, unknown>[]).map((s) => ({
        id: String(s.id ?? s.name ?? ''),
        name: String(s.name ?? ''),
        meta: String(s.type ?? 'stdio'),
      }));
      setMcpItems(mcp);
      setSelectedMcp(new Set(mcp.map((s) => s.id)));

      const sk = (skills as Record<string, unknown>[]).map((s) => ({
        id: String(s.id ?? s.name ?? ''),
        name: String(s.name ?? ''),
        meta: String(s.path ?? ''),
      }));
      setSkillItems(sk);
      setSelectedSkills(new Set(sk.map((s) => s.id)));

      const sa = (subagents as Record<string, unknown>[]).map((s) => ({
        id: String(s.id ?? s.name ?? ''),
        name: String(s.name ?? ''),
      }));
      setSubagentItems(sa);
      setSelectedSubagents(new Set(sa.map((s) => s.id)));

      // Provider capabilities
      const caps: Record<string, BuiltinProvider['capabilities']> = {};
      for (const p of (providers as { builtin: BuiltinProvider[] }).builtin) {
        caps[p.id] = p.capabilities;
      }
      setProviderCaps(caps);

      // Sync target list
      const pv = ((syncTargets as { builtin: Array<{ id: string; name: string }> }).builtin).map((p) => ({
        id: p.id,
        name: p.name,
      }));
      setProviderItems(pv);

      // Rules from all providers
      const rp = ruleProviders as Array<{ id: string; name: string }>;
      const ruleResults = await Promise.all(
        rp.map((p) => getProviderRules(p.id).catch(() => []).then((rules) => ({ provider: p, rules })))
      );
      const allRules: WizardItem[] = [];
      for (const { provider, rules } of ruleResults) {
        for (const r of rules as Array<{ id: string; name: string; extension?: string }>) {
          allRules.push({
            id: `${provider.id}/${r.id}`,
            name: `${r.name}${r.extension ?? '.md'}`,
            meta: provider.name,
          });
        }
      }
      setRuleItems(allRules);
      setSelectedRules(new Set(allRules.map((r) => r.id)));
    }).finally(() => setLoading(false));
  }, []);

  // Filtered lists
  const filtered = useMemo(() => {
    const q = (step: StepId) => searches[step].toLowerCase();
    const f = (items: WizardItem[], step: StepId) =>
      items.filter((item) => item.name.toLowerCase().includes(q(step)));
    return {
      mcp: f(mcpItems, 'mcp'),
      skills: f(skillItems, 'skills'),
      subagents: f(subagentItems, 'subagents'),
      rules: f(ruleItems, 'rules'),
      providers: f(providerItems, 'providers'),
    };
  }, [mcpItems, skillItems, subagentItems, ruleItems, providerItems, searches]);

  const setSearch = (step: StepId, val: string) =>
    setSearches((prev) => ({ ...prev, [step]: val }));

  // Toggle helpers
  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }

  function toggleAll(items: WizardItem[], selected: Set<string>, setSelected: (s: Set<string>) => void) {
    const allIds = items.map((i) => i.id);
    const allSelected = allIds.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  const nav = {
    canBack: stepIdx > 0 && !syncing && !syncDone,
    canNext: stepIdx < STEP_IDS.length - 1,
    back: () => { setStepIdx((i) => i - 1); },
    next: () => { setStepIdx((i) => i + 1); },
  };

  // Execute sync
  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const targets = [...selectedProviders];
      await Promise.all(targets.map(async (providerId) => {
        const cap = providerCaps[providerId];
        const calls: Promise<unknown>[] = [];

        if (selectedMcp.size > 0) {
          calls.push(syncTo(providerId));
        }
        if (selectedSkills.size > 0 && cap?.skills) {
          calls.push(syncSkillsTo(providerId));
        }
        if (selectedSubagents.size > 0) {
          calls.push(syncSubagentsTo(providerId));
        }
        if (selectedRules.size > 0 && cap?.rules) {
          calls.push(syncRulesTo(providerId));
        }

        await Promise.all(calls);
      }));
      setSyncDone(true);
      onSyncComplete?.();
    } catch (err) {
      setSyncError((err as Error).message ?? 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="modal edit-modal" style={{ minWidth: 540, maxWidth: 640 }}>
        <div className="modal-header">
          <h2>Sync</h2>
          <button type="button" className="btn btn-sm" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal edit-modal" style={{ minWidth: 560, maxWidth: 660, width: '90vw' }}>
      {/* Header */}
      <div className="modal-header">
        <h2 id="sync-wizard-modal-title">Sync</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>×</button>
      </div>

      {/* Step indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 20px',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
      }}>
        {STEP_IDS.map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: i === stepIdx ? 600 : 400,
              background: i === stepIdx ? 'var(--accent, #6366f1)' : 'transparent',
              color: i === stepIdx ? '#fff' : i < stepIdx ? 'var(--text)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}>
              {i < stepIdx && (
                <Check size={10} strokeWidth={3} />
              )}
              {STEP_LABELS[step]}
            </div>
            {i < STEP_IDS.length - 1 && (
              <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="modal-body" style={{ minHeight: 340, maxHeight: 440, overflowY: 'auto' }}>
        {currentStep === 'summary' || syncDone ? (
          <SummaryStep
            mcpItems={mcpItems}
            skillItems={skillItems}
            subagentItems={subagentItems}
            ruleItems={ruleItems}
            providerItems={providerItems}
            selectedMcp={selectedMcp}
            selectedSkills={selectedSkills}
            selectedSubagents={selectedSubagents}
            selectedRules={selectedRules}
            selectedProviders={selectedProviders}
            providerCaps={providerCaps}
            syncing={syncing}
            syncDone={syncDone}
            syncError={syncError}
            onSync={handleSync}
            onClose={onClose}
          />
        ) : (
          <ItemStep
            step={currentStep}
            items={filtered[currentStep as Exclude<StepId, 'summary'>]}
            selected={
              currentStep === 'mcp' ? selectedMcp :
              currentStep === 'skills' ? selectedSkills :
              currentStep === 'subagents' ? selectedSubagents :
              currentStep === 'rules' ? selectedRules :
              selectedProviders
            }
            allItems={
              currentStep === 'mcp' ? mcpItems :
              currentStep === 'skills' ? skillItems :
              currentStep === 'subagents' ? subagentItems :
              currentStep === 'rules' ? ruleItems :
              providerItems
            }
            search={searches[currentStep]}
            onSearchChange={(v) => setSearch(currentStep, v)}
            onToggle={(id) => {
              if (currentStep === 'mcp') setSelectedMcp((s) => toggle(s, id));
              else if (currentStep === 'skills') setSelectedSkills((s) => toggle(s, id));
              else if (currentStep === 'subagents') setSelectedSubagents((s) => toggle(s, id));
              else if (currentStep === 'rules') setSelectedRules((s) => toggle(s, id));
              else setSelectedProviders((s) => toggle(s, id));
            }}
            onToggleAll={() => {
              if (currentStep === 'mcp') toggleAll(mcpItems, selectedMcp, setSelectedMcp);
              else if (currentStep === 'skills') toggleAll(skillItems, selectedSkills, setSelectedSkills);
              else if (currentStep === 'subagents') toggleAll(subagentItems, selectedSubagents, setSelectedSubagents);
              else if (currentStep === 'rules') toggleAll(ruleItems, selectedRules, setSelectedRules);
              else toggleAll(providerItems, selectedProviders, setSelectedProviders);
            }}
          />
        )}
      </div>

      {/* Footer navigation */}
      {!syncDone && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
        }}>
          <button
            type="button"
            className="btn"
            onClick={nav.back}
            disabled={!nav.canBack}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <ChevronLeft size={14} /> Back
          </button>

          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {stepIdx + 1} / {STEP_IDS.length}
          </span>

          {currentStep !== 'summary' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={nav.next}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSync}
              disabled={syncing || selectedProviders.size === 0}
            >
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Item Step ──────────────────────────────────────────────────────

interface ItemStepProps {
  step: StepId;
  items: WizardItem[];
  allItems: WizardItem[];
  selected: Set<string>;
  search: string;
  onSearchChange: (v: string) => void;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

function ItemStep({ step, items, allItems, selected, search, onSearchChange, onToggle, onToggleAll }: ItemStepProps) {
  const isProviders = step === 'providers';
  const allSelected = allItems.length > 0 && allItems.every((i) => selected.has(i.id));
  const someSelected = allItems.some((i) => selected.has(i.id));

  const emptyMsg =
    isProviders ? 'No sync targets available.' :
    allItems.length === 0 ? `No ${STEP_LABELS[step].toLowerCase()} configured.` :
    'No results.';

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          className="form-input"
          placeholder={`Search ${STEP_LABELS[step].toLowerCase()}…`}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ flex: 1, fontSize: 13 }}
          autoFocus
        />
        {allItems.length > 0 && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={onToggleAll}
            style={{ whiteSpace: 'nowrap', fontSize: 11 }}
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>

      {isProviders && !someSelected && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          Select at least one provider to sync to.
        </p>
      )}

      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>{emptyMsg}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((item) => (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                background: selected.has(item.id) ? 'var(--bg-card)' : 'transparent',
                border: `1px solid ${selected.has(item.id) ? 'var(--border)' : 'transparent'}`,
                transition: 'background 0.1s',
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => onToggle(item.id)}
                style={{ accentColor: 'var(--accent, #6366f1)', width: 14, height: 14, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, color: 'var(--text)', display: 'block', truncate: true }}>{item.name}</span>
                {item.meta && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.meta}
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Summary Step ───────────────────────────────────────────────────

interface SummaryStepProps {
  mcpItems: WizardItem[];
  skillItems: WizardItem[];
  subagentItems: WizardItem[];
  ruleItems: WizardItem[];
  providerItems: WizardItem[];
  selectedMcp: Set<string>;
  selectedSkills: Set<string>;
  selectedSubagents: Set<string>;
  selectedRules: Set<string>;
  selectedProviders: Set<string>;
  providerCaps: Record<string, BuiltinProvider['capabilities']>;
  syncing: boolean;
  syncDone: boolean;
  syncError: string | null;
  onSync: () => void;
  onClose: () => void;
}

function SummaryStep({
  mcpItems, skillItems, subagentItems, ruleItems, providerItems,
  selectedMcp, selectedSkills, selectedSubagents, selectedRules, selectedProviders,
  providerCaps, syncing, syncDone, syncError, onSync, onClose,
}: SummaryStepProps) {
  const selectedProviderNames = providerItems
    .filter((p) => selectedProviders.has(p.id))
    .map((p) => p.name);

  const rows: Array<{ label: string; count: number; targets: string[] }> = [];

  if (selectedMcp.size > 0 && selectedProviders.size > 0) {
    rows.push({
      label: 'MCP Servers',
      count: selectedMcp.size,
      targets: selectedProviderNames,
    });
  }

  if (selectedSkills.size > 0) {
    const targets = providerItems
      .filter((p) => selectedProviders.has(p.id) && providerCaps[p.id]?.skills)
      .map((p) => p.name);
    if (targets.length > 0) {
      rows.push({ label: 'Skills', count: selectedSkills.size, targets });
    }
  }

  if (selectedSubagents.size > 0 && selectedProviders.size > 0) {
    rows.push({
      label: 'Subagents',
      count: selectedSubagents.size,
      targets: selectedProviderNames,
    });
  }

  if (selectedRules.size > 0) {
    const targets = providerItems
      .filter((p) => selectedProviders.has(p.id) && providerCaps[p.id]?.rules)
      .map((p) => p.name);
    if (targets.length > 0) {
      rows.push({ label: 'Rules', count: selectedRules.size, targets });
    }
  }

  if (syncDone) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'color-mix(in srgb, #22c55e 15%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={24} style={{ color: '#22c55e' }} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Sync complete</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {rows.length} tool type{rows.length !== 1 ? 's' : ''} synced to {selectedProviderNames.join(', ')}.
        </p>
        <button type="button" className="btn btn-primary" onClick={onClose} style={{ marginTop: 8 }}>
          Done
        </button>
      </div>
    );
  }

  if (selectedProviders.size === 0) {
    return (
      <div style={{ padding: '20px 0' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          No providers selected. Go back to the Providers step and select at least one.
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: '20px 0' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Nothing to sync. Selected providers do not support the tool types you have selected.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        The following will be synced to the selected providers.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((row) => (
          <div key={row.label} style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{row.label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {row.count} item{row.count !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {row.targets.map((t) => (
                <span key={t} style={{
                  fontSize: 11,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {syncError && (
        <p style={{ fontSize: 12, color: '#f87171', marginTop: 12 }}>{syncError}</p>
      )}
    </div>
  );
}
