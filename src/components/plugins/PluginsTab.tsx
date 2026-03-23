export function PluginsTab({ onHelp, onSync }: { onHelp?: () => void; onSync?: () => void } = {}) {
  return (
    <>
      <div className="servers-section-header">
        <h2>Plugins</h2>
        <div className="header-actions">
          {onSync && <button type="button" className="btn" onClick={onSync}>Sync</button>}
          {onHelp && <button type="button" className="btn btn-sm" onClick={onHelp} aria-label="Open user guide">?</button>}
        </div>
      </div>

      <p className="tab-description">
        Installable extensions that add capabilities to your AI tools. Plugin management is coming soon.
      </p>
    </>
  );
}
