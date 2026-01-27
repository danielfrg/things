import { cva, type VariantProps } from 'class-variance-authority';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const toolbarButtonVariants = cva(
  'inline-flex items-center gap-1 rounded text-[12px] transition-colors',
  {
    variants: {
      size: {
        sm: 'h-6 px-2',
        md: 'h-7 px-2.5',
      },
      intent: {
        default:
          'text-muted-foreground hover:bg-secondary hover:text-foreground',
        danger: 'text-destructive hover:bg-destructive/10',
        success: 'text-green-600 hover:text-green-700',
        warning: 'text-amber-600 hover:text-amber-700',
      },
    },
    defaultVariants: {
      size: 'sm',
      intent: 'default',
    },
  },
);

interface ToolbarButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof toolbarButtonVariants> {
  icon?: React.ReactNode;
}

export function ToolbarButton({
  className,
  size,
  intent,
  icon,
  children,
  ...props
}: ToolbarButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(toolbarButtonVariants({ size, intent }), className)}
      {...props}
    >
      {icon}
      {children && <span>{children}</span>}
    </Button>
  );
}

export { toolbarButtonVariants };
