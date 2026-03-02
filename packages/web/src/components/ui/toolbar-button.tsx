import type { JSX, ParentProps } from 'solid-js';
import { splitProps } from 'solid-js';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const toolbarButtonVariants = cva(
  'inline-flex items-center gap-1 rounded text-[12px] transition-colors border border-transparent',
  {
    variants: {
      size: {
        sm: 'h-8 md:h-6 px-2',
        md: 'h-8 md:h-7 px-2.5',
      },
      intent: {
        default:
          'text-toolbar-icon hover:border-toolbar-border',
        danger: 'text-destructive hover:bg-destructive/10',
      },
    },
    defaultVariants: {
      size: 'sm',
      intent: 'default',
    },
  },
);

type ToolbarButtonProps = ParentProps<
  JSX.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof toolbarButtonVariants> & {
    icon?: JSX.Element;
  }
>;

export function ToolbarButton(props: ToolbarButtonProps) {
  const [local, others] = splitProps(props, [
    'class',
    'size',
    'intent',
    'icon',
    'children',
  ]);

  return (
    <button
      type="button"
      class={cn(
        toolbarButtonVariants({ size: local.size, intent: local.intent }),
        local.class,
      )}
      {...others}
    >
      {local.icon}
      {local.children && <span>{local.children}</span>}
    </button>
  );
}

export { toolbarButtonVariants };
