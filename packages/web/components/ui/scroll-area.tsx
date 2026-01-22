import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ScrollArea({ className, children }: { className?: string; children: ReactNode }) {
  // Minimal replacement for the old Radix ScrollArea.
  // Styling matches expected layout; native scrollbars apply.
  return (
    <div className={cn('relative overflow-auto', className)}>{children}</div>
  );
}
