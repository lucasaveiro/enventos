import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] px-4 py-3 text-sm shadow-sm transition-all duration-200 placeholder:text-[var(--input-placeholder)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
