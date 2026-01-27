import { format } from 'date-fns';
import { InfoIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

interface InfoPopoverProps {
  createdAt: Date;
  updatedAt: Date;
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InfoPopover({
  createdAt,
  updatedAt,
  id,
  open,
  onOpenChange,
}: InfoPopoverProps) {
  if (!open) {
    return (
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(true);
        }}
        className="text-hint hover:text-muted-foreground hover:bg-secondary"
      >
        <InfoIcon className="w-3.5 h-3.5" />
      </Button>
    );
  }

  return (
    <div className="relative flex items-center">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(false);
        }}
        className="text-hint hover:text-muted-foreground hover:bg-secondary"
      >
        <InfoIcon className="w-3.5 h-3.5" />
      </Button>

      <div
        role="dialog"
        className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-popover rounded-lg shadow-lg border border-border text-[12px] z-50"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="space-y-1.5 text-foreground/80">
          <div>
            <span className="text-muted-foreground">Created:</span>{' '}
            {format(createdAt, 'PPP p')}
          </div>
          <div>
            <span className="text-muted-foreground">Updated:</span>{' '}
            {format(updatedAt, 'PPP p')}
          </div>
          <div className="pt-1.5 border-t border-border">
            <span className="text-muted-foreground">ID:</span>{' '}
            <code className="text-[10px] bg-secondary px-1 py-0.5 rounded select-all">
              {id}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
