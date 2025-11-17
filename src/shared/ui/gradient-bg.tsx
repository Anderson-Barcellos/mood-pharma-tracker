import { ComponentProps, forwardRef } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/utils"

const gradientBackgroundVariants = cva(
  "pointer-events-none absolute inset-0 overflow-hidden",
  {
    variants: {
      preset: {
        medical:
          "bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 dark:from-blue-950/30 dark:via-cyan-950/20 dark:to-indigo-950/30",
        mood: "bg-gradient-to-br from-purple-50 via-pink-50 to-violet-50 dark:from-purple-950/30 dark:via-pink-950/20 dark:to-violet-950/30",
        cognitive:
          "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-teal-950/30",
        analytics:
          "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-yellow-950/30",
        neutral:
          "bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 dark:from-neutral-950/30 dark:via-neutral-900/20 dark:to-neutral-950/30",
        custom: "",
      },
      animation: {
        none: "",
        slow: "animate-gradient-slow",
        medium: "animate-gradient-medium",
        fast: "animate-gradient-fast",
      },
      opacity: {
        subtle: "opacity-30",
        medium: "opacity-50",
        strong: "opacity-70",
      },
    },
    defaultVariants: {
      preset: "neutral",
      animation: "slow",
      opacity: "medium",
    },
  }
)

export interface GradientBackgroundProps
  extends Omit<ComponentProps<"div">, "children">,
    VariantProps<typeof gradientBackgroundVariants> {
  /**
   * Show animated gradient mesh orbs
   */
  meshOrbs?: boolean
  /**
   * Number of mesh orbs (1-5)
   */
  orbCount?: 1 | 2 | 3 | 4 | 5
  /**
   * Custom gradient colors (overrides preset)
   */
  customGradient?: string
}

const GradientBackground = forwardRef<HTMLDivElement, GradientBackgroundProps>(
  (
    {
      className,
      preset,
      animation,
      opacity,
      meshOrbs = false,
      orbCount = 3,
      customGradient,
      ...props
    },
    ref
  ) => {
    const orbColors = {
      medical: [
        "from-blue-400/30 to-cyan-400/30",
        "from-indigo-400/30 to-blue-400/30",
        "from-cyan-400/30 to-teal-400/30",
      ],
      mood: [
        "from-purple-400/30 to-pink-400/30",
        "from-violet-400/30 to-purple-400/30",
        "from-pink-400/30 to-rose-400/30",
      ],
      cognitive: [
        "from-green-400/30 to-emerald-400/30",
        "from-emerald-400/30 to-teal-400/30",
        "from-teal-400/30 to-cyan-400/30",
      ],
      analytics: [
        "from-orange-400/30 to-amber-400/30",
        "from-amber-400/30 to-yellow-400/30",
        "from-yellow-400/30 to-orange-400/30",
      ],
      neutral: [
        "from-neutral-400/20 to-neutral-500/20",
        "from-neutral-300/20 to-neutral-400/20",
        "from-neutral-500/20 to-neutral-600/20",
      ],
      custom: [],
    }

    const currentPreset = preset || "neutral"
    const colors = orbColors[currentPreset] || orbColors.neutral

    return (
      <div
        ref={ref}
        data-slot="gradient-background"
        className={cn(
          gradientBackgroundVariants({ preset, animation, opacity }),
          customGradient,
          className
        )}
        aria-hidden="true"
        {...props}
      >
        {/* Base gradient layer */}
        <div className="absolute inset-0" />

        {/* Animated mesh orbs */}
        {meshOrbs && (
          <>
            {Array.from({ length: Math.min(orbCount, colors.length) }).map(
              (_, index) => (
                <div
                  key={index}
                  className={cn(
                    "absolute size-96 rounded-full bg-gradient-to-br opacity-60 blur-3xl dark:opacity-40",
                    colors[index % colors.length],
                    // Positioning variations
                    index === 0 && "left-[-10%] top-[-10%] animate-float-slow",
                    index === 1 &&
                      "right-[-5%] top-[20%] animate-float-medium delay-1000",
                    index === 2 &&
                      "bottom-[-10%] left-[30%] animate-float-slow delay-2000",
                    index === 3 &&
                      "right-[25%] top-[40%] animate-float-fast delay-500",
                    index === 4 &&
                      "bottom-[20%] right-[-5%] animate-float-medium delay-1500"
                  )}
                  style={{
                    animationDuration: `${15 + index * 3}s`,
                  }}
                />
              )
            )}
          </>
        )}

        {/* Noise texture overlay for depth */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-20 mix-blend-soft-light dark:opacity-10" />
      </div>
    )
  }
)

GradientBackground.displayName = "GradientBackground"

/**
 * Wrapper component that combines gradient background with content
 */
export interface GradientContainerProps
  extends ComponentProps<"div">,
    Pick<
      GradientBackgroundProps,
      "preset" | "animation" | "opacity" | "meshOrbs" | "orbCount" | "customGradient"
    > {
  /**
   * Content to render over the gradient
   */
  children: React.ReactNode
}

const GradientContainer = forwardRef<HTMLDivElement, GradientContainerProps>(
  (
    {
      className,
      preset,
      animation,
      opacity,
      meshOrbs,
      orbCount,
      customGradient,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        data-slot="gradient-container"
        className={cn("relative", className)}
        {...props}
      >
        <GradientBackground
          preset={preset}
          animation={animation}
          opacity={opacity}
          meshOrbs={meshOrbs}
          orbCount={orbCount}
          customGradient={customGradient}
        />
        <div className="relative z-10">{children}</div>
      </div>
    )
  }
)

GradientContainer.displayName = "GradientContainer"

export { GradientBackground, GradientContainer, gradientBackgroundVariants }
