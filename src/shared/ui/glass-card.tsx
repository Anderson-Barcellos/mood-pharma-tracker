import { ComponentProps, forwardRef } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/utils"

const glassCardVariants = cva(
  "relative flex flex-col gap-6 rounded-xl border border-white/10 backdrop-blur-md transition-all duration-300 dark:border-white/5",
  {
    variants: {
      variant: {
        default:
          "bg-white/60 shadow-lg shadow-neutral-900/5 dark:bg-neutral-900/40 dark:shadow-black/20",
        elevated:
          "bg-white/70 shadow-xl shadow-neutral-900/10 backdrop-blur-lg dark:bg-neutral-900/50 dark:shadow-black/30",
        interactive:
          "bg-white/60 shadow-lg shadow-neutral-900/5 hover:bg-white/70 hover:shadow-xl hover:shadow-neutral-900/10 hover:-translate-y-0.5 active:translate-y-0 dark:bg-neutral-900/40 dark:shadow-black/20 dark:hover:bg-neutral-900/50 dark:hover:shadow-black/30",
        subtle:
          "bg-white/40 shadow-md shadow-neutral-900/5 backdrop-blur-sm dark:bg-neutral-900/30 dark:shadow-black/10",
      },
      glow: {
        none: "",
        medical:
          "shadow-[0_0_30px_-5px_rgba(59,130,246,0.15)] dark:shadow-[0_0_30px_-5px_rgba(59,130,246,0.25)]",
        mood: "shadow-[0_0_30px_-5px_rgba(168,85,247,0.15)] dark:shadow-[0_0_30px_-5px_rgba(168,85,247,0.25)]",
        cognitive:
          "shadow-[0_0_30px_-5px_rgba(34,197,94,0.15)] dark:shadow-[0_0_30px_-5px_rgba(34,197,94,0.25)]",
        warning:
          "shadow-[0_0_30px_-5px_rgba(251,146,60,0.15)] dark:shadow-[0_0_30px_-5px_rgba(251,146,60,0.25)]",
      },
    },
    defaultVariants: {
      variant: "default",
      glow: "none",
    },
  }
)

export interface GlassCardProps
  extends ComponentProps<"div">,
    VariantProps<typeof glassCardVariants> {
  /**
   * Adds a gradient overlay for additional depth
   */
  gradient?: boolean
  /**
   * Reduces blur on mobile devices for better performance
   */
  mobileOptimized?: boolean
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant,
      glow,
      gradient = false,
      mobileOptimized = true,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        data-slot="glass-card"
        className={cn(
          glassCardVariants({ variant, glow }),
          mobileOptimized && "sm:backdrop-blur-md md:backdrop-blur-lg",
          className
        )}
        {...props}
      >
        {gradient && (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 via-transparent to-transparent dark:from-white/5"
            aria-hidden="true"
          />
        )}
        <div className="relative z-10 flex flex-col gap-6 py-6">{children}</div>
      </div>
    )
  }
)

GlassCard.displayName = "GlassCard"

function GlassCardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=glass-card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function GlassCardTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-title"
      className={cn(
        "font-semibold leading-none text-neutral-12 dark:text-neutral-12",
        className
      )}
      {...props}
    />
  )
}

function GlassCardDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-description"
      className={cn(
        "text-sm text-neutral-11 dark:text-neutral-11",
        className
      )}
      {...props}
    />
  )
}

function GlassCardAction({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function GlassCardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="glass-card-content" className={cn("px-6", className)} {...props} />
  )
}

function GlassCardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  GlassCard,
  GlassCardHeader,
  GlassCardFooter,
  GlassCardTitle,
  GlassCardAction,
  GlassCardDescription,
  GlassCardContent,
  glassCardVariants,
}
