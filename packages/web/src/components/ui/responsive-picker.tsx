import type { JSX } from 'solid-js';
import { createEffect, createSignal, onCleanup, Show } from 'solid-js';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const MOBILE_BREAKPOINT = 768;

function createMobileSignal() {
  const [mobile, setMobile] = createSignal(window.innerWidth < MOBILE_BREAKPOINT);
  createEffect(() => {
    const check = () => setMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', check);
    onCleanup(() => window.removeEventListener('resize', check));
  });
  return mobile;
}

type ResponsivePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: JSX.Element;
  children: JSX.Element;
  contentClass?: string;
  dialogClass?: string;
};

export function ResponsivePicker(props: ResponsivePickerProps) {
  const mobile = createMobileSignal();

  return (
    <Show
      when={mobile()}
      fallback={
        <Popover open={props.open} onOpenChange={props.onOpenChange}>
          <PopoverTrigger as="div">{props.trigger}</PopoverTrigger>
          <PopoverContent class={cn('w-auto p-0 bg-transparent border-0 shadow-xl', props.contentClass)}>
            {props.children}
          </PopoverContent>
        </Popover>
      }
    >
      <button
        type="button"
        onClick={() => props.onOpenChange(true)}
      >
        {props.trigger}
      </button>
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent
          showCloseButton={false}
          class={cn(
            'w-auto p-0 border-0 bg-transparent shadow-xl gap-0',
            props.dialogClass,
          )}
        >
          {props.children}
        </DialogContent>
      </Dialog>
    </Show>
  );
}
