import { ComponentProps, forwardRef } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/utils"

const glassPanelVariants = cva(
  "relative border border-white/10 backdrop-blur-xl transition-all duration-300 dark:border-white/5",
  {
    variants: {
      variant: {
        default:
          "bg-white/80 shadow-xl shadow-neutral-900/10 dark:bg-neutral-900/60 dark:shadow-black/30",
        navigation:
          "bg-white/90 shadow-2xl shadow-neutral-900/10 backdrop-blur-2xl dark:bg-neutral-900/70 dark:shadow-black/40",
        sidebar:
          "bg-white/85 shadow-xl shadow-neutral-900/10 backdrop-blur-xl dark:bg-neutral-900/65 dark:shadow-black/30",
        overlay:
          "bg-white/75 shadow-2xl shadow-neutral-900/15 backdrop-blur-2xl dark:bg-neutral-900/55 dark:shadow-black/40",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        "2xl": "rounded-2xl",
      },
      sticky: {
        none: "",
        top: "sticky top-0 z-40",
        bottom: "sticky bottom-0 z-40",
      },
    },
    defaultVariants: {
      variant: "default",
      rounded: "xl",
      sticky: "none",
    },
  }
)

export interface GlassPanelProps
  extends ComponentProps<"div">,
    VariantProps<typeof glassPanelVariants> {
  /**
   * Adds a gradient border effect
   */
  gradientBorder?: boolean
  /**
   * Reduces blur on mobile devices for better performance
   */
  mobileOptimized?: boolean
  /**
   * Adds inner glow effect
   */
  innerGlow?: boolean
}

const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      className,
      variant,
      rounded,
      sticky,
      gradientBorder = false,
      mobileOptimized = true,
      innerGlow = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        data-slot="glass-panel"
        className={cn(
          glassPanelVariants({ variant, rounded, sticky }),
          mobileOptimized && "backdrop-blur-lg md:backdrop-blur-xl lg:backdrop-blur-2xl",
          className
        )}
        {...props}
      >
        {/* Gradient border overlay */}
        {gradientBorder && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent p-[1px]",
              rounded === "xl" && "rounded-xl",
              rounded === "2xl" && "rounded-2xl",
              rounded === "lg" && "rounded-lg",
              rounded === "md" && "rounded-md",
              rounded === "sm" && "rounded-sm"
            )}
            aria-hidden="true"
          >
            <div
              className={cn(
                "h-full w-full bg-transparent",
                rounded === "xl" && "rounded-xl",
                rounded === "2xl" && "rounded-2xl",
                rounded === "lg" && "rounded-lg",
                rounded === "md" && "rounded-md",
                rounded === "sm" && "rounded-sm"
              )}
            />
          </div>
        )}

        {/* Inner glow effect */}
        {innerGlow && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-50 dark:from-white/5",
              rounded === "xl" && "rounded-xl",
              rounded === "2xl" && "rounded-2xl",
              rounded === "lg" && "rounded-lg",
              rounded === "md" && "rounded-md",
              rounded === "sm" && "rounded-sm"
            )}
            aria-hidden="true"
          />
        )}

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    )
  }
)

GlassPanel.displayName = "GlassPanel"

function GlassPanelHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-panel-header"
      className={cn(
        "border-b border-white/10 px-6 py-4 dark:border-white/5",
        className
      )}
      {...props}
    />
  )
}

function GlassPanelContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-panel-content"
      className={cn("p-6", className)}
      {...props}
    />
  )
}

function GlassPanelFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-panel-footer"
      className={cn(
        "border-t border-white/10 px-6 py-4 dark:border-white/5",
        className
      )}
      {...props}
    />
  )
}

export {
  GlassPanel,
  GlassPanelHeader,
  GlassPanelContent,
  GlassPanelFooter,
  glassPanelVariants,
}
