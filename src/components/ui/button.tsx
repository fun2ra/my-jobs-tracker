import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/** Style guide "Controls": 44px tall, 8px radius, flat. Primary for the main action, secondary for the rest, inverse for sign-in. */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent text-body font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary-hover",
        secondary:
          "border-border-strong bg-surface font-normal text-fg hover:border-fg-subtle hover:bg-surface-hover active:bg-surface-pressed aria-expanded:bg-surface-hover",
        inverse: "bg-inverse text-inverse-fg hover:bg-inverse-hover",
        ghost: "text-fg-muted hover:bg-surface-hover hover:text-fg active:bg-surface-pressed aria-expanded:bg-surface-hover",
        destructive:
          "border-danger/30 bg-danger-subtle text-danger-strong hover:border-danger hover:bg-danger hover:text-white focus-visible:ring-danger/30",
        link: "rounded-sm font-normal text-primary underline decoration-primary/40 underline-offset-4 hover:text-primary-hover hover:decoration-current",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3",
        lg: "h-12 px-5",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
