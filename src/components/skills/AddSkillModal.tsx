import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { createSkill, lintContent, searchSkillhubRegistry, installSkillFromRegistry, type SkillhubSkill } from '../../api-client';
import { useToast } from '@/contexts/ToastContext';

/** Extract markdown body after YAML frontmatter (--- ... ---) */
function getMarkdownBody(content: string): string {
  const match = content.match(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n([\s\S]*)$/);
  return match ? match[1].trim() : content;
}

function renderMarkdown(md: string): string {
  try {
    return marked.parse(md, { async: false });
  } catch {
    return `<p class="skill-preview-error">Failed to render markdown preview.</p>`;
  }
}
import type { LintReport } from '../../types';

const DEFAULT_SKILL_TEMPLATE = `---
name: my-skill
description: Add a description of what this skill does and when to use it.
---

`;

type AddSkillTab = 'create' | 'search';

interface AddSkillModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export function AddSkillModal({ onClose, onSaved }: AddSkillModalProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AddSkillTab>('create');
  const [content, setContent] = useState(DEFAULT_SKILL_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lintReport, setLintReport] = useState<LintReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [registryQuery, setRegistryQuery] = useState('');
  const [registryResults, setRegistryResults] = useState<SkillhubSkill[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryInstalling, setRegistryInstalling] = useState<string | null>(null);

  const searchRegistry = useCallback(async (q: string) => {
    if (!q.trim()) {
      setRegistryResults([]);
      return;
    }
    setRegistryLoading(true);
    setError(null);
    try {
      const { skills } = await searchSkillhubRegistry(q.trim(), 30);
      const sorted = [...skills].sort((a, b) => (b.github_stars ?? 0) - (a.github_stars ?? 0));
      setRegistryResults(sorted);
    } catch (err) {
      setRegistryResults([]);
      setError((err as Error).message);
    } finally {
      setRegistryLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchRegistry(registryQuery), 300);
    return () => clearTimeout(t);
  }, [registryQuery, searchRegistry]);

  const handleRegistryInstall = async (skill: SkillhubSkill) => {
    const repoUrl = skill.repo_url;
    if (!repoUrl) {
      setError('No repo URL for this skill');
      return;
    }
    setRegistryInstalling(skill.slug);
    setError(null);
    try {
      await installSkillFromRegistry(skill.slug, repoUrl);
      showToast('Skill added');
      onSaved();
      onClose();
    } catch (err) {
      setRegistryInstalling(null);
      setError((err as Error).message);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    setError(null);
    try {
      const report = await lintContent(content);
      setLintReport(report);
    } catch (err) {
      setError((err as Error).message);
      setLintReport(null);
    } finally {
      setValidating(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createSkill({ content });
      showToast('Skill added');
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal edit-modal add-skill-modal">
      <div className="modal-header">
        <h2 id="add-skill-modal-title">Add Skill</h2>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="modal-tabs">
        <button
          type="button"
          className={`modal-tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create
        </button>
        <button
          type="button"
          className={`modal-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Search Registry
        </button>
      </div>
      {activeTab === 'create' ? (
        <form className="modal-body" onSubmit={handleAdd}>
          <p className="skill-editor-desc">
            Create a new skill. See the{' '}
            <a
              href="https://agentskills.io/specification"
              target="_blank"
              rel="noopener noreferrer"
            >
              Agent Skills specification
            </a>{' '}
            for format details.
          </p>
          <div className="raw-editor-wrap skill-editor-wrap">
            {showPreview ? (
              <div
                className="skill-editor-preview"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(getMarkdownBody(content)),
                }}
              />
            ) : (
              <textarea
                className="skill-editor-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
                placeholder="YAML frontmatter (name, description) followed by markdown body"
              />
            )}
          </div>
          <div className="skill-editor-actions">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Raw' : 'Preview'}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleValidate}
              disabled={validating}
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

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      ) : (
        <div className="modal-body">
          <p className="skill-editor-desc">
            Search the Skillhub registry for skills to install. Results are sorted by GitHub stars.
          </p>
          <input
            type="text"
            className="import-search"
            placeholder="Search 9,500+ skills…"
            value={registryQuery}
            onChange={(e) => setRegistryQuery(e.target.value)}
            aria-label="Search Skillhub registry"
          />
          {registryLoading && <p className="import-loading">Searching…</p>}
          {!registryLoading && registryQuery.trim() && registryResults.length === 0 && (
            <p className="import-empty">No skills found. Try a different search.</p>
          )}
          {!registryLoading && registryResults.length > 0 && (
            <div className="import-registry-results">
              {registryResults.map((s) => (
                <div key={s.id} className="import-source-row">
                  <div className="import-source-info">
                    <span className="import-source-name">{s.name}</span>
                    <span className="import-source-meta">
                      {s.author}
                      {s.github_stars != null && ` · ${s.github_stars.toLocaleString()} stars`}
                    </span>
                    {s.description && (
                      <span className="import-source-desc" title={s.description}>
                        {s.description.length > 150 ? `${s.description.slice(0, 150)}…` : s.description}
                      </span>
                    )}
                    {s.repo_url && (
                      <a
                        href={s.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="import-source-repo"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.repo_url.replace(/^https?:\/\//, '').split('#')[0]}
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={registryInstalling !== null}
                    onClick={() => handleRegistryInstall(s)}
                  >
                    {registryInstalling === s.slug ? 'Installing…' : 'Install'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
