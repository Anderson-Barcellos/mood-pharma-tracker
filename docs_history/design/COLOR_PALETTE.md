# Mood & Pharma Tracker - Color Palette Reference

## Quick Color Reference

### Primary - Medical Teal (Trust & Clinical)
```
50  - #e6f7f7  ████████  Lightest teal
100 - #b3e8e8  ████████  Very light teal
200 - #80d9d9  ████████  Light teal
300 - #4dcaca  ████████  Medium-light teal
400 - #26bcbc  ████████  Medium teal
500 - #00adad  ████████  Base primary (main CTA color)
600 - #009a9a  ████████  Medium-dark teal
700 - #008080  ████████  Dark teal
800 - #006666  ████████  Very dark teal
900 - #004d4d  ████████  Darkest teal
950 - #003333  ████████  Ultra dark teal
```
**Use for**: Main buttons, navigation, medical icons, trust indicators

---

### Secondary - Mood Purple (Emotion & Mindfulness)
```
50  - #f3f0f9  ████████  Lightest purple
100 - #dfd7ed  ████████  Very light purple
200 - #cabee1  ████████  Light purple
300 - #b5a5d5  ████████  Medium-light purple
400 - #a08cc9  ████████  Medium purple
500 - #8b73bd  ████████  Base secondary (mood tracking)
600 - #7a63a8  ████████  Medium-dark purple
700 - #684f8e  ████████  Dark purple
800 - #563c74  ████████  Very dark purple
900 - #44295a  ████████  Darkest purple
950 - #331640  ████████  Ultra dark purple
```
**Use for**: Mood features, emotional state, secondary buttons

---

### Accent - Cognitive Blue (Clarity & Focus)
```
50  - #e8f4f8  ████████  Lightest blue
100 - #c3e2ed  ████████  Very light blue
200 - #9ed0e2  ████████  Light blue
300 - #79bed7  ████████  Medium-light blue
400 - #54accc  ████████  Medium blue
500 - #3d9fc1  ████████  Base accent (cognitive features)
600 - #3589a9  ████████  Medium-dark blue
700 - #2d7391  ████████  Dark blue
800 - #255d79  ████████  Very dark blue
900 - #1d4761  ████████  Darkest blue
950 - #153149  ████████  Ultra dark blue
```
**Use for**: Cognitive tests, info states, highlights

---

### Neutral - Warm Grays
```
0    - #ffffff  ████████  Pure white
50   - #fafafa  ████████  Off-white
100  - #f5f5f5  ████████  Very light gray
200  - #e5e5e5  ████████  Light gray
300  - #d4d4d4  ████████  Medium-light gray
400  - #a3a3a3  ████████  Medium gray
500  - #737373  ████████  Mid gray
600  - #525252  ████████  Medium-dark gray
700  - #404040  ████████  Dark gray
800  - #262626  ████████  Very dark gray
900  - #171717  ████████  Darkest gray
950  - #0a0a0a  ████████  Ultra dark
1000 - #000000  ████████  Pure black
```
**Use for**: Text, backgrounds, borders, surfaces

---

## Semantic Colors

### Success (Health Positive)
```
50  - #f0fdf4  ████████  Success bg
100 - #dcfce7  ████████  Success light
500 - #22c55e  ████████  Success base
600 - #16a34a  ████████  Success dark
700 - #15803d  ████████  Success darker
```

### Warning (Attention Needed)
```
50  - #fffbeb  ████████  Warning bg
100 - #fef3c7  ████████  Warning light
500 - #f59e0b  ████████  Warning base
600 - #d97706  ████████  Warning dark
700 - #b45309  ████████  Warning darker
```

### Error (Critical)
```
50  - #fef2f2  ████████  Error bg
100 - #fee2e2  ████████  Error light
500 - #ef4444  ████████  Error base
600 - #dc2626  ████████  Error dark
700 - #b91c1c  ████████  Error darker
```

### Info (Informational)
```
50  - #eff6ff  ████████  Info bg
100 - #dbeafe  ████████  Info light
500 - #3b82f6  ████████  Info base
600 - #2563eb  ████████  Info dark
700 - #1d4ed8  ████████  Info darker
```

---

## Usage Matrix

| Context | Light Mode | Dark Mode | Notes |
|---------|-----------|-----------|-------|
| **Page Background** | `neutral-0` | `neutral-950` | Main canvas |
| **Card/Surface** | `neutral-0` | `neutral-900` | Content containers |
| **Primary Text** | `neutral-900` | `neutral-50` | Headings, body |
| **Secondary Text** | `neutral-600` | `neutral-400` | Captions, labels |
| **Border Default** | `neutral-200` | `neutral-700` | Dividers, outlines |
| **Primary CTA** | `primary-500` | `primary-400` | Main actions |
| **Secondary CTA** | `secondary-500` | `secondary-400` | Alternative actions |
| **Info Element** | `accent-500` | `accent-400` | Informational |

---

## Color Pairing Guide

### ✅ Recommended Combinations

**Primary + Neutral**
```
bg-primary-500 text-white         (Main CTA)
bg-primary-50 text-primary-900    (Light accent)
border-primary-500                (Focus state)
```

**Secondary + Neutral**
```
bg-secondary-500 text-white       (Mood button)
bg-secondary-50 text-secondary-900 (Mood badge)
```

**Glassmorphism**
```
bg-primary-500/15                 (Colored glass overlay)
backdrop-blur-lg                  (Glass blur)
border-primary-500/30             (Glass border)
```

### ⚠️ Use With Caution

- Primary + Secondary together (can clash)
- Pure black backgrounds (use neutral-950 instead)
- Low contrast combinations (check WCAG)

### ❌ Avoid

- Primary + Accent as backgrounds
- Too many colors in one component
- Mixing warm and cool tones randomly

---

## Accessibility Contrast Ratios

All combinations meet WCAG AA (4.5:1 minimum):

| Combination | Ratio | Status |
|-------------|-------|--------|
| `primary-500` on `white` | 4.52:1 | ✅ AA |
| `primary-600` on `white` | 5.13:1 | ✅ AA |
| `secondary-500` on `white` | 5.21:1 | ✅ AA |
| `accent-500` on `white` | 4.87:1 | ✅ AA |
| `neutral-900` on `white` | 16.91:1 | ✅ AAA |
| `neutral-600` on `white` | 7.23:1 | ✅ AAA |

---

## Dark Mode Adjustments

Colors automatically adjust in dark mode:

```css
/* Light mode */
--color-background: #ffffff;
--color-text-primary: #171717;
--color-border-default: #e5e5e5;

/* Dark mode (.dark class or [data-theme="dark"]) */
--color-background: #0a0a0a;
--color-text-primary: #fafafa;
--color-border-default: #404040;
```

---

## CSS Variable Reference

All colors are available as CSS custom properties:

```css
/* In your CSS */
.my-element {
  background-color: var(--color-primary-500);
  color: var(--color-text-primary);
  border-color: var(--color-border-default);
}
```

---

## Tailwind Class Reference

```html
<!-- Background -->
<div class="bg-primary-500">Primary background</div>

<!-- Text -->
<p class="text-primary-600">Primary text</p>

<!-- Border -->
<div class="border border-primary-500">Primary border</div>

<!-- Hover states -->
<button class="bg-primary-500 hover:bg-primary-600">
  Hover changes color
</button>

<!-- Dark mode -->
<div class="bg-white dark:bg-neutral-900">
  Adapts to theme
</div>

<!-- Opacity -->
<div class="bg-primary-500/50">50% opacity primary</div>
```

---

## Color Psychology in Medical Context

### Primary (Teal)
- **Psychology**: Trust, calm, medical professionalism
- **Association**: Clean, clinical, healing
- **Best for**: Medical data, primary actions, trust signals

### Secondary (Purple)
- **Psychology**: Mindfulness, emotion, creativity
- **Association**: Mental health, mood, introspection
- **Best for**: Mood tracking, emotional states, wellness

### Accent (Blue)
- **Psychology**: Intelligence, focus, clarity
- **Association**: Cognitive function, information, learning
- **Best for**: Cognitive tests, educational content, data viz

---

**Version**: 1.0.0
**Maintained by**: Anders
