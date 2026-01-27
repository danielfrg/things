import { useCallback, useEffect, useState } from 'react';

const TRANSITION_DURATION_MS = 250;

interface UseDetailCardOptions {
  id: string;
  expanded: boolean;
  onExpand: (id: string) => void;
  cardRef: React.RefObject<HTMLDivElement | null>;
  dataAttribute?: string;
}

interface UseDetailCardReturn {
  isClosing: boolean;
  showInfo: boolean;
  setShowInfo: (show: boolean) => void;
  handleClose: () => void;
}

/**
 * Shared hook for detail card state management.
 * Handles:
 * - Click outside detection
 * - Close animation state
 * - Info popover state
 */
export function useDetailCard({
  id,
  expanded,
  onExpand,
  cardRef,
  dataAttribute = 'data-detail-card',
}: UseDetailCardOptions): UseDetailCardReturn {
  const [showInfo, setShowInfo] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (isClosing) return;

    setIsClosing(true);
    onExpand(id);

    setTimeout(() => {
      setIsClosing(false);
    }, TRANSITION_DURATION_MS);
  }, [isClosing, onExpand, id]);

  // Click outside handler
  useEffect(() => {
    if (!expanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (isClosing) return;
      if (!cardRef.current) return;

      const target = e.target as HTMLElement;

      if (cardRef.current.contains(target)) return;

      // Ignore clicks in popovers (including Base UI popovers which use data-side attribute)
      const isInPopover =
        target.closest('[data-popover]') ||
        target.closest('[data-slot="popover"]') ||
        target.closest('[data-slot="popover-content"]') ||
        target.closest('[data-side]') ||
        target.closest('[data-ignore-click-outside]') ||
        target.closest('[role="listbox"]') ||
        target.closest('[role="dialog"]') ||
        target.closest('[role="menu"]');
      if (isInPopover) return;

      // Ignore clicks in dark popovers (check background color of any ancestor)
      let element: HTMLElement | null = target;
      while (element) {
        const bg = getComputedStyle(element).backgroundColor;
        if (bg === 'rgb(44, 44, 46)') return;
        element = element.parentElement;
      }

      // Ignore clicks on other expanded cards
      const anyExpandedCard = target.closest(`[${dataAttribute}]`);
      if (anyExpandedCard) return;

      e.preventDefault();
      e.stopPropagation();
      handleClose();
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [expanded, isClosing, handleClose, cardRef, dataAttribute]);

  // Reset showInfo when collapsed
  useEffect(() => {
    if (!expanded) {
      setShowInfo(false);
    }
  }, [expanded]);

  return {
    isClosing,
    showInfo,
    setShowInfo,
    handleClose,
  };
}
