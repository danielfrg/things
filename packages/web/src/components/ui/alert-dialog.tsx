import type { JSX, ValidComponent } from 'solid-js';
import { splitProps } from 'solid-js';

import * as AlertDialogPrimitive from '@kobalte/core/alert-dialog';
import type { PolymorphicProps } from '@kobalte/core/polymorphic';

import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from './button';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

type AlertDialogOverlayProps<T extends ValidComponent = 'div'> =
  AlertDialogPrimitive.AlertDialogOverlayProps<T> & {
    class?: string;
  };

const AlertDialogOverlay = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, AlertDialogOverlayProps<T>>,
) => {
  const [local, others] = splitProps(props as AlertDialogOverlayProps, ['class']);
  return (
    <AlertDialogPrimitive.Overlay
      class={cn(
        'fixed inset-0 z-50 bg-black/20 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0',
        local.class,
      )}
      {...others}
    />
  );
};

type AlertDialogContentProps<T extends ValidComponent = 'div'> =
  AlertDialogPrimitive.AlertDialogContentProps<T> & {
    class?: string;
    children?: JSX.Element;
  };

const AlertDialogContent = <T extends ValidComponent = 'div'>(
  props: PolymorphicProps<T, AlertDialogContentProps<T>>,
) => {
  const [local, others] = splitProps(props as AlertDialogContentProps, [
    'class',
    'children',
  ]);
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        class={cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 data-[closed]:slide-out-to-left-1/2 data-[closed]:slide-out-to-top-[48%] data-[expanded]:slide-in-from-left-1/2 data-[expanded]:slide-in-from-top-[48%] sm:rounded-lg md:w-full',
          local.class,
        )}
        {...others}
      >
        {local.children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  );
};

type AlertDialogHeaderProps = {
  class?: string;
  children?: JSX.Element;
};

const AlertDialogHeader = (props: AlertDialogHeaderProps) => {
  const [local, others] = splitProps(props, ['class']);
  return (
    <div
      class={cn('flex flex-col space-y-2 text-center sm:text-left', local.class)}
      {...others}
    />
  );
};

type AlertDialogFooterProps = {
  class?: string;
  children?: JSX.Element;
};

const AlertDialogFooter = (props: AlertDialogFooterProps) => {
  const [local, others] = splitProps(props, ['class']);
  return (
    <div
      class={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', local.class)}
      {...others}
    />
  );
};

type AlertDialogTitleProps<T extends ValidComponent = 'h2'> =
  AlertDialogPrimitive.AlertDialogTitleProps<T> & {
    class?: string;
  };

const AlertDialogTitle = <T extends ValidComponent = 'h2'>(
  props: PolymorphicProps<T, AlertDialogTitleProps<T>>,
) => {
  const [local, others] = splitProps(props as AlertDialogTitleProps, ['class']);
  return (
    <AlertDialogPrimitive.Title
      class={cn('text-lg font-semibold', local.class)}
      {...others}
    />
  );
};

type AlertDialogDescriptionProps<T extends ValidComponent = 'p'> =
  AlertDialogPrimitive.AlertDialogDescriptionProps<T> & {
    class?: string;
  };

const AlertDialogDescription = <T extends ValidComponent = 'p'>(
  props: PolymorphicProps<T, AlertDialogDescriptionProps<T>>,
) => {
  const [local, others] = splitProps(props as AlertDialogDescriptionProps, ['class']);
  return (
    <AlertDialogPrimitive.Description
      class={cn('text-sm text-muted-foreground', local.class)}
      {...others}
    />
  );
};

type AlertDialogActionProps = ButtonProps & {
  class?: string;
  onClick?: () => void;
};

const AlertDialogAction = (props: AlertDialogActionProps) => {
  const [local, others] = splitProps(props, ['class', 'onClick']);
  return (
    <Button
      class={cn(local.class)}
      onClick={local.onClick}
      {...others}
    />
  );
};

type AlertDialogCancelProps = AlertDialogPrimitive.AlertDialogCloseButtonProps & {
  class?: string;
  children?: JSX.Element;
  disabled?: boolean;
};

const AlertDialogCancel = (props: AlertDialogCancelProps) => {
  const [local, others] = splitProps(props, ['class', 'children', 'disabled']);
  return (
    <AlertDialogPrimitive.CloseButton
      as={Button}
      variant="outline"
      class={cn(local.class)}
      disabled={local.disabled}
      {...others}
    >
      {local.children}
    </AlertDialogPrimitive.CloseButton>
  );
};

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
