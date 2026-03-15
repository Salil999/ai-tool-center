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
    custom: [],
  }),
}));

describe('SyncSection', () => {
  it('renders sync targets when dropdown opened', async () => {
    const onSync = vi.fn();
    const onCursorSync = vi.fn();
    const onClaudeSync = vi.fn();
    const onCustomSync = vi.fn();
    render(<SyncSection onSync={onSync} onCursorSync={onCursorSync} onClaudeSync={onClaudeSync} onCustomSync={onCustomSync} />);
    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    await waitFor(() => {
      expect(screen.getByText('Cursor')).toBeInTheDocument();
    });
    expect(screen.getByText('VS Code')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
    expect(screen.getByText('OpenCode')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('calls onCursorSync when Cursor clicked', async () => {
    const onCursorSync = vi.fn();
    render(<SyncSection onSync={vi.fn()} onCursorSync={onCursorSync} onClaudeSync={vi.fn()} onCustomSync={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    await waitFor(() => expect(screen.getByText('Cursor')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cursor'));
    expect(onCursorSync).toHaveBeenCalled();
  });

  it('calls onClaudeSync when Claude clicked', async () => {
    const onClaudeSync = vi.fn();
    render(<SyncSection onSync={vi.fn()} onCursorSync={vi.fn()} onClaudeSync={onClaudeSync} onCustomSync={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    await waitFor(() => expect(screen.getByText('Claude')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Claude'));
    expect(onClaudeSync).toHaveBeenCalled();
  });

  it('calls onSync when other target clicked', async () => {
    const onSync = vi.fn();
    render(<SyncSection onSync={onSync} onCursorSync={vi.fn()} onClaudeSync={vi.fn()} onCustomSync={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    await waitFor(() => expect(screen.getByText('VS Code')).toBeInTheDocument());
    fireEvent.click(screen.getByText('VS Code'));
    expect(onSync).toHaveBeenCalledWith('vscode');
  });

  it('calls onCustomSync when Custom clicked', async () => {
    const onCustomSync = vi.fn();
    render(<SyncSection onSync={vi.fn()} onCursorSync={vi.fn()} onClaudeSync={vi.fn()} onCustomSync={onCustomSync} />);
    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    await waitFor(() => expect(screen.getByText('Custom')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Custom'));
    expect(onCustomSync).toHaveBeenCalled();
  });
});
