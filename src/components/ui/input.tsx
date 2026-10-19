import { Input as InputPrimitive } from "@base-ui/react/input"
import type * as React from "react"
import { cn } from "@/lib/utils"

/** Style guide search field: 44px, 8px radius, control border, accent ring on focus. */
function Input({ className, ...props }: InputPrimitive.Props) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-border-strong bg-surface px-3 text-body text-fg transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-fg-subtle hover:border-fg-subtle focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20",
        className
      )}
      {...props}
    />
  )
}

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label data-slot="label" className={cn("mb-2 block text-body text-fg-muted", className)} {...props} />
  )
}

export { Input, Label }
