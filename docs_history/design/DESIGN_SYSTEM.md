# Mood & Pharma Tracker - Design System

## Overview

Este design system foi criado especificamente para o **Mood & Pharma Tracker**, com foco em estética médica profissional combinada com modernos efeitos de glassmorphism. O sistema é totalmente responsivo, acessível (WCAG AA) e otimizado para dark mode.

## Filosofia de Design

### Princípios

1. **Medical Trust**: Cores e tipografia que transmitem profissionalismo clínico
2. **Emotional Wellness**: Paleta que equilibra calma e energia
3. **Cognitive Clarity**: Hierarquia visual clara para rastreamento de dados médicos
4. **Modern Glassmorphism**: Efeitos de vidro fosco para interfaces modernas
5. **Accessibility First**: WCAG AA compliance em todos os componentes

---

## Color Palette

### Triadic Color Scheme

Nosso esquema de cores triádico foi cuidadosamente escolhido para representar três pilares do app:

#### Primary - Medical Teal (Trust & Calm)
```css
--color-primary-50: #e6f7f7;   /* Lightest */
--color-primary-500: #00adad;  /* Base */
--color-primary-900: #004d4d;  /* Darkest */
```
**Usage**: Primary CTAs, navigation highlights, medical icons, trust indicators

#### Secondary - Mood Purple (Emotion & Tracking)
```css
--color-secondary-50: #f3f0f9;
--color-secondary-500: #8b73bd; /* Base */
--color-secondary-900: #44295a;
```
**Usage**: Mood tracking features, emotional state indicators, secondary buttons

#### Accent - Cognitive Blue (Clarity & Focus)
```css
--color-accent-50: #e8f4f8;
--color-accent-500: #3d9fc1;   /* Base */
--color-accent-900: #1d4761;
```
**Usage**: Cognitive test features, focus states, informational elements

### Neutral Colors

Warm grays with subtle blue tint for professional medical aesthetics:

```css
--color-neutral-0: #ffffff;    /* Pure white */
--color-neutral-100: #f5f5f5;  /* Background secondary */
--color-neutral-500: #737373;  /* Mid gray */
--color-neutral-900: #171717;  /* Dark (for text) */
--color-neutral-1000: #000000; /* Pure black */
```

### Semantic Colors

```css
/* Success */
--color-success-500: #22c55e;   /* Green - health positive */

/* Warning */
--color-warning-500: #f59e0b;   /* Amber - attention needed */

/* Error */
--color-error-500: #ef4444;     /* Red - critical alerts */

/* Info */
--color-info-500: #3b82f6;      /* Blue - informational */
```

---

## Typography

### Font Stack

```css
--font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
--font-display: 'Poppins', 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
```

### Type Scale

| Size | Pixels | Usage |
|------|--------|-------|
| `text-xs` | 12px | Captions, labels |
| `text-sm` | 14px | Body small, secondary text |
| `text-base` | 16px | Body text (default) |
| `text-lg` | 18px | Emphasized body |
| `text-xl` | 20px | Subheadings |
| `text-2xl` | 24px | Section headers |
| `text-3xl` | 30px | Page titles |
| `text-4xl` | 36px | Hero headings |
| `text-5xl` | 48px | Large displays |
| `text-6xl` | 60px | Extra large displays |

### Font Weights

```css
font-weight-light: 300;      /* Subtle text */
font-weight-normal: 400;     /* Body text */
font-weight-medium: 500;     /* Emphasized */
font-weight-semibold: 600;   /* Headings */
font-weight-bold: 700;       /* Strong emphasis */
```

---

## Spacing System

Based on 8px grid for consistent rhythm:

```css
spacing-1: 4px;    /* 0.25rem */
spacing-2: 8px;    /* 0.5rem */
spacing-3: 12px;   /* 0.75rem */
spacing-4: 16px;   /* 1rem */
spacing-6: 24px;   /* 1.5rem */
spacing-8: 32px;   /* 2rem */
spacing-12: 48px;  /* 3rem */
spacing-16: 64px;  /* 4rem */
```

**Usage Guidelines**:
- Tight spacing (1-2): Related elements within a component
- Medium spacing (3-4): Between UI elements
- Large spacing (6-8): Between sections
- XL spacing (12-16): Page margins, major sections

---

## Border Radius

Medical-grade rounded corners for approachable aesthetics:

```css
radius-sm: 4px;     /* Subtle - inputs, tags */
radius-base: 8px;   /* Default - buttons, cards */
radius-md: 12px;    /* Medium - panels */
radius-lg: 16px;    /* Large - modals */
radius-xl: 20px;    /* XL - hero cards */
radius-2xl: 24px;   /* XXL - feature sections */
radius-full: 9999px; /* Circular - avatars, pills */
```

---

## Shadows

### Glass Shadows (Subtle depth for glassmorphism)

```css
shadow-glass-sm: 0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
shadow-glass-base: 0 4px 16px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.08);
shadow-glass-md: 0 8px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.1);
shadow-glass-lg: 0 16px 48px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.12);
```

### Colored Shadows (Brand emphasis)

```css
shadow-primary: 0 8px 24px rgba(0,173,173,0.2), 0 4px 8px rgba(0,173,173,0.1);
shadow-secondary: 0 8px 24px rgba(139,115,189,0.2);
shadow-accent: 0 8px 24px rgba(61,159,193,0.2);
```

---

## Glassmorphism

### CSS Classes

Pre-built glass effect classes available:

```css
.glass-card          /* Standard card with blur */
.glass-card-subtle   /* Lighter glass effect */
.glass-card-strong   /* More pronounced effect */
.glass-primary       /* Teal tinted glass */
.glass-secondary     /* Purple tinted glass */
.glass-accent        /* Blue tinted glass */
```

### Tailwind Utilities

```html
<!-- Glass card example -->
<div class="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-glass-md">
  Glass content
</div>

<!-- Colored glass -->
<div class="bg-primary-500/15 backdrop-blur-base border border-primary-500/30">
  Primary glass
</div>
```

### Blur Values

```css
blur-sm: 4px;
blur-base: 8px;
blur-md: 12px;
blur-lg: 16px;
blur-xl: 24px;
blur-2xl: 40px;
```

---

## Animations

### Keyframes

All animations use smooth, clinical timing functions:

```css
/* Fade */
animate-fade-in      /* 250ms fade in */
animate-fade-out     /* 250ms fade out */

/* Slide */
animate-slide-up     /* Slide from bottom */
animate-slide-down   /* Slide from top */
animate-slide-left   /* Slide from right */
animate-slide-right  /* Slide from left */

/* Scale */
animate-scale-up     /* Scale up entrance */

/* Utility */
animate-pulse-slow   /* 2s pulse */
animate-shimmer      /* Loading shimmer */
animate-glass-morph  /* Glass effect entrance */
```

### Timing Functions

```css
ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);   /* Default smooth */
ease-clinical: cubic-bezier(0.25, 0.46, 0.45, 0.94); /* Professional */
ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);      /* Playful bounce */
```

### Duration Scale

```css
transition-fast: 150ms;    /* Quick interactions */
transition-base: 250ms;    /* Default (recommended) */
transition-slow: 350ms;    /* Deliberate */
transition-slower: 500ms;  /* Dramatic */
```

---

## Z-Index Scale

Predictable layering system:

```css
z-base: 0;              /* Default layer */
z-dropdown: 1000;       /* Dropdown menus */
z-sticky: 1100;         /* Sticky headers */
z-fixed: 1200;          /* Fixed navigation */
z-modal-backdrop: 1300; /* Modal overlay */
z-modal: 1400;          /* Modal content */
z-popover: 1500;        /* Popovers/tooltips */
z-tooltip: 1600;        /* Tooltips */
z-toast: 1700;          /* Toast notifications */
```

---

## Dark Mode

### Implementation

Dark mode is supported via multiple selectors:

```css
.dark { /* ... */ }
[data-theme="dark"] { /* ... */ }
[data-appearance="dark"] { /* ... */ }
```

### Color Adjustments

Dark mode uses deep blue-gray backgrounds instead of pure black for reduced eye strain:

```css
/* Light mode */
--color-background: #ffffff;
--color-text-primary: #171717;

/* Dark mode */
--color-background: #0a0a0a;    /* Warm dark */
--color-text-primary: #fafafa;   /* Soft white */
```

---

## Usage Examples

### Button Component

```tsx
// Primary CTA
<button className="
  bg-primary-500 hover:bg-primary-600
  text-white font-medium
  px-6 py-3 rounded-lg
  shadow-primary
  transition-all duration-base ease-smooth
  focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
">
  Save Changes
</button>

// Glass button
<button className="glass-button px-6 py-3 rounded-lg">
  Secondary Action
</button>
```

### Card Component

```tsx
// Standard card
<div className="
  bg-white dark:bg-neutral-900
  rounded-xl shadow-glass-md
  p-6 border border-neutral-200 dark:border-neutral-700
  transition-all duration-base
  hover:shadow-glass-lg
">
  Card content
</div>

// Glass card with color
<div className="glass-primary rounded-xl p-6">
  Branded glass card
</div>
```

### Input Component

```tsx
<input className="
  w-full px-4 py-3
  bg-white dark:bg-neutral-800
  border border-neutral-300 dark:border-neutral-600
  rounded-lg
  text-base text-neutral-900 dark:text-neutral-50
  placeholder:text-neutral-500
  focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
  transition-all duration-fast
" />
```

### Modal with Glassmorphism

```tsx
<div className="fixed inset-0 z-modal-backdrop glass-overlay">
  <div className="glass-modal max-w-lg mx-auto my-20 p-8 rounded-2xl">
    <h2 className="text-2xl font-semibold mb-4">Modal Title</h2>
    <p className="text-neutral-600 dark:text-neutral-400">
      Modal content
    </p>
  </div>
</div>
```

---

## Accessibility

### WCAG AA Compliance

- All color combinations meet 4.5:1 contrast ratio minimum
- Focus states clearly visible with `focus-ring` utility
- Dark mode maintains contrast ratios
- Motion respects `prefers-reduced-motion`

### Focus Management

```tsx
// Visible focus ring
<button className="focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
  Click me
</button>

// Custom focus with glass effect
<div className="focus-visible:glass-primary focus-visible:outline-none">
  Interactive element
</div>
```

### Screen Reader Support

```tsx
// Hide visually but keep for screen readers
<span className="sr-only">Loading...</span>

// Skip to main content
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

---

## Responsive Design

### Breakpoints

```css
xs: 375px;   /* Mobile small */
sm: 640px;   /* Mobile */
md: 768px;   /* Tablet */
lg: 1024px;  /* Desktop */
xl: 1280px;  /* Desktop large */
2xl: 1536px; /* Desktop XL */
```

### Mobile-First Approach

```tsx
<div className="
  p-4 md:p-6 lg:p-8
  text-base md:text-lg
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
">
  Responsive content
</div>
```

### Safe Areas (iOS Notch)

```tsx
<div className="safe-top safe-bottom">
  Content respects device safe areas
</div>
```

---

## Performance Optimizations

### Glassmorphism Mobile Performance

On mobile devices, blur values are automatically reduced for better performance:

```css
@media (max-width: 768px) {
  .glass-card {
    backdrop-filter: blur(12px) saturate(150%);
  }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## File Structure

```
src/
├── shared/
│   └── styles/
│       ├── design-tokens.css      # CSS custom properties
│       ├── design-tokens.ts       # TypeScript constants
│       └── glassmorphism.css      # Glass effect classes
├── index.css                      # Global styles + imports
└── styles/
    └── theme.css                  # Radix UI theme integration
```

---

## Migration Guide

### From Existing Code

Replace hardcoded colors:
```tsx
// Before
<div className="bg-blue-500">

// After
<div className="bg-primary-500">
```

Use semantic tokens:
```tsx
// Before
<div className="bg-white dark:bg-gray-900">

// After
<div className="bg-background">
```

Apply glass effects:
```tsx
// Before
<div className="bg-white/80 backdrop-blur-md">

// After
<div className="glass-card">
```

---

## Best Practices

### Color Usage

✅ **DO**:
- Use primary for main CTAs and navigation
- Use secondary for mood tracking features
- Use accent for cognitive/informational elements
- Use semantic colors (success/warning/error) appropriately

❌ **DON'T**:
- Mix primary/secondary/accent on the same element
- Use destructive color for non-error states
- Ignore dark mode color variants

### Spacing

✅ **DO**:
- Follow 8px grid system
- Use consistent spacing within component families
- Leave breathing room around interactive elements

❌ **DON'T**:
- Use arbitrary spacing values
- Cram elements together
- Ignore touch target sizes (min 44x44px)

### Glassmorphism

✅ **DO**:
- Layer glass elements over colored/gradient backgrounds
- Use subtle glass for frequent UI elements
- Use stronger glass for modals and emphasis

❌ **DON'T**:
- Stack multiple glass layers
- Use glass on plain white backgrounds
- Overuse intense blur (performance)

---

## Resources

- **Tailwind Config**: `/tailwind.config.js`
- **Design Tokens (CSS)**: `/src/shared/styles/design-tokens.css`
- **Design Tokens (TS)**: `/src/shared/styles/design-tokens.ts`
- **Glassmorphism**: `/src/shared/styles/glassmorphism.css`
- **Global Styles**: `/src/index.css`

---

## Support

For questions or contributions to the design system, please create an issue in the repository.

**Version**: 1.0.0
**Last Updated**: 2025-10-20
**Maintained by**: Anders (Anderson)
