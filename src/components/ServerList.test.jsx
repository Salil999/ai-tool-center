/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { ServerList } from './ServerList';

describe('ServerList', () => {
  const defaultProps = {
    servers: [],
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggle: vi.fn(),
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
});
