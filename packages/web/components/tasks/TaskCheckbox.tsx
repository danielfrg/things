import { Checkbox } from '@/components/ui/checkbox';

interface TaskCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  dashed?: boolean;
}

export function TaskCheckbox({ checked, onChange, dashed }: TaskCheckboxProps) {
  return (
    <button
      type="button"
      className="shrink-0 cursor-pointer"
      onMouseDown={(e) => {
        // Only stop propagation for regular clicks (no modifiers)
        // This allows Cmd+Click and Shift+Click to bubble up for multi-select
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.stopPropagation();
        }
      }}
      onClick={(e) => {
        // Only toggle checkbox on regular click (no modifiers)
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.stopPropagation();
          onChange(!checked);
        }
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
