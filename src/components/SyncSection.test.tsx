/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { SyncSection } from './SyncSection';

describe('SyncSection', () => {
  it('renders sync targets when dropdown opened', () => {
    const onSync = vi.fn();
    const onCustomSync = vi.fn();
    render(<SyncSection onSync={onSync} onCustomSync={onCustomSync} />);
    fireEvent.click(screen.getByRole('button', { name: /write/i }));
    expect(screen.getByText('Cursor')).toBeInTheDocument();
    expect(screen.getByText('VS Code')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
    expect(screen.getByText('OpenCode')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('calls onSync when target clicked', () => {
    const onSync = vi.fn();
    render(<SyncSection onSync={onSync} onCustomSync={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /write/i }));
    fireEvent.click(screen.getByText('Cursor'));
    expect(onSync).toHaveBeenCalledWith('cursor');
  });

  it('calls onCustomSync when Custom clicked', () => {
    const onCustomSync = vi.fn();
    render(<SyncSection onSync={vi.fn()} onCustomSync={onCustomSync} />);
    fireEvent.click(screen.getByRole('button', { name: /write/i }));
    fireEvent.click(screen.getByText('Custom'));
    expect(onCustomSync).toHaveBeenCalled();
  });
});
