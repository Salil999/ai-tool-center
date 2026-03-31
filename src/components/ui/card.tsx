import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg p-5 transition-colors duration-150',
        onClick && 'cursor-pointer',
        className
      )}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-3 flex items-center gap-3', className)}>{children}</div>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('space-y-1.5', className)}>{children}</div>;
}
