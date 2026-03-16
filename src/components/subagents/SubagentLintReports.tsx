import type { SubagentLintReport } from '../../types';
import type { SubagentLintReports as LintReportsMap, SubagentProviderInfo } from '../../api-client/subagents';

/** Default display names when provider list hasn't loaded yet. */
const FALLBACK_NAMES: Record<string, string> = {
  claude: 'Claude Code',
  cursor: 'Cursor',
  opencode: 'OpenCode',
  vscode: 'VS Code',
};

function displayName(providerId: string, providers?: SubagentProviderInfo[]): string {
  const found = providers?.find((p) => p.id === providerId);
  return found?.name ?? FALLBACK_NAMES[providerId] ?? providerId;
}

function renderReport(label: string, report: SubagentLintReport) {
  return (
    <div className="subagent-lint-provider" key={label}>
      <h4 className="subagent-lint-provider-name">{label}</h4>
      <div className="skill-lint-summary">
        {report.errors === 0 && report.warnings === 0 ? (
          <span className="skill-lint-pass">✓ Valid</span>
        ) : (
          <span className="skill-lint-issues">
            {report.errors > 0 && (
              <span className="skill-lint-error-count">
                {report.errors} error{report.errors !== 1 ? 's' : ''}
              </span>
            )}
            {report.warnings > 0 && (
              <span className="skill-lint-warning-count">
                {report.warnings} warning{report.warnings !== 1 ? 's' : ''}
              </span>
            )}
          </span>
        )}
      </div>
      {report.findings.length > 0 && (
        <ul className="skill-lint-findings">
          {report.findings.map((f, i) => (
            <li key={i} className={`skill-lint-finding skill-lint-${f.level}`}>
              <span className="skill-lint-level">{f.level}</span>
              <span className="skill-lint-message">{f.message}</span>
              {f.field && <span className="skill-lint-field">({f.field})</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface SubagentLintReportsViewProps {
  reports: LintReportsMap;
  providers?: SubagentProviderInfo[];
}

export function SubagentLintReportsView({ reports, providers }: SubagentLintReportsViewProps) {
  return (
    <div className="subagent-lint-reports">
      {Object.entries(reports).map(([id, report]) =>
        renderReport(displayName(id, providers), report)
      )}
    </div>
  );
}
