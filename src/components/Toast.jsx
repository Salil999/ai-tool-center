import { useEffect } from 'react';

export function Toast({ message, type = 'success', onDismiss }) {
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
