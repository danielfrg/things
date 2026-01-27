import { cva, type VariantProps } from 'class-variance-authority';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const taskTitleVariants = cva(
  'block text-lg md:text-[15px] leading-tight truncate',
  {
    variants: {
      status: {
        default: 'text-foreground',
        completed: 'line-through text-muted-foreground',
        someday: 'text-foreground/80',
      },
      mode: {
        display: 'cursor-inherit pointer-events-none',
        editable: 'caret-things-blue',
      },
    },
    defaultVariants: {
      status: 'default',
      mode: 'display',
    },
  },
);

interface TaskTitleProps extends VariantProps<typeof taskTitleVariants> {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  editable?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
}

export function TaskTitle({
  value,
  onChange,
  onBlur,
  onKeyDown,
  onClick,
  status,
  editable = false,
  placeholder,
  inputRef,
  className,
}: TaskTitleProps) {
  if (editable && onChange) {
    return (
      <Input
        ref={inputRef}
        variant="ghost"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onClick={onClick}
        disabled={status === 'completed'}
        className={cn(
          taskTitleVariants({ status, mode: 'editable' }),
          className,
        )}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      className={cn(taskTitleVariants({ status, mode: 'display' }), className)}
    >
      {value}
    </span>
  );
}

export { taskTitleVariants };
