/**
 * Glass Components Demo Page
 *
 * This page demonstrates all the glassmorphism components.
 * Navigate to /glass-demo to view this page.
 */

import { useState } from "react"
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
  GlassCardAction,
} from "@/shared/ui/glass-card"

import {
  GlassPanel,
  GlassPanelHeader,
  GlassPanelContent,
  GlassPanelFooter,
} from "@/shared/ui/glass-panel"

import {
  GradientBackground,
  GradientContainer,
} from "@/shared/ui/gradient-bg"

import { Button } from "@/shared/ui/button"
import { Card } from "@/shared/ui/card"

type PresetType = "medical" | "mood" | "cognitive" | "analytics" | "neutral"

export default function GlassDemoPage() {
  const [currentPreset, setCurrentPreset] = useState<PresetType>("medical")

  return (
    <div className="relative min-h-screen">
      {/* Animated gradient background */}
      <GradientBackground
        preset={currentPreset}
        animation="slow"
        meshOrbs
        orbCount={3}
        opacity="medium"
      />

      {/* Main content */}
      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Glassmorphism Components</h1>
          <p className="text-lg text-neutral-11">
            Modern glass-styled components for Mood & Pharma Tracker
          </p>
        </div>

        {/* Preset selector */}
        <div className="mb-8">
          <GlassCard variant="subtle">
            <GlassCardContent>
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium">Background Preset:</span>
                {(["medical", "mood", "cognitive", "analytics", "neutral"] as const).map(
                  (preset) => (
                    <Button
                      key={preset}
                      variant={currentPreset === preset ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPreset(preset)}
                    >
                      {preset}
                    </Button>
                  )
                )}
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Section 1: GlassCard Variants */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">GlassCard Variants</h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Default */}
            <GlassCard variant="default">
              <GlassCardHeader>
                <GlassCardTitle>Default</GlassCardTitle>
                <GlassCardDescription>
                  Standard glass effect
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <p className="text-sm text-neutral-11">
                  60% opacity with medium blur
                </p>
              </GlassCardContent>
            </GlassCard>

            {/* Elevated */}
            <GlassCard variant="elevated">
              <GlassCardHeader>
                <GlassCardTitle>Elevated</GlassCardTitle>
                <GlassCardDescription>
                  Stronger blur and shadow
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <p className="text-sm text-neutral-11">
                  70% opacity with strong blur
                </p>
              </GlassCardContent>
            </GlassCard>

            {/* Interactive */}
            <GlassCard variant="interactive">
              <GlassCardHeader>
                <GlassCardTitle>Interactive</GlassCardTitle>
                <GlassCardDescription>
                  Hover to see animation
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <p className="text-sm text-neutral-11">
                  Lift effect on hover
                </p>
              </GlassCardContent>
            </GlassCard>

            {/* Subtle */}
            <GlassCard variant="subtle">
              <GlassCardHeader>
                <GlassCardTitle>Subtle</GlassCardTitle>
                <GlassCardDescription>
                  Lighter and transparent
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <p className="text-sm text-neutral-11">
                  40% opacity with light blur
                </p>
              </GlassCardContent>
            </GlassCard>
          </div>
        </section>

        {/* Section 2: Glow Effects */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">Glow Effects</h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <GlassCard variant="elevated" glow="medical">
              <GlassCardHeader>
                <GlassCardTitle>Medical</GlassCardTitle>
                <GlassCardDescription>Blue/cyan glow</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="flex size-16 items-center justify-center rounded-full bg-blue-500/20 text-2xl">
                  💊
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="elevated" glow="mood">
              <GlassCardHeader>
                <GlassCardTitle>Mood</GlassCardTitle>
                <GlassCardDescription>Purple/pink glow</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="flex size-16 items-center justify-center rounded-full bg-purple-500/20 text-2xl">
                  😊
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="elevated" glow="cognitive">
              <GlassCardHeader>
                <GlassCardTitle>Cognitive</GlassCardTitle>
                <GlassCardDescription>Green/emerald glow</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="flex size-16 items-center justify-center rounded-full bg-green-500/20 text-2xl">
                  🧠
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="elevated" glow="warning">
              <GlassCardHeader>
                <GlassCardTitle>Warning</GlassCardTitle>
                <GlassCardDescription>Orange/amber glow</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="flex size-16 items-center justify-center rounded-full bg-orange-500/20 text-2xl">
                  ⚠️
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        </section>

        {/* Section 3: Complex Cards */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">Complex Card Examples</h2>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Medical Stats */}
            <GlassCard variant="elevated" glow="medical" gradient>
              <GlassCardHeader>
                <GlassCardTitle>Medication Adherence</GlassCardTitle>
                <GlassCardDescription>Last 30 days</GlassCardDescription>
                <GlassCardAction>
                  <Button variant="ghost" size="sm">
                    Details
                  </Button>
                </GlassCardAction>
              </GlassCardHeader>

              <GlassCardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-11">Compliance Rate</span>
                    <span className="text-3xl font-bold">94%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-11">Doses Taken</span>
                    <span className="text-xl font-semibold">56/60</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/20 dark:bg-black/20">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: "94%" }}
                    />
                  </div>
                </div>
              </GlassCardContent>

              <GlassCardFooter>
                <Button size="sm" variant="outline">
                  View Full Report
                </Button>
              </GlassCardFooter>
            </GlassCard>

            {/* Mood Tracker */}
            <GlassCard variant="elevated" glow="mood" gradient>
              <GlassCardHeader>
                <GlassCardTitle>Today's Mood</GlassCardTitle>
                <GlassCardDescription>How are you feeling?</GlassCardDescription>
              </GlassCardHeader>

              <GlassCardContent>
                <div className="grid grid-cols-5 gap-2">
                  {["😢", "😕", "😐", "🙂", "😊"].map((emoji, i) => (
                    <button
                      key={i}
                      className="flex aspect-square items-center justify-center rounded-lg bg-white/20 text-3xl transition-all hover:scale-110 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </GlassCardContent>

              <GlassCardFooter>
                <Button size="sm">Save Mood Entry</Button>
              </GlassCardFooter>
            </GlassCard>
          </div>
        </section>

        {/* Section 4: GlassPanel */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">GlassPanel</h2>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Navigation Panel */}
            <GlassPanel variant="navigation" gradientBorder innerGlow>
              <GlassPanelHeader>
                <h3 className="font-semibold">Navigation Panel</h3>
              </GlassPanelHeader>

              <GlassPanelContent>
                <nav className="space-y-2">
                  <a
                    href="#"
                    className="block rounded-lg px-4 py-2 font-medium hover:bg-white/20 dark:hover:bg-white/10"
                  >
                    Dashboard
                  </a>
                  <a
                    href="#"
                    className="block rounded-lg px-4 py-2 hover:bg-white/20 dark:hover:bg-white/10"
                  >
                    Mood Tracker
                  </a>
                  <a
                    href="#"
                    className="block rounded-lg px-4 py-2 hover:bg-white/20 dark:hover:bg-white/10"
                  >
                    Medications
                  </a>
                  <a
                    href="#"
                    className="block rounded-lg px-4 py-2 hover:bg-white/20 dark:hover:bg-white/10"
                  >
                    Analytics
                  </a>
                </nav>
              </GlassPanelContent>

              <GlassPanelFooter>
                <Button variant="ghost" size="sm" className="w-full">
                  Settings
                </Button>
              </GlassPanelFooter>
            </GlassPanel>

            {/* Sidebar Panel */}
            <GlassPanel variant="sidebar">
              <GlassPanelHeader>
                <h3 className="font-semibold">Recent Activity</h3>
              </GlassPanelHeader>

              <GlassPanelContent>
                <div className="space-y-3">
                  {[
                    { emoji: "💊", text: "Took morning medication", time: "2h ago" },
                    { emoji: "😊", text: "Logged mood entry", time: "4h ago" },
                    { emoji: "🧠", text: "Completed cognitive test", time: "1d ago" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex gap-3 rounded-lg bg-white/10 p-3 dark:bg-white/5"
                    >
                      <div className="text-2xl">{item.emoji}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.text}</p>
                        <p className="text-xs text-neutral-11">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanelContent>
            </GlassPanel>
          </div>
        </section>

        {/* Section 5: Legacy Card with glass prop */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">Legacy Card Component (glass prop)</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <div className="px-6">
                <h3 className="mb-2 font-semibold">Regular Card</h3>
                <p className="text-sm text-neutral-11">
                  This is the standard Card component without glass effect
                </p>
              </div>
            </Card>

            <Card glass>
              <div className="px-6">
                <h3 className="mb-2 font-semibold">Card with glass=true</h3>
                <p className="text-sm text-neutral-11">
                  Same Card component but with glassmorphism enabled via the glass prop
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Section 6: Gradient Presets Comparison */}
        <section>
          <h2 className="mb-4 text-2xl font-bold">All Gradient Presets</h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(["medical", "mood", "cognitive", "analytics", "neutral"] as const).map(
              (preset) => (
                <GlassCard
                  key={preset}
                  variant="elevated"
                  className="cursor-pointer"
                  onClick={() => setCurrentPreset(preset)}
                >
                  <GlassCardHeader>
                    <GlassCardTitle className="capitalize">{preset}</GlassCardTitle>
                    <GlassCardDescription>
                      Click to apply this preset
                    </GlassCardDescription>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <div className="relative h-24 overflow-hidden rounded-lg">
                      <GradientBackground
                        preset={preset}
                        animation="slow"
                        opacity="strong"
                      />
                    </div>
                  </GlassCardContent>
                </GlassCard>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
