/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders message', () => {
    render(<Toast message="Success!" onDismiss={vi.fn()} />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('has role alert', () => {
    render(<Toast message="Test" onDismiss={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls onDismiss after timeout', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Test" onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(onDismiss).toHaveBeenCalled();
  });
});
