import type { JSX, ValidComponent } from 'solid-js';
import { splitProps } from 'solid-js';

import type { PolymorphicProps } from '@kobalte/core';
import * as SwitchPrimitive from '@kobalte/core/switch';

import { cn } from '@/lib/utils';

const SwitchRoot = SwitchPrimitive.Root;
const SwitchDescription = SwitchPrimitive.Description;
const SwitchErrorMessage = SwitchPrimitive.ErrorMessage;

type SwitchControlProps = SwitchPrimitive.SwitchControlProps & {
  class?: string;
  children?: JSX.Element;
};

const SwitchControl = <T extends ValidComponent = 'input'>(
  props: PolymorphicProps<T, SwitchControlProps>,
) => {
  const [local, others] = splitProps(props as SwitchControlProps, ['class', 'children']);
  return (
    <>
      <SwitchPrimitive.Input
        class={cn(
          '[&:focus-visible+div]:outline-none [&:focus-visible+div]:ring-2 [&:focus-visible+div]:ring-ring [&:focus-visible+div]:ring-offset-2 [&:focus-visible+div]:ring-offset-background',
          local.class,
        )}
      />
      <SwitchPrimitive.Control
        class={cn(
          'inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input transition-[color,background-color,box-shadow] data-[disabled]:cursor-not-allowed data-[checked]:bg-primary data-[disabled]:opacity-50',
          local.class,
        )}
        {...others}
      >
        {local.children}
      </SwitchPrimitive.Control>
    </>
  );
};

type SwitchThumbProps = SwitchPrimitive.SwitchThumbProps & { class?: string };

const SwitchThumb = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, SwitchThumbProps>,
) => {
  const [local, others] = splitProps(props as SwitchThumbProps, ['class']);
  return (
    <SwitchPrimitive.Thumb
      class={cn(
        'pointer-events-none block size-4 translate-x-0 rounded-full bg-background shadow-lg ring-0 transition-transform data-[checked]:translate-x-4',
        local.class,
      )}
      {...others}
    />
  );
};

type SwitchLabelProps = SwitchPrimitive.SwitchLabelProps & { class?: string };

const SwitchLabel = <T extends ValidComponent = 'label'>(
  props: PolymorphicProps<T, SwitchLabelProps>,
) => {
  const [local, others] = splitProps(props as SwitchLabelProps, ['class']);
  return (
    <SwitchPrimitive.Label
      class={cn(
        'text-sm font-medium leading-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70',
        local.class,
      )}
      {...others}
    />
  );
};

// Convenience component that wraps everything
type SwitchProps = SwitchPrimitive.SwitchRootProps & {
  class?: string;
};

const Switch = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, SwitchProps>,
) => {
  const [local, others] = splitProps(props as SwitchProps, ['class']);
  return (
    <SwitchRoot class={cn('inline-flex items-center', local.class)} {...others}>
      <SwitchControl>
        <SwitchThumb />
      </SwitchControl>
    </SwitchRoot>
  );
};

export {
  Switch,
  SwitchRoot,
  SwitchControl,
  SwitchThumb,
  SwitchLabel,
  SwitchDescription,
  SwitchErrorMessage,
};
