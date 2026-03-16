"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md text-[13px] font-semibold transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        outline:
          "border border-border bg-background hover:bg-secondary hover:text-text-primary",
        secondary:
          "bg-secondary text-text-primary hover:bg-secondary/80",
        ghost:
          "hover:bg-secondary hover:text-text-primary",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90",
        link: "text-primary hover:underline underline-offset-4",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3",
        xs: "h-8 px-2.5 text-xs",
        lg: "h-11 px-6 text-sm",
        icon: "size-10",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
