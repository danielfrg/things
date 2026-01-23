import type { ReactNode } from 'react';
import { MobileBackButton } from '@/components/MobileBackButton';

interface ViewContainerProps {
  title?: string;
  icon?: ReactNode;
  iconColor?: string;
  children: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  header?: ReactNode;
}

export function ViewContainer({
  title,
  icon,
  children,
  actions,
  toolbar,
  header,
}: ViewContainerProps) {
  const hasHeader = header !== undefined;
  const hasTitle = title !== undefined;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {(hasHeader || hasTitle) &&
          (hasHeader ? (
            header
          ) : (
            <header className="flex items-center justify-between px-4 md:px-22 pt-8 pb-4">
              <div className="flex items-center gap-3">
                <MobileBackButton />
                {icon}
                <h1 className="text-2xl font-bold text-foreground leading-none h-[25px]">
                  {title}
                </h1>
              </div>
              {actions !== undefined && (
                <div className="flex items-center gap-2">{actions}</div>
              )}
            </header>
          ))}

        <div className="px-0 md:px-18 pb-6">{children}</div>
      </div>

      <div className="flex-shrink-0 border-t border-border bg-background px-6 md:px-18 h-[52px] flex items-center justify-center">
        {toolbar}
      </div>
    </div>
  );
}
