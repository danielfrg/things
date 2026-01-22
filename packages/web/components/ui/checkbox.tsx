import { CheckIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked, onChange, disabled, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'h-4 w-4 shrink-0 rounded-sm border border-primary shadow',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked && 'bg-primary text-primary-foreground',
        className
      )}
    >
      {checked && <CheckIcon className="h-3.5 w-3.5" />}
    </button>
  );
}
