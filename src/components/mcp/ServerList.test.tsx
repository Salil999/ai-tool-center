/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { ServerList } from './ServerList';

describe('ServerList', () => {
  const defaultProps = {
    servers: [] as { id: string; name: string; type: string; command?: string; url?: string; enabled: boolean }[],
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggle: vi.fn(),
    onReorder: vi.fn(),
  };

  it('shows empty state when no servers', () => {
    render(<ServerList {...defaultProps} />);
    expect(screen.getByText(/No MCP servers configured/)).toBeInTheDocument();
  });

  it('renders server cards when servers provided', () => {
    const servers = [
      { id: 'a', name: 'Server A', type: 'stdio', command: 'node', enabled: true },
      { id: 'b', name: 'Server B', type: 'http', url: 'https://x.com', enabled: true },
    ];
    render(<ServerList {...defaultProps} servers={servers} />);
    expect(screen.getByText('Server A')).toBeInTheDocument();
    expect(screen.getByText('Server B')).toBeInTheDocument();
  });

  it('calls onReorder when move down clicked', () => {
    const servers = [
      { id: 'a', name: 'Server A', type: 'stdio', command: 'node', enabled: true },
      { id: 'b', name: 'Server B', type: 'stdio', command: 'node', enabled: true },
    ];
    render(<ServerList {...defaultProps} servers={servers} />);
    const moveDownButtons = screen.getAllByRole('button', { name: /move down/i });
    fireEvent.click(moveDownButtons[0]);
    expect(defaultProps.onReorder).toHaveBeenCalledWith(['b', 'a']);
  });

  it('calls onReorder when move up clicked', () => {
    const servers = [
      { id: 'a', name: 'Server A', type: 'stdio', command: 'node', enabled: true },
      { id: 'b', name: 'Server B', type: 'stdio', command: 'node', enabled: true },
    ];
    render(<ServerList {...defaultProps} servers={servers} />);
    const moveUpButtons = screen.getAllByRole('button', { name: /move up/i });
    fireEvent.click(moveUpButtons[0]);
    expect(defaultProps.onReorder).toHaveBeenCalledWith(['b', 'a']);
  });

  it('calls onDelete when Delete clicked on a card', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const servers = [{ id: 'a', name: 'Server A', type: 'stdio', command: 'node', enabled: true }];
    render(<ServerList {...defaultProps} servers={servers} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(defaultProps.onDelete).toHaveBeenCalledWith('a');
    vi.restoreAllMocks();
  });
});
