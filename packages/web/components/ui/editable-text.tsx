import type { KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function EditableText({
  value,
  onChange,
  placeholder,
  className,
}: EditableTextProps) {
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmed = e.target.value.trim();
    if (trimmed !== value) {
      onChange(trimmed);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (e.key === 'Enter') {
      target.blur();
    } else if (e.key === 'Escape') {
      target.value = value;
      target.blur();
    }
  };

  return (
    <Input
      variant="ghost"
      type="text"
      defaultValue={value}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={cn('block w-full', 'placeholder:text-hint', className)}
    />
  );
}
