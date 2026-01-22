import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export function Sheet({ children }: SheetProps) {
  return <>{children}</>;
}

interface SheetTriggerProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SheetTrigger({ children, className, onClick }: SheetTriggerProps) {
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}

interface SheetCloseProps {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SheetClose({ children, className, onClick }: SheetCloseProps) {
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}

interface SheetContentProps {
  children: ReactNode;
  className?: string;
  side?: 'right' | 'left' | 'top' | 'bottom';
  open?: boolean;
  onClose?: () => void;
}

export function SheetContent({
  children,
  className,
  side = 'right',
  open,
  onClose,
}: SheetContentProps) {
  useEffect(() => {
    if (typeof document === 'undefined' || !open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50 animate-in fade-in-0"
      onClick={handleOverlayClick}
    >
      <div
        className={cn(
          'bg-background fixed z-50 flex flex-col shadow-lg',
          'animate-in',
          side === 'right' &&
            'slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-md',
          side === 'left' &&
            'slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-md',
          side === 'top' && 'slide-in-from-top inset-x-0 top-0 h-auto border-b',
          side === 'bottom' &&
            'slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <button
          type="button"
          className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none"
          onClick={() => onClose?.()}
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>,
    document.body
  );
}

interface SheetHeaderProps {
  children: ReactNode;
  className?: string;
}

export function SheetHeader({ children, className }: SheetHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 p-4', className)}>{children}</div>
  );
}

interface SheetFooterProps {
  children: ReactNode;
  className?: string;
}

export function SheetFooter({ children, className }: SheetFooterProps) {
  return (
    <div className={cn('mt-auto flex flex-col gap-2 p-4', className)}>
      {children}
    </div>
  );
}

interface SheetTitleProps {
  children: ReactNode;
  className?: string;
}

export function SheetTitle({ children, className }: SheetTitleProps) {
  return (
    <h2 className={cn('text-foreground font-semibold', className)}>{children}</h2>
  );
}

interface SheetDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function SheetDescription({ children, className }: SheetDescriptionProps) {
  return (
    <p className={cn('text-muted-foreground text-sm', className)}>{children}</p>
  );
}
