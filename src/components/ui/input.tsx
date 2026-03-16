import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-text-primary text-[13px] font-medium transition-all placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
