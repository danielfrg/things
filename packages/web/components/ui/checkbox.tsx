import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { CheckIcon } from "@/components/icons"

const checkboxVariants = cva(
  "flex items-center justify-center shrink-0 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "size-4 rounded-[4px] border shadow-xs border-input dark:bg-input/30 data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-checked:border-primary focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        task:
          "w-[18px] h-[18px] rounded border border-solid border-muted-foreground/50 hover:border-things-blue/60 data-checked:bg-things-blue data-checked:border-things-blue data-checked:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        circle:
          "w-[13px] h-[13px] rounded-full border-[1.5px] border-things-blue bg-transparent hover:bg-things-blue/10 data-checked:bg-things-blue data-checked:border-things-blue",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface CheckboxProps
  extends Omit<CheckboxPrimitive.Root.Props, "onChange">,
    VariantProps<typeof checkboxVariants> {
  dashed?: boolean
  onChange?: (checked: boolean) => void
}

function Checkbox({
  className,
  variant = "default",
  dashed,
  checked,
  onChange,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  const handleCheckedChange: CheckboxPrimitive.Root.Props["onCheckedChange"] = (checked, event) => {
    onChange?.(checked)
    onCheckedChange?.(checked, event)
  }

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={checked}
      onCheckedChange={handleCheckedChange}
      className={cn(
        checkboxVariants({ variant }),
        variant === "task" && dashed && "border-dashed",
        className
      )}
      {...props}
    >
      {variant === "circle" ? (
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          className="w-full h-full text-white"
        >
          <svg
            className="w-full h-full"
            viewBox="0 0 12 12"
            aria-hidden="true"
          >
            <path
              d="M3 6l2 2L9 4"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </CheckboxPrimitive.Indicator>
      ) : (
        <CheckboxPrimitive.Indicator
          data-slot="checkbox-indicator"
          className={cn(
            "grid place-content-center text-current",
            variant === "default" && "[&>svg]:size-3.5",
            variant === "task" && "[&>svg]:size-3"
          )}
        >
          <CheckIcon strokeWidth={variant === "task" ? 3 : 2} />
        </CheckboxPrimitive.Indicator>
      )}
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox, checkboxVariants }
