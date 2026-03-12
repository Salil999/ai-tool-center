import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: string;
  onDismiss: () => void;
}

export function Toast({ message, type = 'success', onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`toast ${type}`} role="alert">
      {message}
    </div>
  );
}
