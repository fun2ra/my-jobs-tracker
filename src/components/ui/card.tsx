import type * as React from "react"
import { cn } from "@/lib/utils"

/** Style guide surface: white, 12px radius, separated by a border rather than a shadow. */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 text-fg", className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1", className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="card-title" className={cn("text-heading text-fg", className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("text-body text-fg-muted", className)} {...props} />
}

/** Mono uppercase label above a card's content ("WHAT HAPPENS WHEN YOU UPDATE"). */
function CardEyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-eyebrow"
      className={cn("font-mono text-caption tracking-wide text-fg-muted uppercase", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn(className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardEyebrow, CardContent }
