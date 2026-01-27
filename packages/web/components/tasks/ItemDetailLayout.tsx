import type { ReactNode, RefObject } from 'react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
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
    <Collapsible open={expanded}>
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
            'md:rounded-xl bg-background transition-all duration-300 ease-in-out',
            expanded
              ? 'border-y md:border border-border shadow-sm'
              : 'border border-transparent select-none',
          )}
          onDoubleClick={onDoubleClick}
        >
          {header}

          {/* Expandable drawer content */}
          <CollapsibleContent
            keepMounted
            className={cn(
              'overflow-hidden',
              'transition-[height,opacity] duration-300 ease-in-out',
              'h-[var(--collapsible-panel-height)]',
              'data-[closed]:h-0 data-[closed]:opacity-0',
              'data-[open]:opacity-100',
            )}
          >
            <div className="px-4 pb-4 pl-[38px] space-y-3">
              {children}

              {/* Footer - toolbar */}
              <div
                className={cn(
                  'pt-2',
                  toolbarPrefix ? 'flex flex-col gap-2' : '',
                )}
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
          </CollapsibleContent>
        </div>
        {afterCard}
      </div>
    </Collapsible>
  );
}
