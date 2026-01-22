import type { ReactNode, RefObject } from 'react';
import { cn } from '@/lib/utils';

interface ItemDetailLayoutProps {
  expanded: boolean;
  header: ReactNode;
  children: ReactNode;
  toolbar: ReactNode;
  toolbarPrefix?: ReactNode;
  footer: ReactNode;
  beforeCard?: ReactNode;
  afterCard?: ReactNode;
  cardRef: RefObject<HTMLDivElement | null>;
  outerRef?: RefObject<HTMLDivElement | null>;
  dataAttribute?: string;
  outerClassName?: string;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

export function ItemDetailLayout({
  expanded,
  header,
  children,
  toolbar,
  toolbarPrefix,
  footer,
  beforeCard,
  afterCard,
  cardRef,
  outerRef,
  dataAttribute = 'data-detail-card',
  outerClassName,
  onDoubleClick,
}: ItemDetailLayoutProps) {
  const dataAttr = { [dataAttribute]: true };

  return (
    <div
      ref={outerRef}
      className={cn(
        'mx-0 md:mx-4 transition-all duration-300 ease-in-out',
        expanded && 'my-3',
        outerClassName,
      )}
    >
      {beforeCard}
      <div
        ref={cardRef}
        {...dataAttr}
        className={cn(
          'md:rounded-xl bg-background transition-all duration-300 ease-in-out select-none',
          expanded
            ? 'border-y md:border border-border shadow-sm'
            : 'border border-transparent',
        )}
        onDoubleClick={onDoubleClick}
      >
        {header}

        {/* Expandable drawer content */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className="px-4 pb-4 pl-[38px] space-y-3">
            {children}

            {/* Footer - toolbar */}
            <div
              className={cn('pt-2', toolbarPrefix ? 'flex flex-col gap-2' : '')}
            >
              {toolbarPrefix}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 flex-wrap">
                  {toolbar}
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {footer}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {afterCard}
    </div>
  );
}
