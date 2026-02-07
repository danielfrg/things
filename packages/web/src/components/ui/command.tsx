import { type ParentProps, type ComponentProps, splitProps } from 'solid-js';
import { Command as CommandPrimitive } from 'cmdk-solid';
import { SearchIcon } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type CommandProps = ComponentProps<typeof CommandPrimitive> & {
  class?: string;
};

export function Command(props: CommandProps) {
  const [local, others] = splitProps(props, ['class']);
  return (
    <CommandPrimitive
      class={cn(
        'bg-popover text-popover-foreground rounded-xl p-1 flex size-full flex-col overflow-hidden',
        local.class,
      )}
      {...others}
    />
  );
}

type CommandDialogProps = ParentProps<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  class?: string;
}>;

export function CommandDialog(props: CommandDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <div class="sr-only">
        <DialogTitle>{props.title || 'Command Palette'}</DialogTitle>
        <DialogDescription>
          {props.description || 'Search for a command to run...'}
        </DialogDescription>
      </div>
      <DialogContent
        class={cn(
          'rounded-xl top-1/3 translate-y-0 overflow-hidden p-0',
          props.class,
        )}
      >
        {props.children}
      </DialogContent>
    </Dialog>
  );
}

type CommandInputProps = ComponentProps<typeof CommandPrimitive.Input> & {
  class?: string;
};

export function CommandInput(props: CommandInputProps) {
  const [local, others] = splitProps(props, ['class']);
  return (
    <div class="p-1 pb-0">
      <div class="relative">
        <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-4 shrink-0 opacity-50" />
        <CommandPrimitive.Input
          class={cn(
            'w-full h-10 pl-10 pr-3 text-sm bg-input/30 border border-input/30 rounded-lg outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            local.class,
          )}
          {...others}
        />
      </div>
    </div>
  );
}

type CommandListProps = ComponentProps<typeof CommandPrimitive.List> & {
  class?: string;
};

export function CommandList(props: CommandListProps) {
  const [local, others] = splitProps(props, ['class']);
  return (
    <CommandPrimitive.List
      class={cn(
        'max-h-72 scroll-py-1 outline-none overflow-x-hidden overflow-y-auto',
        local.class,
      )}
      {...others}
    />
  );
}

type CommandEmptyProps = ComponentProps<typeof CommandPrimitive.Empty> & {
  class?: string;
};

export function CommandEmpty(props: CommandEmptyProps) {
  const [local, others] = splitProps(props, ['class']);
  return (
    <CommandPrimitive.Empty
      class={cn('py-6 text-center text-sm', local.class)}
      {...others}
    />
  );
}

type CommandGroupProps = ComponentProps<typeof CommandPrimitive.Group> & {
  class?: string;
};

export function CommandGroup(props: CommandGroupProps) {
  const [local, others] = splitProps(props, ['class']);
  return (
    <CommandPrimitive.Group
      class={cn(
        'text-foreground overflow-hidden p-1',
        '[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium',
        local.class,
      )}
      {...others}
    />
  );
}

type CommandSeparatorProps = ComponentProps<
  typeof CommandPrimitive.Separator
> & {
  class?: string;
};

export function CommandSeparator(props: CommandSeparatorProps) {
  const [local, others] = splitProps(props, ['class']);
  return (
    <CommandPrimitive.Separator
      class={cn('bg-border -mx-1 h-px w-auto', local.class)}
      {...others}
    />
  );
}

type CommandItemProps = ParentProps<
  ComponentProps<typeof CommandPrimitive.Item> & {
    class?: string;
  }
>;

export function CommandItem(props: CommandItemProps) {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <CommandPrimitive.Item
      class={cn(
        'relative flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none',
        'data-[selected]:bg-muted data-[selected]:text-foreground',
        'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
        local.class,
      )}
      {...others}
    >
      {local.children}
    </CommandPrimitive.Item>
  );
}

type CommandShortcutProps = ComponentProps<'span'> & {
  class?: string;
};

export function CommandShortcut(props: CommandShortcutProps) {
  const [local, others] = splitProps(props, ['class']);
  return (
    <span
      class={cn(
        'text-muted-foreground ml-auto text-xs tracking-widest',
        local.class,
      )}
      {...others}
    />
  );
}
