import { useState, useEffect, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { jsonParseLinter } from '@codemirror/lang-json';
import { linter } from '@codemirror/lint';
import { indentUnit } from '@codemirror/language';
import { indentWithTab } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap } from '@codemirror/view';
import { getServer } from '../api';

const DEFAULT_RAW = `{
  "name": "",
  "type": "stdio",
  "enabled": true,
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"],
  "env": {},
  "url": ""
}`;

interface FormState {
  name: string;
  type: string;
  enabled: boolean;
  command: string;
  args: string;
  env: string;
  url: string;
  bearerToken: string;
  headers: string;
}

function formToPayload(form: FormState) {
  let args: string[] = [];
  let env: Record<string, string> = {};
  let headers: Record<string, string> | undefined;
  try {
    if (form.args?.trim()) args = JSON.parse(form.args);
  } catch {
    /* ignore */
  }
  try {
    if (form.env?.trim()) env = JSON.parse(form.env);
  } catch {
    /* ignore */
  }
  if (form.bearerToken?.trim()) {
    headers = { Authorization: `Bearer ${form.bearerToken.trim()}` };
  } else if (form.headers?.trim()) {
    try {
      const parsed = JSON.parse(form.headers);
      headers = typeof parsed === 'object' && parsed !== null ? parsed : undefined;
    } catch {
      /* ignore */
    }
  }
  return {
    name: form.name,
    type: form.type,
    enabled: form.enabled,
    command: form.command || undefined,
    args,
    env,
    url: form.url || undefined,
    headers,
  };
}

function payloadToRaw(payload: Record<string, unknown>) {
  return JSON.stringify(payload, null, 2);
}

function rawToPayload(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name ?? '',
      type: parsed.type ?? 'stdio',
      enabled: parsed.enabled !== false,
      command: parsed.command ?? '',
      args: Array.isArray(parsed.args) ? parsed.args : [],
      env: parsed.env && typeof parsed.env === 'object' ? parsed.env : {},
      url: parsed.url ?? '',
      headers: parsed.headers && typeof parsed.headers === 'object' ? parsed.headers : undefined,
    };
  } catch {
    return null;
  }
}

interface EditModalProps {
  serverId: string | null;
  onClose: () => void;
  onSave: (id: string | null, payload: Record<string, unknown>) => Promise<void>;
}

export function EditModal({ serverId, onClose, onSave }: EditModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'raw'>('form');
  const [loading, setLoading] = useState(!!serverId);
  const [form, setForm] = useState<FormState>({
    name: '',
    type: 'stdio',
    enabled: true,
    command: '',
    args: '[]',
    env: '{}',
    url: '',
    bearerToken: '',
    headers: '{}',
  });
  const [rawJson, setRawJson] = useState(DEFAULT_RAW);

  const syncFormToRaw = useCallback(() => {
    const payload = formToPayload(form);
    setRawJson(payloadToRaw(payload));
  }, [form]);

  const syncRawToForm = useCallback(() => {
    const payload = rawToPayload(rawJson);
    if (payload) {
      const bearerToken = (payload.headers as Record<string, string>)?.Authorization?.startsWith('Bearer ')
        ? (payload.headers as Record<string, string>).Authorization.slice(7)
        : '';
      setForm({
        name: payload.name as string,
        type: payload.type as string,
        enabled: payload.enabled as boolean,
        command: (payload.command as string) || '',
        args: JSON.stringify(payload.args, null, 2),
        env: Object.keys((payload.env as Record<string, string>) || {}).length ? JSON.stringify(payload.env, null, 2) : '{}',
        url: (payload.url as string) || '',
        bearerToken,
        headers: bearerToken ? '{}' : (Object.keys((payload.headers as Record<string, string>) || {}).length ? JSON.stringify(payload.headers, null, 2) : '{}'),
      });
    }
  }, [rawJson]);

  useEffect(() => {
    if (serverId) {
      getServer(serverId)
        .then((s) => {
          const bearerToken = (s.headers as Record<string, string>)?.Authorization?.startsWith('Bearer ')
            ? (s.headers as Record<string, string>).Authorization.slice(7)
            : '';
          const f: FormState = {
            name: (s.name as string) || '',
            type: (s.type as string) || 'stdio',
            enabled: s.enabled !== false,
            command: (s.command as string) || '',
            args: JSON.stringify((s.args as string[]) || [], null, 2),
            env: Object.keys((s.env as Record<string, string>) || {}).length ? JSON.stringify(s.env, null, 2) : '{}',
            url: (s.url as string) || '',
            bearerToken,
            headers: bearerToken ? '{}' : (Object.keys((s.headers as Record<string, string>) || {}).length ? JSON.stringify(s.headers, null, 2) : '{}'),
          };
          setForm(f);
          setRawJson(payloadToRaw(formToPayload(f)));
        })
        .finally(() => setLoading(false));
    } else {
      setForm({
        name: '',
        type: 'stdio',
        enabled: true,
        command: '',
        args: '[]',
        env: '{}',
        url: '',
        bearerToken: '',
        headers: '{}',
      });
      setRawJson(DEFAULT_RAW);
      setLoading(false);
    }
  }, [serverId]);

  const handleTabChange = (tab: 'form' | 'raw') => {
    if (tab === 'raw') {
      syncFormToRaw();
    } else {
      syncRawToForm();
    }
    setActiveTab(tab);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = activeTab === 'raw'
      ? rawToPayload(rawJson)
      : formToPayload(form);

    if (!payload) {
      return;
    }

    await onSave(serverId, payload);
    onClose();
  };

  const showStdio = form.type === 'stdio';
  const showHttp = form.type === 'http' || form.type === 'sse';
  const rawValid = rawToPayload(rawJson) !== null;

  if (loading) return null;

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
        <h2>{serverId ? 'Edit Server' : 'Add Server'}</h2>
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
              <label htmlFor="server-name">Name</label>
              <input
                type="text"
                id="server-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="e.g. memory"
              />
            </div>
            <div className="form-group">
              <label htmlFor="server-type">Type</label>
              <select
                id="server-type"
                name="type"
                value={form.type}
                onChange={handleChange}
              >
                <option value="stdio">stdio</option>
                <option value="http">http</option>
                <option value="sse">sse</option>
              </select>
            </div>
            <div className={`form-group-group ${!showStdio ? 'hidden' : ''}`}>
              <div className="form-group">
                <label htmlFor="server-command">Command</label>
                <input
                  type="text"
                  id="server-command"
                  name="command"
                  value={form.command}
                  onChange={handleChange}
                  placeholder="e.g. npx"
                />
              </div>
              <div className="form-group">
                <label htmlFor="server-args">Args (JSON array)</label>
                <input
                  type="text"
                  id="server-args"
                  name="args"
                  value={form.args}
                  onChange={handleChange}
                  placeholder='["-y", "@modelcontextprotocol/server-memory"]'
                  className="font-mono"
                />
              </div>
              <div className="form-group">
                <label htmlFor="server-env">Env (JSON object)</label>
                <input
                  type="text"
                  id="server-env"
                  name="env"
                  value={form.env}
                  onChange={handleChange}
                  placeholder='{"API_KEY": "..."}'
                  className="font-mono"
                />
              </div>
            </div>
            <div className={`form-group-group ${!showHttp ? 'hidden' : ''}`}>
              <div className="form-group">
                <label htmlFor="server-url">URL</label>
                <input
                  type="url"
                  id="server-url"
                  name="url"
                  value={form.url}
                  onChange={handleChange}
                  placeholder="https://mcp.example.com/mcp"
                />
              </div>
              <div className="form-group">
                <label htmlFor="server-bearer-token">Bearer token (API key / OAuth token)</label>
                <input
                  type="password"
                  id="server-bearer-token"
                  name="bearerToken"
                  value={form.bearerToken}
                  onChange={handleChange}
                  placeholder="For OAuth servers like Cloudflare: create API token at dash.cloudflare.com"
                  autoComplete="off"
                />
                <small className="form-hint">
                  Cloudflare: Create token at Profile → API Tokens. Stored in config; sync includes it.
                </small>
              </div>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="enabled"
                  checked={form.enabled}
                  onChange={handleChange}
                />
                Enabled
              </label>
            </div>
          </>
        )}
        {activeTab === 'raw' && (
          <div className="raw-editor-wrap">
            <CodeMirror
              value={rawJson}
              height="280px"
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
            {!rawValid && (
              <p className="raw-error">Invalid JSON. Fix errors before saving.</p>
            )}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={activeTab === 'raw' && !rawValid}
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
