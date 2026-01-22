import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export function DropdownMenu({ children }: { children: ReactNode }) {
  return <div className="relative">{children}</div>;
}

export function DropdownMenuTrigger({
  children,
}: {
  asChild?: boolean;
  children: ReactNode;
  onToggle?: (open: boolean) => void;
}) {
  // This component is kept for API compatibility in Sidebar.
  return <>{children}</>;
}

interface DropdownMenuContentProps {
  align?: 'start' | 'end' | 'center';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  className?: string;
  open: boolean;
  anchorRect: DOMRect | null;
  onClose: () => void;
  children: ReactNode;
}

export function DropdownMenuContent({
  align,
  side = 'bottom',
  sideOffset = 4,
  className,
  open,
  anchorRect,
  onClose,
  children,
}: DropdownMenuContentProps) {
  const getStyle = (): React.CSSProperties | undefined => {
    if (!anchorRect) return undefined;

    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 50,
    };

    if (side === 'top') {
      base.top = anchorRect.top - sideOffset;
      base.left = anchorRect.left;
      base.transform = 'translateY(-100%)';
    } else if (side === 'bottom') {
      base.top = anchorRect.bottom + sideOffset;
      base.left = anchorRect.left;
    } else if (side === 'left') {
      base.top = anchorRect.top;
      base.left = anchorRect.left - sideOffset;
      base.transform = 'translateX(-100%)';
    } else {
      base.top = anchorRect.top;
      base.left = anchorRect.right + sideOffset;
    }

    if (align === 'end') {
      base.transform = `${base.transform ?? ''} translateX(calc(-100% + ${anchorRect.width}px))`.trim();
    }

    return base;
  };

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40"
        onMouseDown={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className={cn(
          'bg-popover text-popover-foreground z-50 max-h-[var(--dropdown-available-height,400px)] min-w-[8rem] overflow-auto rounded-md border p-1 shadow-md',
          className,
        )}
        style={getStyle()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

export function DropdownMenuItem({
  onClick,
  className,
  children,
}: {
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none transition-colors whitespace-nowrap',
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

export function useDropdownController() {
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const close = () => setOpen(false);

  const toggleFromEvent = (e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement | null;
    setAnchorRect(el?.getBoundingClientRect?.() ?? null);
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return {
    open,
    anchorRect,
    setOpen,
    setAnchorRect,
    close,
    toggleFromEvent,
  };
}

// Alias for backwards compatibility
export const createDropdownController = useDropdownController;
