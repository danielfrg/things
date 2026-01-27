import { Checkbox } from '@/components/ui/checkbox';

interface TaskCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  dashed?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function TaskCheckbox({
  checked,
  onChange,
  dashed,
  onClick,
}: TaskCheckboxProps) {
  return (
    <button
      type="button"
      className="shrink-0 cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
        onChange(!checked);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onChange(!checked);
        }
      }}
    >
      <Checkbox
        variant="task"
        checked={checked}
        onChange={onChange}
        dashed={dashed}
      />
    </button>
  );
}
