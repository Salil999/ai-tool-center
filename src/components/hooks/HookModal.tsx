import { useState, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { jsonParseLinter } from '@codemirror/lang-json';
import { linter } from '@codemirror/lint';
import { indentUnit } from '@codemirror/language';
import { indentWithTab } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap } from '@codemirror/view';
import type { HookItem, HookLintReport } from '../../types';
import type { Hook, HookProviderMeta, HookScope } from '../../api-client/hooks';
import { validateRawHookConfig } from '../../api-client/hooks';

interface HookModalProps {
  hook: Hook | null;
  provider: HookProviderMeta;
  providerId: string;
  scope: HookScope;
  onClose: () => void;
  onSave: (data: HookItem) => void;
}

interface FormState {
  event: string;
  matcher: string;
  type: HookItem['type'];
  command: string;
  asyncMode: boolean;
  url: string;
  headers: string;
  prompt: string;
  model: string;
  timeout: string;
  statusMessage: string;
  failClosed: boolean;
  loopLimit: string;
  // VS Code specific
  windows: string;
  linux: string;
  osx: string;
  cwd: string;
  env: string;
}

function hookToForm(hook: Hook | null, provider: HookProviderMeta): FormState {
  const firstEvent = provider.supportedEvents[0] ?? 'PreToolUse';
  const firstType = provider.supportedTypes[0] ?? 'command';

  return {
    event: hook?.event ?? firstEvent,
    matcher: hook?.matcher ?? '',
    type: hook?.type ?? firstType,
    command: hook?.command ?? '',
    asyncMode: hook?.async ?? false,
    url: hook?.url ?? '',
    headers: hook?.headers ? JSON.stringify(hook.headers, null, 2) : '{}',
    prompt: hook?.prompt ?? '',
    model: hook?.model ?? '',
    timeout: hook?.timeout !== undefined ? String(hook.timeout) : '',
    statusMessage: hook?.statusMessage ?? '',
    failClosed: hook?.failClosed ?? false,
    loopLimit: hook?.loopLimit !== undefined ? (hook.loopLimit === null ? '' : String(hook.loopLimit)) : '5',
    windows: hook?.windows ?? '',
    linux: hook?.linux ?? '',
    osx: hook?.osx ?? '',
    cwd: hook?.cwd ?? '',
    env: hook?.env ? JSON.stringify(hook.env, null, 2) : '{}',
  };
}

function formToHook(form: FormState, provider: HookProviderMeta): HookItem {
  const matcherEventSet = new Set(provider.matcherEvents);
  const supportsMatchers = matcherEventSet.has(form.event);
  const isClaude = provider.id === 'claude';
  const isCursor = provider.id === 'cursor';
  const isVSCode = provider.id === 'vscode';

  const data: HookItem = { event: form.event, type: isVSCode ? 'command' : form.type };
  if (supportsMatchers && form.matcher.trim()) data.matcher = form.matcher.trim();

  if (form.type === 'command' || isVSCode) {
    data.command = form.command.trim();
    if (isClaude && form.asyncMode) data.async = true;
    if (isVSCode) {
      if (form.windows.trim()) data.windows = form.windows.trim();
      if (form.linux.trim()) data.linux = form.linux.trim();
      if (form.osx.trim()) data.osx = form.osx.trim();
      if (form.cwd.trim()) data.cwd = form.cwd.trim();
      try {
        const parsed = JSON.parse(form.env);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
          const env: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string') env[k] = v;
          }
          if (Object.keys(env).length > 0) data.env = env;
        }
      } catch {
        // ignore invalid JSON
      }
    }
  }
  if (form.type === 'http') {
    data.url = form.url.trim();
    try {
      const parsed = JSON.parse(form.headers);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        data.headers = parsed;
      }
    } catch {
      // ignore invalid JSON
    }
  }
  if (form.type === 'prompt' || form.type === 'agent') {
    data.prompt = form.prompt.trim();
    if (form.model.trim()) data.model = form.model.trim();
  }

  const t = parseInt(form.timeout, 10);
  if (!isNaN(t) && t > 0) data.timeout = t;
  if (isClaude && form.statusMessage.trim()) data.statusMessage = form.statusMessage.trim();
  if (isCursor) {
    if (form.failClosed) data.failClosed = true;
    const ll = form.loopLimit.trim();
    if (ll === '') data.loopLimit = null;
    else {
      const n = parseInt(ll, 10);
      if (!isNaN(n)) data.loopLimit = n;
    }
  }

  return data;
}

function hookToRaw(hook: HookItem): string {
  return JSON.stringify(hook, null, 2);
}

function rawToHook(raw: string): HookItem | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as HookItem;
  } catch {
    return null;
  }
}

export function HookModal({ hook, provider, providerId, scope, onClose, onSave }: HookModalProps) {
  const isEdit = hook !== null;
  const [activeTab, setActiveTab] = useState<'form' | 'raw'>('form');
  const [form, setForm] = useState<FormState>(() => hookToForm(hook, provider));
  const [rawJson, setRawJson] = useState(() => hook ? hookToRaw(hook) : hookToRaw(formToHook(hookToForm(null, provider), provider)));
  const [lintReport, setLintReport] = useState<HookLintReport | null>(null);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matcherEventSet = new Set(provider.matcherEvents);
  const isClaude = provider.id === 'claude';
  const isCursor = provider.id === 'cursor';
  const isVSCode = provider.id === 'vscode';
  const supportsMatchers = matcherEventSet.has(form.event);
  const availableTypes = provider.supportedTypes;

  const syncFormToRaw = useCallback(() => {
    const hookData = formToHook(form, provider);
    setRawJson(hookToRaw(hookData));
  }, [form, provider]);

  const syncRawToForm = useCallback(() => {
    const hookData = rawToHook(rawJson);
    if (hookData) {
      setForm(hookToForm({ ...hookData, id: hook?.id ?? '' } as Hook, provider));
    }
  }, [rawJson, hook, provider]);

  const handleTabChange = (tab: 'form' | 'raw') => {
    if (tab === 'raw') {
      syncFormToRaw();
    } else {
      syncRawToForm();
    }
    setActiveTab(tab);
    setLintReport(null);
  };

  const handleValidate = async () => {
    setValidating(true);
    setError(null);
    try {
      const report = await validateRawHookConfig(providerId, scope, `[${rawJson}]`);
      setLintReport(report);
    } catch (err) {
      setError((err as Error).message);
      setLintReport(null);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let hookData: HookItem;
    if (activeTab === 'raw') {
      const parsed = rawToHook(rawJson);
      if (!parsed) {
        setError('Invalid JSON. Fix errors before saving.');
        return;
      }
      hookData = parsed;
    } else {
      if ((form.type === 'command' || isVSCode) && !form.command.trim()) {
        setError('Command is required');
        return;
      }
      if (form.type === 'http' && !form.url.trim()) {
        setError('URL is required');
        return;
      }
      if ((form.type === 'prompt' || form.type === 'agent') && !form.prompt.trim()) {
        setError('Prompt is required');
        return;
      }
      hookData = formToHook(form, provider);
    }

    onSave(hookData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const rawValid = rawToHook(rawJson) !== null;

  const extensions = [
    json(),
    linter(jsonParseLinter()),
    indentUnit.of('  '),
    keymap.of([indentWithTab]),
    EditorView.lineWrapping,
    EditorView.theme({
      '&': { fontSize: '13px' },
      '& .cm-scroller': { fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" },
    }),
  ];

  return (
    <div className="modal edit-modal">
      <div className="modal-header">
        <h2 id="hook-modal-title">
          {isEdit ? 'Edit Hook' : 'Add Hook'} — {provider.name}
        </h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-tabs">
        <button
          type="button"
          className={`modal-tab ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => handleTabChange('form')}
        >
          Form
        </button>
        <button
          type="button"
          className={`modal-tab ${activeTab === 'raw' ? 'active' : ''}`}
          onClick={() => handleTabChange('raw')}
        >
          Raw JSON
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSubmit}>
        {activeTab === 'form' && (
          <>
            <div className="form-group">
              <label htmlFor="hook-event">Event</label>
              <select
                id="hook-event"
                name="event"
                className="form-input"
                value={form.event}
                onChange={handleChange}
              >
                {provider.supportedEvents.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </select>
            </div>

            {supportsMatchers && !isVSCode && (
              <div className="form-group">
                <label htmlFor="hook-matcher">
                  Matcher <span className="form-label-optional">(optional)</span>
                </label>
                <input
                  id="hook-matcher"
                  name="matcher"
                  type="text"
                  className="form-input"
                  value={form.matcher}
                  onChange={handleChange}
                  placeholder={
                    isCursor
                      ? 'Shell  or  curl|wget  or  explore|shell'
                      : 'Bash  or  Edit|Write  or  mcp__.*'
                  }
                />
                <p className="form-hint">
                  {isCursor
                    ? 'Tool type or command pattern. Supports alternation (|).'
                    : 'Regex pattern matched against tool name. Supports alternation (|) and wildcards (.*).'
                  }
                </p>
              </div>
            )}

            {availableTypes.length > 1 && !isVSCode && (
              <div className="form-group">
                <label htmlFor="hook-type">Handler type</label>
                <select
                  id="hook-type"
                  name="type"
                  className="form-input"
                  value={form.type}
                  onChange={handleChange}
                >
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>
                      {typeLabel(t)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(form.type === 'command' || isVSCode) && (
              <>
                <div className="form-group">
                  <label htmlFor="hook-command">Command</label>
                  <input
                    id="hook-command"
                    name="command"
                    type="text"
                    className="form-input"
                    value={form.command}
                    onChange={handleChange}
                    placeholder={
                      isVSCode
                        ? './scripts/format.sh  or  npx prettier --write "$TOOL_INPUT_FILE_PATH"'
                        : isCursor
                          ? '.cursor/hooks/validate.sh'
                          : '.claude/hooks/validate.sh  or  jq -r ".tool_input.file_path" | xargs prettier --write'
                    }
                    autoFocus={!isEdit}
                  />
                  <p className="form-hint">
                    {isVSCode ? (
                      <>
                        Shell command or script path. Runs from workspace root. Use <code>$TOOL_INPUT_FILE_PATH</code> and
                        similar env vars. Exit code 2 blocks the action.
                      </>
                    ) : isCursor ? (
                      <>
                        Script path. User-scope hooks run from <code>~/.cursor/</code>; project hooks
                        run from the project root. Exit code 2 blocks the action.
                      </>
                    ) : (
                      <>
                        Shell command or script. Use <code>$CLAUDE_PROJECT_DIR</code> for the project
                        root. Exit code 2 = block (stderr shown to Claude).
                      </>
                    )}
                  </p>
                </div>
                {isVSCode && (
                  <>
                    <div className="form-group">
                      <label htmlFor="hook-windows">
                        Windows <span className="form-label-optional">(optional override)</span>
                      </label>
                      <input
                        id="hook-windows"
                        name="windows"
                        type="text"
                        className="form-input"
                        value={form.windows}
                        onChange={handleChange}
                        placeholder="powershell -File scripts\\format.ps1"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="hook-linux">
                        Linux <span className="form-label-optional">(optional override)</span>
                      </label>
                      <input
                        id="hook-linux"
                        name="linux"
                        type="text"
                        className="form-input"
                        value={form.linux}
                        onChange={handleChange}
                        placeholder="./scripts/format-linux.sh"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="hook-osx">
                        macOS <span className="form-label-optional">(optional override)</span>
                      </label>
                      <input
                        id="hook-osx"
                        name="osx"
                        type="text"
                        className="form-input"
                        value={form.osx}
                        onChange={handleChange}
                        placeholder="./scripts/format-mac.sh"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="hook-cwd">
                        Working directory <span className="form-label-optional">(relative to repo root)</span>
                      </label>
                      <input
                        id="hook-cwd"
                        name="cwd"
                        type="text"
                        className="form-input"
                        value={form.cwd}
                        onChange={handleChange}
                        placeholder="scripts"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="hook-env">
                        Environment variables <span className="form-label-optional">(JSON object)</span>
                      </label>
                      <textarea
                        id="hook-env"
                        name="env"
                        className="form-input font-mono"
                        style={{ minHeight: '60px' }}
                        value={form.env}
                        onChange={handleChange}
                        placeholder='{"AUDIT_LOG": ".github/hooks/audit.log"}'
                      />
                    </div>
                  </>
                )}
                {isClaude && (
                  <div className="form-group form-group--inline">
                    <input
                      id="hook-async"
                      name="asyncMode"
                      type="checkbox"
                      checked={form.asyncMode}
                      onChange={handleChange}
                    />
                    <label htmlFor="hook-async">Run asynchronously (non-blocking)</label>
                  </div>
                )}
              </>
            )}

            {form.type === 'http' && !isVSCode && (
              <>
                <div className="form-group">
                  <label htmlFor="hook-url">URL</label>
                  <input
                    id="hook-url"
                    name="url"
                    type="text"
                    className="form-input"
                    value={form.url}
                    onChange={handleChange}
                    placeholder="http://localhost:8080/hooks/tool-use"
                    autoFocus={!isEdit}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="hook-headers">
                    Headers <span className="form-label-optional">(JSON object, optional)</span>
                  </label>
                  <input
                    id="hook-headers"
                    name="headers"
                    type="text"
                    className="form-input font-mono"
                    value={form.headers}
                    onChange={handleChange}
                    placeholder='{"Authorization": "Bearer xxx"}'
                  />
                </div>
              </>
            )}

            {(form.type === 'prompt' || form.type === 'agent') && !isVSCode && (
              <>
                <div className="form-group">
                  <label htmlFor="hook-prompt">Prompt</label>
                  <textarea
                    id="hook-prompt"
                    name="prompt"
                    className="form-input skill-editor-textarea"
                    style={{ minHeight: '80px' }}
                    value={form.prompt}
                    onChange={handleChange}
                    placeholder={
                      form.type === 'agent'
                        ? 'Verify all unit tests pass before stopping. $ARGUMENTS'
                        : 'Is this a safe operation? If not, respond with {"ok": false, "reason": "..."}.'
                    }
                    autoFocus={!isEdit}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="hook-model">
                    Model <span className="form-label-optional">(optional)</span>
                  </label>
                  <input
                    id="hook-model"
                    name="model"
                    type="text"
                    className="form-input"
                    value={form.model}
                    onChange={handleChange}
                    placeholder="claude-haiku-4-5"
                  />
                </div>
              </>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="hook-timeout">
                  Timeout (s) <span className="form-label-optional">(optional)</span>
                </label>
                <input
                  id="hook-timeout"
                  name="timeout"
                  type="number"
                  className="form-input"
                  value={form.timeout}
                  onChange={handleChange}
                  min={1}
                  placeholder={isVSCode ? '30' : '600'}
                />
              </div>
              {isClaude && !isVSCode && (
                <div className="form-group">
                  <label htmlFor="hook-status-msg">
                    Status message <span className="form-label-optional">(optional)</span>
                  </label>
                  <input
                    id="hook-status-msg"
                    name="statusMessage"
                    type="text"
                    className="form-input"
                    value={form.statusMessage}
                    onChange={handleChange}
                    placeholder="Running validation…"
                  />
                </div>
              )}
              {isCursor && !isVSCode && (
                <div className="form-group">
                  <label htmlFor="hook-loop-limit">
                    Loop limit <span className="form-label-optional">(optional, blank = unlimited)</span>
                  </label>
                  <input
                    id="hook-loop-limit"
                    name="loopLimit"
                    type="number"
                    className="form-input"
                    value={form.loopLimit}
                    onChange={handleChange}
                    min={0}
                    placeholder="5"
                  />
                </div>
              )}
            </div>

            {isCursor && !isVSCode && (
              <div className="form-group form-group--inline">
                <input
                  id="hook-fail-closed"
                  name="failClosed"
                  type="checkbox"
                  checked={form.failClosed}
                  onChange={handleChange}
                />
                <label htmlFor="hook-fail-closed">
                  Fail closed <span className="form-label-optional">(block action if hook errors)</span>
                </label>
              </div>
            )}
          </>
        )}

        {activeTab === 'raw' && (
          <>
            <div className="raw-editor-wrap">
              <CodeMirror
                value={rawJson}
                height="340px"
                theme={oneDark}
                extensions={extensions}
                onChange={setRawJson}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightActiveLine: true,
                  foldGutter: true,
                  bracketMatching: true,
                  highlightSelectionMatches: true,
                  indentOnInput: true,
                }}
              />
              {!rawValid && <p className="raw-error">Invalid JSON. Fix errors before saving.</p>}
            </div>
            <div className="skill-editor-actions">
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleValidate}
                disabled={validating || !rawValid}
              >
                {validating ? 'Validating…' : 'Validate'}
              </button>
            </div>
            {lintReport && (
              <div className="skill-editor-lint">
                <h4 className="skill-editor-lint-title">
                  {lintReport.errors === 0 && lintReport.warnings === 0 ? (
                    <span className="skill-lint-pass">✓ Passed validation</span>
                  ) : (
                    <span className="skill-lint-issues">
                      {lintReport.errors > 0 && (
                        <span className="skill-lint-error-count">
                          {lintReport.errors} error{lintReport.errors !== 1 ? 's' : ''}
                        </span>
                      )}
                      {lintReport.warnings > 0 && (
                        <span className="skill-lint-warning-count">
                          {lintReport.warnings} warning{lintReport.warnings !== 1 ? 's' : ''}
                        </span>
                      )}
                      {lintReport.infos > 0 && (
                        <span className="skill-lint-info-count">{lintReport.infos} info</span>
                      )}
                    </span>
                  )}
                </h4>
                {lintReport.findings.length > 0 && (
                  <ul className="skill-lint-findings">
                    {lintReport.findings.map((f, i) => (
                      <li key={i} className={`skill-lint-finding skill-lint-${f.level}`}>
                        <span className="skill-lint-level">{f.level}</span>
                        <span className="skill-lint-message">{f.message}</span>
                        {f.field && <span className="skill-lint-field">({f.field})</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={activeTab === 'raw' && !rawValid}
          >
            {isEdit ? 'Save' : 'Add Hook'}
          </button>
        </div>
      </form>
    </div>
  );
}

function typeLabel(type: HookItem['type']): string {
  switch (type) {
    case 'command':
      return 'command — run a shell command or script';
    case 'http':
      return 'http — POST event data to an HTTP endpoint';
    case 'prompt':
      return 'prompt — ask a Claude model to evaluate';
    case 'agent':
      return 'agent — spawn a Claude subagent with tool access';
  }
}
