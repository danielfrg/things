import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  icon,
  title,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'pb-2 mb-2 border-b border-border px-4 md:px-8',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-base font-bold text-foreground flex items-center gap-2">
          {icon && (
            <span className="w-[18px] flex items-center justify-center shrink-0">
              {icon}
            </span>
          )}
          <span>{title}</span>
        </h2>
        {action}
      </div>
    </div>
  );
}
