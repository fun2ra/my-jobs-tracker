import { Toggle } from "@base-ui/react/toggle"
import { cn } from "@/lib/utils"
import { tones, type Tone } from "./tone"

interface FilterChipProps extends Toggle.Props {
  tone?: Tone
  /** Number of matching items, shown in mono after the label. */
  count?: number
}

/** Style guide filter chip ("Interview 3"): white pill when off, tinted with its tone when on. */
function FilterChip({ tone = "neutral", count, className, children, ...props }: FilterChipProps) {
  return (
    <Toggle
      data-slot="filter-chip"
      className={cn(
        tones[tone],
        "inline-flex h-9.5 cursor-pointer items-center gap-2.5 rounded-full border border-border-strong bg-surface px-3.5 text-body text-fg-muted transition-colors duration-150 outline-none hover:border-fg-subtle hover:bg-surface-hover hover:text-fg focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 data-pressed:border-(--tone-mark) data-pressed:bg-(--tone-subtle) data-pressed:text-(--tone-strong)",
        className
      )}
      {...props}
    >
      {children}
      {count !== undefined && <span className="font-mono tabular-nums">{count}</span>}
    </Toggle>
  )
}

export { FilterChip }
