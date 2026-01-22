import { type RefObject, useEffect, useRef } from 'react';

interface UseOverlayOptions {
  open: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  /** Refs to elements that should not trigger outside click (e.g., trigger button) */
  ignoreRefs?: RefObject<HTMLElement | null>[];
}

/**
 * Hook for handling common overlay behaviors:
 * - Close on Escape key
 * - Close on click outside
 */
export function useOverlay({
  open,
  onClose,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  ignoreRefs = [],
}: UseOverlayOptions): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (!closeOnOutsideClick) return;

      const target = e.target as Node;

      // Check if click is inside the overlay
      if (ref.current?.contains(target)) return;

      // Check if click is inside any ignored refs (e.g., trigger button)
      for (const ignoreRef of ignoreRefs) {
        if (ignoreRef.current?.contains(target)) return;
      }

      onClose();
    };

    // Delay adding listeners to avoid triggering on the same click that opened
    const timeout = setTimeout(() => {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose, closeOnEscape, closeOnOutsideClick, ignoreRefs]);

  return ref;
}
