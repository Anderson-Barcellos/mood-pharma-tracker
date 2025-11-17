# Glassmorphism Components

Modern glassmorphism-styled components for the Mood & Pharma Tracker application.

## Overview

This package includes three main component families designed with a beautiful frosted glass aesthetic:

1. **GlassCard** - Card components with glass effect
2. **GlassPanel** - Panel/sidebar components with strong glass effect
3. **GradientBackground** - Animated gradient backgrounds with mesh orbs

## Features

- Frosted glass effect with backdrop blur
- Subtle borders and colored glows
- Smooth transitions and hover states
- Mobile-optimized (reduced blur on low-end devices)
- Dark mode support
- TypeScript with full type safety
- Accessible (proper contrast ratios)
- Performance-optimized animations

## Installation

These components are already installed in the project. No additional dependencies required beyond:

- React 19+
- Tailwind CSS 4+
- class-variance-authority (CVA)
- Radix UI (for forwardRef support)

## Quick Start

```tsx
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from "@/shared/ui/glass-card"
import { GradientContainer } from "@/shared/ui/gradient-bg"

function MyComponent() {
  return (
    <GradientContainer preset="medical" meshOrbs orbCount={3}>
      <GlassCard variant="elevated" glow="medical">
        <GlassCardHeader>
          <GlassCardTitle>Hello World</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <p>Your content here</p>
        </GlassCardContent>
      </GlassCard>
    </GradientContainer>
  )
}
```

## Components

### GlassCard

A card component with glassmorphism styling.

#### Variants

- `default` - Subtle glass effect (60% opacity, medium blur)
- `elevated` - Stronger blur and shadow for emphasis
- `interactive` - Hover animations (lift effect, cursor pointer)
- `subtle` - Lighter, more transparent (40% opacity)

#### Glow Colors

- `none` - No colored glow
- `medical` - Blue/cyan glow (for medical-related cards)
- `mood` - Purple/pink glow (for mood tracking)
- `cognitive` - Green/emerald glow (for cognitive features)
- `warning` - Orange/amber glow (for warnings/alerts)

#### Props

```typescript
interface GlassCardProps {
  variant?: "default" | "elevated" | "interactive" | "subtle"
  glow?: "none" | "medical" | "mood" | "cognitive" | "warning"
  gradient?: boolean  // Adds gradient overlay
  mobileOptimized?: boolean  // Default: true
  className?: string
  children?: React.ReactNode
}
```

#### Sub-components

- `GlassCardHeader` - Header section with title and description
- `GlassCardTitle` - Title text
- `GlassCardDescription` - Description text
- `GlassCardAction` - Action button/controls in header
- `GlassCardContent` - Main content area
- `GlassCardFooter` - Footer section (often used for buttons)

#### Example

```tsx
<GlassCard variant="elevated" glow="medical" gradient>
  <GlassCardHeader>
    <GlassCardTitle>Medication Adherence</GlassCardTitle>
    <GlassCardDescription>Last 30 days</GlassCardDescription>
    <GlassCardAction>
      <Button size="sm">View</Button>
    </GlassCardAction>
  </GlassCardHeader>

  <GlassCardContent>
    <p>94% compliance rate</p>
  </GlassCardContent>

  <GlassCardFooter>
    <Button>View Details</Button>
  </GlassCardFooter>
</GlassCard>
```

---

### GlassPanel

Panel component with stronger glass effect, ideal for navigation and sidebars.

#### Variants

- `default` - Standard panel styling
- `navigation` - Optimized for top navigation bars
- `sidebar` - Optimized for side navigation
- `overlay` - For modal overlays and popups

#### Props

```typescript
interface GlassPanelProps {
  variant?: "default" | "navigation" | "sidebar" | "overlay"
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl"
  sticky?: "none" | "top" | "bottom"
  gradientBorder?: boolean
  mobileOptimized?: boolean  // Default: true
  innerGlow?: boolean
  className?: string
  children?: React.ReactNode
}
```

#### Sub-components

- `GlassPanelHeader` - Header with border bottom
- `GlassPanelContent` - Main content area
- `GlassPanelFooter` - Footer with border top

#### Example

```tsx
<GlassPanel
  variant="navigation"
  sticky="top"
  gradientBorder
  innerGlow
>
  <GlassPanelHeader>
    <h2>Navigation</h2>
  </GlassPanelHeader>

  <GlassPanelContent>
    <nav>
      <a href="#">Dashboard</a>
      <a href="#">Mood Tracker</a>
    </nav>
  </GlassPanelContent>
</GlassPanel>
```

---

### GradientBackground

Animated gradient background with optional mesh orbs.

#### Presets

- `medical` - Blue/cyan/indigo gradients
- `mood` - Purple/pink/violet gradients
- `cognitive` - Green/emerald/teal gradients
- `analytics` - Orange/amber/yellow gradients
- `neutral` - Neutral gray gradients
- `custom` - Use with `customGradient` prop

#### Props

```typescript
interface GradientBackgroundProps {
  preset?: "medical" | "mood" | "cognitive" | "analytics" | "neutral" | "custom"
  animation?: "none" | "slow" | "medium" | "fast"
  opacity?: "subtle" | "medium" | "strong"
  meshOrbs?: boolean
  orbCount?: 1 | 2 | 3 | 4 | 5
  customGradient?: string  // Tailwind gradient classes
  className?: string
}
```

#### Example

```tsx
{/* Background only */}
<div className="relative min-h-screen">
  <GradientBackground
    preset="medical"
    animation="slow"
    meshOrbs
    orbCount={3}
  />

  <div className="relative z-10 p-8">
    {/* Your content */}
  </div>
</div>

{/* Or use GradientContainer wrapper */}
<GradientContainer
  preset="mood"
  meshOrbs
  orbCount={4}
  className="min-h-screen p-8"
>
  {/* Your content */}
</GradientContainer>
```

---

## Design Tokens

### Glass Effects

The components use the following design principles:

- **Backdrop blur**: `backdrop-blur-md` to `backdrop-blur-2xl`
- **Background opacity**: 40-90% white (light mode), 30-70% dark (dark mode)
- **Borders**: 1px solid with 5-20% white opacity
- **Shadows**: Soft shadows with optional colored glows
- **Transitions**: 300ms ease for smooth interactions

### Color Glows

Each glow variant uses a specific color palette:

```css
medical: Blue/Cyan (rgba(59, 130, 246, 0.15))
mood: Purple/Pink (rgba(168, 85, 247, 0.15))
cognitive: Green/Emerald (rgba(34, 197, 94, 0.15))
warning: Orange/Amber (rgba(251, 146, 60, 0.15))
```

### Animations

Custom Tailwind animations included:

```javascript
gradient-slow: 15s ease infinite
gradient-medium: 10s ease infinite
gradient-fast: 6s ease infinite
float-slow: 20s ease-in-out infinite
float-medium: 15s ease-in-out infinite
float-fast: 10s ease-in-out infinite
```

---

## Accessibility

All components follow accessibility best practices:

- Proper semantic HTML structure
- ARIA attributes where needed
- Sufficient color contrast ratios (WCAG AA compliant)
- Decorative elements marked with `aria-hidden="true"`
- Keyboard navigation support (inherited from Radix UI)
- Focus visible states

---

## Performance Optimization

### Mobile Optimization

By default, all components use `mobileOptimized={true}`, which:

- Reduces blur intensity on small screens
- Uses `backdrop-blur-lg` on mobile vs `backdrop-blur-2xl` on desktop
- Improves performance on low-end devices

### Animation Performance

- Uses CSS transforms (GPU-accelerated)
- `will-change` optimization for animations
- Reduced motion support (respects `prefers-reduced-motion`)

---

## Best Practices

### When to Use Each Component

**GlassCard:**
- Content cards
- Stats displays
- Form containers
- Info panels

**GlassPanel:**
- Navigation bars
- Sidebars
- Sticky headers
- Modal overlays

**GradientBackground:**
- Page backgrounds
- Section backgrounds
- Hero sections
- Dashboard layouts

### Layering

For best visual results, layer components like this:

1. **Bottom**: GradientBackground
2. **Middle**: GlassPanel (for navigation/sidebars)
3. **Top**: GlassCard (for content)

### Glow Usage

Use glows sparingly for emphasis:
- 1-2 glowing cards per section maximum
- Match glow color to content theme
- Use `glow="none"` for most cards

### Performance Tips

```tsx
// Good: Static backgrounds
<GradientBackground preset="medical" animation="slow" />

// Avoid: Too many animated orbs
<GradientBackground meshOrbs orbCount={5} animation="fast" />

// Good: Selective interactivity
<GlassCard variant="interactive" /> // Only for clickable cards

// Better: Mobile optimization
<GlassCard mobileOptimized /> // Default behavior
```

---

## Dark Mode

All components automatically adapt to dark mode using Tailwind's `dark:` variants:

```tsx
// Works automatically with your theme
<GlassCard variant="elevated" glow="medical" />
```

Dark mode adjustments:
- Lower opacity backgrounds
- Adjusted shadow colors
- Reduced glow intensity
- Proper text contrast

---

## Troubleshooting

### Blur not showing

Ensure your browser supports `backdrop-filter`:
- Chrome/Edge 76+
- Safari 9+
- Firefox 103+

### Performance issues on mobile

Try these optimizations:
1. Reduce blur intensity: use `variant="subtle"`
2. Disable mesh orbs: remove `meshOrbs` prop
3. Use fewer animated cards on one screen
4. Ensure `mobileOptimized={true}` (default)

### Colors not matching design

Check that Tailwind CSS variables are properly configured in your theme:
- Verify CSS custom properties are defined
- Ensure dark mode is configured correctly
- Check color palette in `tailwind.config.js`

---

## Examples

See `/root/CODEX/mood-pharma-tracker/src/shared/ui/glass-components.examples.tsx` for 13 complete examples including:

1. Basic GlassCard
2. Medical stats card with glow
3. Interactive mood card
4. Subtle info card
5. Navigation sidebar
6. Sticky header
7. Medical dashboard layout
8. Mood tracker page
9. Cognitive assessment
10. Analytics dashboard
11. Mobile-optimized grid
12. Custom gradient
13. Complete dashboard layout

---

## API Reference

For complete TypeScript definitions, see:
- `/root/CODEX/mood-pharma-tracker/src/shared/ui/glass-card.tsx`
- `/root/CODEX/mood-pharma-tracker/src/shared/ui/glass-panel.tsx`
- `/root/CODEX/mood-pharma-tracker/src/shared/ui/gradient-bg.tsx`

---

## Credits

Built with:
- React 19
- Tailwind CSS 4
- class-variance-authority
- Radix UI primitives

Design inspired by modern glassmorphism principles and optimized for medical/health tracking applications.
