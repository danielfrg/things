import { useCallback, useLayoutEffect, useState } from 'react';

type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'start' | 'center' | 'end';

interface Position {
  position?: 'fixed' | 'absolute';
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  transform?: string;
  zIndex?: number;
}

interface UseAnchoredPositionOptions {
  anchorRect: DOMRect | null;
  side?: Side;
  align?: Align;
  offset?: number;
  /** Estimated height of popover for flip calculation */
  popoverHeight?: number;
  /** Estimated width of popover for flip calculation */
  popoverWidth?: number;
}

/**
 * Hook for calculating anchored popover position.
 * Handles positioning relative to an anchor element with automatic flip
 * when there's not enough space.
 */
export function useAnchoredPosition({
  anchorRect,
  side = 'bottom',
  align = 'start',
  offset = 4,
  popoverHeight = 300,
  popoverWidth = 260,
}: UseAnchoredPositionOptions): React.CSSProperties {
  const [style, setStyle] = useState<React.CSSProperties>({});

  const calculate = useCallback(() => {
    if (!anchorRect) return {};

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;
    const spaceRight = viewportWidth - anchorRect.right;
    const spaceLeft = anchorRect.left;

    let actualSide = side;

    // Flip if not enough space
    if (
      side === 'bottom' &&
      spaceBelow < popoverHeight &&
      spaceAbove > spaceBelow
    ) {
      actualSide = 'top';
    } else if (
      side === 'top' &&
      spaceAbove < popoverHeight &&
      spaceBelow > spaceAbove
    ) {
      actualSide = 'bottom';
    } else if (
      side === 'right' &&
      spaceRight < popoverWidth &&
      spaceLeft > spaceRight
    ) {
      actualSide = 'left';
    } else if (
      side === 'left' &&
      spaceLeft < popoverWidth &&
      spaceRight > spaceLeft
    ) {
      actualSide = 'right';
    }

    const position: Position = {
      position: 'fixed' as const,
    };

    // Calculate position based on side
    if (actualSide === 'bottom') {
      position.top = anchorRect.bottom + offset;
    } else if (actualSide === 'top') {
      position.bottom = viewportHeight - anchorRect.top + offset;
    } else if (actualSide === 'right') {
      position.left = anchorRect.right + offset;
    } else {
      position.right = viewportWidth - anchorRect.left + offset;
    }

    // Calculate alignment
    if (actualSide === 'bottom' || actualSide === 'top') {
      if (align === 'start') {
        position.left = anchorRect.left;
      } else if (align === 'end') {
        position.left = anchorRect.right;
        position.transform = 'translateX(-100%)';
      } else {
        position.left = anchorRect.left + anchorRect.width / 2;
        position.transform = 'translateX(-50%)';
      }
    } else {
      if (align === 'start') {
        position.top = anchorRect.top;
      } else if (align === 'end') {
        position.top = anchorRect.bottom;
        position.transform = 'translateY(-100%)';
      } else {
        position.top = anchorRect.top + anchorRect.height / 2;
        position.transform = 'translateY(-50%)';
      }
    }

    return {
      position: 'fixed',
      zIndex: 50,
      ...position,
    } as React.CSSProperties;
  }, [anchorRect, side, align, offset, popoverHeight, popoverWidth]);

  useLayoutEffect(() => {
    setStyle(calculate());
  }, [calculate]);

  return style;
}

/**
 * Simple function to get position styles from an anchor rect.
 * Use this for simpler cases where you don't need reactivity.
 */
export function getAnchoredPosition(
  anchorRect: DOMRect | null,
  options: Omit<UseAnchoredPositionOptions, 'anchorRect'> = {},
): React.CSSProperties {
  if (!anchorRect) return {};

  const {
    side = 'bottom',
    align = 'start',
    offset = 4,
    popoverHeight = 300,
  } = options;

  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;

  let actualSide = side;
  if (
    side === 'bottom' &&
    spaceBelow < popoverHeight &&
    spaceAbove > spaceBelow
  ) {
    actualSide = 'top';
  } else if (
    side === 'top' &&
    spaceAbove < popoverHeight &&
    spaceBelow > spaceAbove
  ) {
    actualSide = 'bottom';
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 50,
  };

  if (actualSide === 'bottom') {
    style.top = anchorRect.bottom + offset;
  } else {
    style.bottom = viewportHeight - anchorRect.top + offset;
  }

  if (align === 'start') {
    style.left = anchorRect.left;
  } else if (align === 'end') {
    style.left = anchorRect.right;
    style.transform = 'translateX(-100%)';
  } else {
    style.left = anchorRect.left + anchorRect.width / 2;
    style.transform = 'translateX(-50%)';
  }

  return style;
}
