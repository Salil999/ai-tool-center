import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'active' | 'inactive' | 'default';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variant === 'active' && 'bg-green-500/15 text-green-400',
        variant === 'inactive' && 'bg-zinc-500/20 text-zinc-400',
        variant === 'default' && 'bg-zinc-700/50 text-zinc-300',
        className
      )}
    >
      {children}
    </span>
  );
}
