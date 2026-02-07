import type { ParentProps } from 'solid-js';
import { splitProps } from 'solid-js';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'gap-1 border border-transparent font-medium transition-all overflow-hidden inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        outline: 'border-task-inline text-task-inline',
      },
      size: {
        default: 'h-5 px-2 py-0.5 text-xs rounded-full',
        sm: 'h-auto px-1.5 py-0.5 text-[11px] rounded',
        xs: 'h-auto px-1.5 py-0.5 text-[10px] rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type BadgeProps = ParentProps<
  VariantProps<typeof badgeVariants> & {
    class?: string;
  }
>;

export function Badge(props: BadgeProps) {
  const [local, others] = splitProps(props, ['class', 'variant', 'size']);
  return (
    <span
      class={cn(badgeVariants({ variant: local.variant, size: local.size }), local.class)}
      {...others}
    />
  );
}

export { badgeVariants };
