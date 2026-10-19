import type * as React from "react"
import { cn } from "@/lib/utils"
import { STAGE_LABELS, tones, type Tone } from "./tone"
import type { Stage } from "@/lib/types"

interface BadgeProps extends React.ComponentProps<"span"> {
  tone?: Tone
  /** Show the tone's mark as a dot before the label (stage chips). */
  dot?: boolean
}

/** Style guide chip: pill, subtle background, strong text, optional mark dot. */
function Badge({ tone = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        tones[tone],
        "inline-flex h-5.5 w-fit shrink-0 items-center gap-1.5 rounded-full bg-(--tone-subtle) px-2.5 text-caption whitespace-nowrap text-(--tone-strong)",
        className
      )}
      {...props}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-(--tone-mark)" />}
      {children}
    </span>
  )
}

/** A stage always appears with its name, never as color alone. */
function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  return (
    <Badge tone={stage} dot className={className}>
      {STAGE_LABELS[stage]}
    </Badge>
  )
}

/** Amber "! Action" marker for applications that need a reply. */
function ActionBadge({ className }: { className?: string }) {
  return (
    <Badge tone="warning" className={cn("font-semibold", className)} title="Needs action">
      <span aria-hidden>!</span> Action
    </Badge>
  )
}

export { Badge, StageBadge, ActionBadge }
