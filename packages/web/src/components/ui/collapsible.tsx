import type { ParentProps, ValidComponent } from 'solid-js';
import { splitProps } from 'solid-js';

import type { PolymorphicProps } from '@kobalte/core';
import * as CollapsiblePrimitive from '@kobalte/core/collapsible';

import { cn } from '@/lib/utils';

type CollapsibleRootProps = CollapsiblePrimitive.CollapsibleRootProps & {
  class?: string;
};

function Collapsible<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, CollapsibleRootProps>,
) {
  const [local, others] = splitProps(props as CollapsibleRootProps, ['class']);
  return <CollapsiblePrimitive.Root class={local.class} {...others} />;
}

type CollapsibleTriggerProps = CollapsiblePrimitive.CollapsibleTriggerProps & {
  class?: string;
};

function CollapsibleTrigger<T extends ValidComponent = 'button'>(
  props: PolymorphicProps<T, CollapsibleTriggerProps>,
) {
  const [local, others] = splitProps(props as CollapsibleTriggerProps, [
    'class',
  ]);
  return <CollapsiblePrimitive.Trigger class={local.class} {...others} />;
}

type CollapsibleContentProps = ParentProps<
  CollapsiblePrimitive.CollapsibleContentProps & {
    class?: string;
  }
>;

function CollapsibleContent<T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, CollapsibleContentProps>,
) {
  const [local, others] = splitProps(props as CollapsibleContentProps, [
    'class',
  ]);
  return (
    <CollapsiblePrimitive.Content
      class={cn(
        'overflow-hidden',
        'animate-collapsible-up data-[expanded]:animate-collapsible-down',
        local.class,
      )}
      {...others}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
