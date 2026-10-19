import type * as React from "react"
import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="w-full overflow-x-auto rounded-xl border border-border bg-surface">
      <table data-slot="table" className={cn("w-full caption-bottom text-body", className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("bg-surface-muted", className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-t border-border transition-colors duration-150 hover:bg-surface-hover/60", className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn("h-10 px-4 text-left text-caption font-semibold whitespace-nowrap text-fg-muted", className)}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td data-slot="table-cell" className={cn("h-12 px-4 align-middle text-fg", className)} {...props} />
}

/** Numbers, dates and counts: IBM Plex Mono with tabular figures, per the style guide. */
function TableNumber({ className, ...props }: React.ComponentProps<"td">) {
  return <TableCell className={cn("font-mono whitespace-nowrap tabular-nums", className)} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableNumber }
