/**
 * Glassmorphism Components - Usage Examples
 *
 * This file demonstrates how to use the glass components in the Mood & Pharma Tracker app.
 * These examples are for reference and can be copied into your actual components.
 */

import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
  GlassCardAction,
} from "./glass-card"

import {
  GlassPanel,
  GlassPanelHeader,
  GlassPanelContent,
  GlassPanelFooter,
} from "./glass-panel"

import {
  GradientBackground,
  GradientContainer,
} from "./gradient-bg"

import { Button } from "./button"

// ============================================================================
// EXAMPLE 1: Basic GlassCard with Default Styling
// ============================================================================
export function BasicGlassCardExample() {
  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle>Mood Entry</GlassCardTitle>
        <GlassCardDescription>
          How are you feeling today?
        </GlassCardDescription>
      </GlassCardHeader>

      <GlassCardContent>
        {/* Your content here */}
        <p>Content goes here...</p>
      </GlassCardContent>

      <GlassCardFooter>
        <Button>Save Entry</Button>
      </GlassCardFooter>
    </GlassCard>
  )
}

// ============================================================================
// EXAMPLE 2: Elevated GlassCard with Medical Glow
// ============================================================================
export function MedicalStatsCardExample() {
  return (
    <GlassCard variant="elevated" glow="medical" gradient>
      <GlassCardHeader>
        <GlassCardTitle>Medication Adherence</GlassCardTitle>
        <GlassCardDescription>
          Last 30 days
        </GlassCardDescription>
        <GlassCardAction>
          <Button variant="ghost" size="sm">View Details</Button>
        </GlassCardAction>
      </GlassCardHeader>

      <GlassCardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Compliance Rate</span>
            <span className="text-2xl font-bold">94%</span>
          </div>
          {/* Add charts, graphs, etc. */}
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}

// ============================================================================
// EXAMPLE 3: Interactive GlassCard (Clickable/Hoverable)
// ============================================================================
export function InteractiveMoodCardExample() {
  return (
    <GlassCard
      variant="interactive"
      glow="mood"
      className="cursor-pointer"
      onClick={() => console.log("Card clicked!")}
    >
      <GlassCardHeader>
        <GlassCardTitle>Today's Mood</GlassCardTitle>
        <GlassCardDescription>
          Tap to view details
        </GlassCardDescription>
      </GlassCardHeader>

      <GlassCardContent>
        <div className="flex items-center gap-4">
          <div className="text-4xl">😊</div>
          <div>
            <p className="text-sm text-neutral-11">Feeling Good</p>
            <p className="text-xs text-neutral-10">Logged 2 hours ago</p>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}

// ============================================================================
// EXAMPLE 4: Subtle GlassCard for Secondary Information
// ============================================================================
export function SubtleInfoCardExample() {
  return (
    <GlassCard variant="subtle">
      <GlassCardContent>
        <p className="text-sm text-neutral-11">
          Remember to take your evening medication at 8:00 PM
        </p>
      </GlassCardContent>
    </GlassCard>
  )
}

// ============================================================================
// EXAMPLE 5: GlassPanel for Navigation Sidebar
// ============================================================================
export function NavigationSidebarExample() {
  return (
    <GlassPanel
      variant="navigation"
      sticky="top"
      gradientBorder
      innerGlow
      className="h-screen w-64"
    >
      <GlassPanelHeader>
        <h2 className="text-lg font-semibold">Navigation</h2>
      </GlassPanelHeader>

      <GlassPanelContent>
        <nav className="space-y-2">
          <a href="#" className="block rounded-lg px-4 py-2 hover:bg-white/20 dark:hover:bg-white/10">
            Dashboard
          </a>
          <a href="#" className="block rounded-lg px-4 py-2 hover:bg-white/20 dark:hover:bg-white/10">
            Mood Tracker
          </a>
          <a href="#" className="block rounded-lg px-4 py-2 hover:bg-white/20 dark:hover:bg-white/10">
            Medications
          </a>
        </nav>
      </GlassPanelContent>

      <GlassPanelFooter>
        <Button variant="ghost" className="w-full">Settings</Button>
      </GlassPanelFooter>
    </GlassPanel>
  )
}

// ============================================================================
// EXAMPLE 6: GlassPanel for Sticky Header
// ============================================================================
export function StickyHeaderExample() {
  return (
    <GlassPanel variant="navigation" sticky="top" rounded="none">
      <GlassPanelContent>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Mood & Pharma Tracker</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">Notifications</Button>
            <Button variant="ghost" size="sm">Profile</Button>
          </div>
        </div>
      </GlassPanelContent>
    </GlassPanel>
  )
}

// ============================================================================
// EXAMPLE 7: GradientBackground with Medical Preset
// ============================================================================
export function MedicalDashboardLayoutExample() {
  return (
    <div className="relative min-h-screen">
      <GradientBackground
        preset="medical"
        animation="slow"
        meshOrbs
        orbCount={3}
      />

      <div className="relative z-10 p-8">
        {/* Your dashboard content */}
        <h1 className="text-3xl font-bold">Medical Dashboard</h1>
        {/* Add your cards and content here */}
      </div>
    </div>
  )
}

// ============================================================================
// EXAMPLE 8: GradientContainer with Mood Preset
// ============================================================================
export function MoodTrackerPageExample() {
  return (
    <GradientContainer
      preset="mood"
      animation="medium"
      meshOrbs
      orbCount={4}
      className="min-h-screen p-8"
    >
      <h1 className="mb-8 text-3xl font-bold">Mood Tracker</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <GlassCard variant="elevated" glow="mood">
          <GlassCardHeader>
            <GlassCardTitle>Current Mood</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p>Content here...</p>
          </GlassCardContent>
        </GlassCard>

        {/* More cards... */}
      </div>
    </GradientContainer>
  )
}

// ============================================================================
// EXAMPLE 9: Cognitive Assessment with Custom Styling
// ============================================================================
export function CognitiveAssessmentExample() {
  return (
    <GradientContainer
      preset="cognitive"
      animation="slow"
      opacity="subtle"
      className="min-h-screen p-8"
    >
      <div className="mx-auto max-w-4xl">
        <GlassCard variant="elevated" glow="cognitive" gradient>
          <GlassCardHeader>
            <GlassCardTitle>Cognitive Assessment</GlassCardTitle>
            <GlassCardDescription>
              Test your memory and focus
            </GlassCardDescription>
          </GlassCardHeader>

          <GlassCardContent>
            <div className="space-y-6">
              {/* Assessment questions */}
              <div className="rounded-lg bg-white/20 p-4 dark:bg-white/5">
                <p className="font-medium">Question 1</p>
                <p className="text-sm text-neutral-11">What is 7 + 8?</p>
              </div>
            </div>
          </GlassCardContent>

          <GlassCardFooter>
            <Button>Submit Assessment</Button>
          </GlassCardFooter>
        </GlassCard>
      </div>
    </GradientContainer>
  )
}

// ============================================================================
// EXAMPLE 10: Analytics Dashboard with Warning Glow
// ============================================================================
export function AnalyticsDashboardExample() {
  return (
    <GradientContainer
      preset="analytics"
      animation="medium"
      meshOrbs
      orbCount={5}
      className="min-h-screen p-8"
    >
      <h1 className="mb-8 text-3xl font-bold">Analytics Overview</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard variant="elevated">
          <GlassCardHeader>
            <GlassCardTitle>Weekly Trends</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            {/* Chart or graph */}
            <p>Chart placeholder...</p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard variant="elevated" glow="warning">
          <GlassCardHeader>
            <GlassCardTitle>Attention Required</GlassCardTitle>
            <GlassCardDescription>
              Missed medication doses
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-sm">You've missed 3 doses this week</p>
          </GlassCardContent>
          <GlassCardFooter>
            <Button variant="destructive">Review Schedule</Button>
          </GlassCardFooter>
        </GlassCard>
      </div>
    </GradientContainer>
  )
}

// ============================================================================
// EXAMPLE 11: Mobile-Optimized Card Grid
// ============================================================================
export function MobileOptimizedGridExample() {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <GlassCard variant="default" mobileOptimized>
        <GlassCardContent>
          <p className="text-sm">
            This card uses reduced blur on mobile for better performance
          </p>
        </GlassCardContent>
      </GlassCard>

      <GlassCard variant="interactive" mobileOptimized glow="medical">
        <GlassCardContent>
          <p className="text-sm">Interactive card with medical glow</p>
        </GlassCardContent>
      </GlassCard>

      <GlassCard variant="elevated" mobileOptimized glow="mood" gradient>
        <GlassCardContent>
          <p className="text-sm">Elevated with gradient overlay</p>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}

// ============================================================================
// EXAMPLE 12: Custom Gradient Background
// ============================================================================
export function CustomGradientExample() {
  return (
    <div className="relative min-h-screen">
      <GradientBackground
        preset="custom"
        customGradient="bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50 dark:from-rose-950/30 dark:via-orange-950/20 dark:to-pink-950/30"
        animation="slow"
        opacity="medium"
        meshOrbs
        orbCount={2}
      />

      <div className="relative z-10 p-8">
        <h1 className="text-3xl font-bold">Custom Styled Page</h1>
      </div>
    </div>
  )
}

// ============================================================================
// EXAMPLE 13: Complete Dashboard Layout
// ============================================================================
export function CompleteDashboardExample() {
  return (
    <div className="relative min-h-screen">
      {/* Background gradient */}
      <GradientBackground
        preset="medical"
        animation="slow"
        meshOrbs
        orbCount={3}
        opacity="medium"
      />

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <GlassPanel
          variant="sidebar"
          sticky="top"
          gradientBorder
          className="hidden h-screen w-64 lg:block"
        >
          <GlassPanelHeader>
            <h2 className="text-lg font-semibold">Menu</h2>
          </GlassPanelHeader>

          <GlassPanelContent>
            <nav className="space-y-2">
              <a href="#" className="block rounded-lg px-4 py-2 font-medium hover:bg-white/20 dark:hover:bg-white/10">
                Dashboard
              </a>
              <a href="#" className="block rounded-lg px-4 py-2 hover:bg-white/20 dark:hover:bg-white/10">
                Mood Tracker
              </a>
              <a href="#" className="block rounded-lg px-4 py-2 hover:bg-white/20 dark:hover:bg-white/10">
                Medications
              </a>
              <a href="#" className="block rounded-lg px-4 py-2 hover:bg-white/20 dark:hover:bg-white/10">
                Analytics
              </a>
            </nav>
          </GlassPanelContent>
        </GlassPanel>

        {/* Main area */}
        <main className="flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="mt-2 text-neutral-11">
              Welcome back! Here's your health overview.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <GlassCard variant="elevated" glow="medical" gradient>
              <GlassCardHeader>
                <GlassCardTitle>Today's Mood</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="text-center">
                  <div className="text-6xl">😊</div>
                  <p className="mt-2 text-sm">Feeling Great</p>
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="elevated" glow="cognitive">
              <GlassCardHeader>
                <GlassCardTitle>Medications</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">3 of 3</p>
                  <p className="text-sm text-neutral-11">Taken today</p>
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="interactive" glow="mood">
              <GlassCardHeader>
                <GlassCardTitle>Quick Actions</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-2">
                  <Button className="w-full" variant="outline">Log Mood</Button>
                  <Button className="w-full" variant="outline">Take Med</Button>
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        </main>
      </div>
    </div>
  )
}

// ============================================================================
// PROP REFERENCE GUIDE
// ============================================================================

/**
 * GlassCard Props:
 *
 * variant?: "default" | "elevated" | "interactive" | "subtle"
 *   - default: Standard glass effect
 *   - elevated: Stronger blur and shadow
 *   - interactive: Hover animations (lift and glow)
 *   - subtle: Lighter, more transparent
 *
 * glow?: "none" | "medical" | "mood" | "cognitive" | "warning"
 *   - Adds colored shadow glow around card
 *
 * gradient?: boolean
 *   - Adds gradient overlay for extra depth
 *
 * mobileOptimized?: boolean (default: true)
 *   - Reduces blur on small screens for performance
 *
 * className?: string
 *   - Additional Tailwind classes
 */

/**
 * GlassPanel Props:
 *
 * variant?: "default" | "navigation" | "sidebar" | "overlay"
 *   - Different styles for different use cases
 *
 * rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl"
 *   - Border radius size
 *
 * sticky?: "none" | "top" | "bottom"
 *   - Sticky positioning
 *
 * gradientBorder?: boolean
 *   - Adds gradient border effect
 *
 * mobileOptimized?: boolean (default: true)
 *   - Performance optimization for mobile
 *
 * innerGlow?: boolean
 *   - Adds subtle inner glow effect
 */

/**
 * GradientBackground Props:
 *
 * preset?: "medical" | "mood" | "cognitive" | "analytics" | "neutral" | "custom"
 *   - Pre-configured gradient color schemes
 *
 * animation?: "none" | "slow" | "medium" | "fast"
 *   - Background animation speed
 *
 * opacity?: "subtle" | "medium" | "strong"
 *   - Overall opacity level
 *
 * meshOrbs?: boolean
 *   - Show animated gradient orbs
 *
 * orbCount?: 1 | 2 | 3 | 4 | 5
 *   - Number of animated orbs
 *
 * customGradient?: string
 *   - Custom Tailwind gradient classes (use with preset="custom")
 */
