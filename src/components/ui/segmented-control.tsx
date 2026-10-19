import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { cn } from "@/lib/utils"

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onValueChange: (value: T) => void
  "aria-label": string
  className?: string
}

/** Style guide segmented control ("All time / 90 days / 30 days"): one option is always selected. */
function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  className,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup
      data-slot="segmented-control"
      value={[value]}
      // Clicking the selected option would empty the group; keep it selected instead.
      onValueChange={(next) => next[0] && onValueChange(next[0] as T)}
      className={cn("inline-flex h-11 w-fit items-center gap-0.5 rounded-lg bg-surface-muted p-1", className)}
      {...props}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          className="h-full cursor-pointer rounded-md px-4 text-body text-fg-muted transition-colors duration-150 outline-none hover:bg-surface/60 hover:text-fg focus-visible:ring-3 focus-visible:ring-ring/40 data-pressed:bg-surface data-pressed:font-semibold data-pressed:text-fg data-pressed:shadow-sm"
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}

export { SegmentedControl }
