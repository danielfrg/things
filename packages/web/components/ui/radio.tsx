import { cn } from '@/lib/utils';

interface RadioProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
  value?: string;
}

export function Radio({
  checked,
  onChange,
  disabled,
  className,
}: RadioProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-things-blue'
          : 'border-gray-300 dark:border-gray-600',
        className,
      )}
    >
      {checked && <span className="w-2 h-2 rounded-full bg-things-blue" />}
    </button>
  );
}
