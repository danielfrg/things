import type { ValidComponent } from 'solid-js';
import { splitProps } from 'solid-js';

import * as CheckboxPrimitive from '@kobalte/core/checkbox';
import type { PolymorphicProps } from '@kobalte/core/polymorphic';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const checkboxVariants = cva(
  'flex items-center justify-center shrink-0 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'size-4 rounded-[4px] border shadow-xs border-input dark:bg-input/30 data-[checked]:bg-primary data-[checked]:text-primary-foreground dark:data-[checked]:bg-primary data-[checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        circle:
          'w-[13px] h-[13px] rounded-full border-[1.5px] border-things-blue bg-transparent hover:bg-things-blue/10 data-[checked]:bg-things-blue data-[checked]:border-things-blue',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type CheckboxProps<T extends ValidComponent = 'div'> =
  CheckboxPrimitive.CheckboxRootProps<T> &
    VariantProps<typeof checkboxVariants> & {
      class?: string;
      onChange?: (checked: boolean) => void;
    };

function Checkbox<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, CheckboxProps<T>>,
) {
  const [local, others] = splitProps(props as CheckboxProps, [
    'class',
    'variant',
    'onChange',
    'checked',
  ]);

  return (
    <CheckboxPrimitive.Root
      class={cn(checkboxVariants({ variant: local.variant }), local.class)}
      checked={local.checked}
      onChange={local.onChange}
      {...others}
    >
      <CheckboxPrimitive.Input class="peer" />
      <CheckboxPrimitive.Control>
        <CheckboxPrimitive.Indicator>
          {local.variant === 'circle' ? (
            <svg class="w-full h-full" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M3 6l2 2L9 4"
                stroke="currentColor"
                stroke-width="1.5"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          ) : (
            <svg
              class="size-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox, checkboxVariants };
