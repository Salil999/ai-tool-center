/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncSection } from './SyncSection';

vi.mock('../../api-client', () => ({
  getSyncTargets: vi.fn().mockResolvedValue({
    builtin: [
      { id: 'cursor', name: 'Cursor', path: '~/.cursor/mcp.json' },
      { id: 'vscode', name: 'VS Code', path: '~/vscode/mcp.json' },
      { id: 'claude', name: 'Claude', path: '~/.claude.json' },
      { id: 'opencode', name: 'OpenCode', path: '~/.config/opencode/opencode.json' },
    ],
  }),
}));

describe('SyncSection', () => {
  it('renders sync targets when dropdown opened', async () => {
    const onSync = vi.fn();
    const onCursorSync = vi.fn();
    const onClaudeSync = vi.fn();
    const onOpenCodeSync = vi.fn();
    render(<SyncSection onSync={onSync} onCursorSync={onCursorSync} onClaudeSync={onClaudeSync} onOpenCodeSync={onOpenCodeSync} />);
    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    await waitFor(() => {
      expect(screen.getByText('Cursor')).toBeInTheDocument();
    });
    expect(screen.getByText('VS Code')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
    expect(screen.getByText('OpenCode')).toBeInTheDocument();
  });

  it('calls onCursorSync when Cursor clicked', async () => {
    const onCursorSync = vi.fn();
    render(<SyncSection onSync={vi.fn()} onCursorSync={onCursorSync} onClaudeSync={vi.fn()} onOpenCodeSync={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    await waitFor(() => expect(screen.getByText('Cursor')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cursor'));
    expect(onCursorSync).toHaveBeenCalled();
  });

  it('calls onClaudeSync when Claude clicked', async () => {
    const onClaudeSync = vi.fn();
    render(<SyncSection onSync={vi.fn()} onCursorSync={vi.fn()} onClaudeSync={onClaudeSync} onOpenCodeSync={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    await waitFor(() => expect(screen.getByText('Claude')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Claude'));
    expect(onClaudeSync).toHaveBeenCalled();
  });

  it('calls onOpenCodeSync when OpenCode clicked', async () => {
    const onOpenCodeSync = vi.fn();
    render(<SyncSection onSync={vi.fn()} onCursorSync={vi.fn()} onClaudeSync={vi.fn()} onOpenCodeSync={onOpenCodeSync} />);
    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    await waitFor(() => expect(screen.getByText('OpenCode')).toBeInTheDocument());
    fireEvent.click(screen.getByText('OpenCode'));
    expect(onOpenCodeSync).toHaveBeenCalled();
  });

  it('calls onSync when other target clicked', async () => {
    const onSync = vi.fn();
    render(<SyncSection onSync={onSync} onCursorSync={vi.fn()} onClaudeSync={vi.fn()} onOpenCodeSync={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    await waitFor(() => expect(screen.getByText('VS Code')).toBeInTheDocument());
    fireEvent.click(screen.getByText('VS Code'));
    expect(onSync).toHaveBeenCalledWith('vscode');
  });

});
