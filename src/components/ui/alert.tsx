import type * as React from "react"
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { tones } from "./tone"

const icons = { danger: CircleAlert, warning: TriangleAlert, info: Info, success: CircleCheck }

interface AlertProps extends React.ComponentProps<"div"> {
  tone?: keyof typeof icons
}

/** Inline feedback outside the pipeline: errors, warnings and notices. */
function Alert({ tone = "danger", className, children, ...props }: AlertProps) {
  const Icon = icons[tone]
  return (
    <div
      data-slot="alert"
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        tones[tone],
        "flex items-start gap-2 rounded-lg bg-(--tone-subtle) p-3 text-body text-(--tone-strong)",
        className
      )}
      {...props}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export { Alert }
