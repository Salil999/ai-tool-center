/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { ServerCard } from './ServerCard';

vi.mock('../api', () => ({
  getServerTools: vi.fn().mockResolvedValue({ tools: [{ name: 'tool1' }, { name: 'tool2' }] }),
}));

describe('ServerCard', () => {
  const defaultServer = {
    id: 'test-server',
    name: 'Test Server',
    type: 'stdio' as const,
    command: 'npx',
    enabled: true,
  };

  const defaultProps = {
    server: defaultServer,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders server name and meta', () => {
    render(<ServerCard {...defaultProps} />);
    expect(screen.getByText('Test Server')).toBeInTheDocument();
    expect(screen.getByText(/stdio/)).toBeInTheDocument();
    expect(screen.getByText(/npx/)).toBeInTheDocument();
  });

  it('shows Enabled status when enabled', () => {
    render(<ServerCard {...defaultProps} />);
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('shows Disabled status when disabled', () => {
    render(<ServerCard {...defaultProps} server={{ ...defaultServer, enabled: false }} />);
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('calls onEdit when Edit clicked', () => {
    render(<ServerCard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(defaultProps.onEdit).toHaveBeenCalledWith('test-server');
  });

  it('calls onToggle when Enable/Disable clicked', () => {
    render(<ServerCard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /disable/i }));
    expect(defaultProps.onToggle).toHaveBeenCalledWith('test-server', false);
  });

  it('expands and fetches tools when clicked', async () => {
    render(<ServerCard {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(await screen.findByText('tool1')).toBeInTheDocument();
    expect(screen.getByText('tool2')).toBeInTheDocument();
  });
});
