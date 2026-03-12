/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { SyncSection } from './SyncSection';

describe('SyncSection', () => {
  it('renders sync targets', () => {
    const onSync = vi.fn();
    const onCustomSync = vi.fn();
    render(<SyncSection onSync={onSync} onCustomSync={onCustomSync} />);
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('VS Code')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
    expect(screen.getByText('OpenCode')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('calls onSync when target clicked', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const onSync = vi.fn();
    render(<SyncSection onSync={onSync} onCustomSync={vi.fn()} />);
    fireEvent.click(screen.getByText('Cursor'));
    expect(onSync).toHaveBeenCalledWith('cursor');
  });

  it('calls onCustomSync when Custom clicked', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const onCustomSync = vi.fn();
    render(<SyncSection onSync={vi.fn()} onCustomSync={onCustomSync} />);
    fireEvent.click(screen.getByText('Custom'));
    expect(onCustomSync).toHaveBeenCalled();
  });
});
