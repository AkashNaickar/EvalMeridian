"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.ComponentPropsWithoutRef<"div"> {
  src?: string
  alt?: string
  fallback?: string
}

function Avatar({ src, alt, fallback, className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200",
        className
      )}
      {...props}
    >
      {src ? (
        <Image
          src={src}
          alt={alt || "Avatar"}
          fill
          className="aspect-square h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
          {fallback || "?"}
        </div>
      )}
    </div>
  )
}

export { Avatar }
