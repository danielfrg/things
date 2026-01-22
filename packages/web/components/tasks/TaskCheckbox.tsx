import { CheckIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface TaskCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  variant?: 'default' | 'someday';
  className?: string;
}

export function TaskCheckbox({
  checked,
  onChange,
  disabled,
  variant,
  className,
}: TaskCheckboxProps) {
  const isSomeday = variant === 'someday';

  return (
    <label
      className={cn(
        'w-[18px] h-[18px] rounded flex items-center justify-center cursor-pointer',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        checked
          ? 'bg-things-blue border-things-blue text-white border'
          : isSomeday
            ? 'border border-dashed border-hint hover:border-things-blue/60'
            : 'border border-solid border-muted-foreground/50 hover:border-things-blue/60',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <CheckIcon
        className={cn('w-3 h-3', checked ? 'opacity-100' : 'opacity-0')}
        strokeWidth={3}
      />
    </label>
  );
}
