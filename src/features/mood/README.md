# Enhanced Mood Tracking Components

Modern, touch-friendly mood tracking components with glassmorphism design, haptic feedback, and smooth animations.

## Components

### 1. QuickMoodButton

Floating action button for quick mood logging with dynamic emoji based on the last entry.

**Features:**
- Dynamic emoji that reflects last mood entry
- Mobile: FAB (bottom-right) with drawer
- Desktop: Regular button with dialog
- Haptic feedback on interactions
- Touch-friendly 48px minimum targets
- Auto-save on slider release

**Usage:**
```tsx
import QuickMoodButton from '@/features/mood/components/QuickMoodButton';

function MoodPage() {
  return (
    <div>
      {/* Other content */}

      {/* Mobile: Shows as FAB, Desktop: Shows as button */}
      <QuickMoodButton />
    </div>
  );
}
```

**Props:**
None - fully self-contained with internal state management

---

### 2. MoodHistory

Timeline view with entries grouped by day, featuring inline editing and swipe-to-delete.

**Features:**
- Group entries by day with date headers (Hoje, Ontem, etc.)
- Inline editing - click edit icon to modify entry
- Swipe-to-delete on mobile (drag left)
- Delete confirmation overlay
- Search by notes content
- Time filters (All, Today, Week, Month)
- Gradient cards based on mood score
- Shows additional metrics (anxiety, energy, focus)

**Usage:**
```tsx
import MoodHistory from '@/features/mood/components/MoodHistory';

function MoodPage() {
  return (
    <div>
      <MoodHistory />
    </div>
  );
}
```

**Gestures:**
- **Swipe left** on card: Reveal delete action
- **Click edit icon**: Enter inline editing mode
- **Click delete icon**: Show confirmation overlay

**Props:**
None - uses `useMoodEntries` hook internally

---

### 3. MoodTrends

7-day trend visualization widget with bar chart and statistics.

**Features:**
- Mini bar chart for last 7 days
- Dynamic bar colors based on mood
- Trend indicator (up/down/stable)
- Average mood score with emoji
- Mood range categorization
- Entry count statistics
- Empty state handling
- Touch-friendly bars with tooltips

**Usage:**
```tsx
import MoodTrends from '@/features/mood/components/MoodTrends';

function Dashboard() {
  return (
    <div className="grid gap-6">
      <MoodTrends />
      {/* Other widgets */}
    </div>
  );
}
```

**Mood Ranges:**
- 0-2: Crítico (red)
- 3-5: Ruim/Neutro (orange/amber)
- 6-7: Bom (amber/emerald)
- 8-9: Muito Bom (emerald)
- 10: Excelente (green)

**Props:**
None - uses `useMoodEntries` hook internally

---

### 4. EnhancedMoodPage (Example Integration)

Complete mood tracking page demonstrating all components working together.

**Usage:**
```tsx
import EnhancedMoodPage from '@/features/mood/pages/EnhancedMoodPage';

// In your router
<Route path="/mood" element={<EnhancedMoodPage />} />
```

**Layout:**
- Desktop: QuickMoodButton in header, trends + history in columns
- Mobile: Trends + history stack vertically, QuickMoodButton as FAB

---

## Hooks

### useHaptic()

Provides haptic feedback for mobile devices using the Vibration API.

**API:**
```tsx
const haptic = useHaptic();

// Light tap (button press)
haptic.impact('light');

// Medium tap (important action)
haptic.impact('medium');

// Heavy tap (destructive action)
haptic.impact('heavy');

// Success notification
haptic.notification('success');

// Error notification
haptic.notification('error');

// Selection change (slider)
haptic.selection();

// Check if supported
if (haptic.isSupported) {
  // Enable haptic features
}
```

**Impact Styles:**
- `light`: Soft tap (10ms) - button presses, minor interactions
- `medium`: Normal tap (20ms) - confirmations, selections
- `heavy`: Strong tap (30ms) - important actions, destructive operations
- `rigid`: Double tap (15ms + 15ms) - toggle switches
- `soft`: Gentle pulse (5ms + 5ms) - subtle feedback

**Notification Styles:**
- `success`: Double tap pattern - successful operations
- `warning`: Triple tap pattern - warnings, cautions
- `error`: Strong double tap - errors, failures

**Example Integration:**
```tsx
import { useHaptic } from '@/hooks/use-haptic';

function MyButton() {
  const haptic = useHaptic();

  const handleClick = async () => {
    haptic.impact('medium');

    try {
      await saveData();
      haptic.notification('success');
      toast.success('Saved!');
    } catch (error) {
      haptic.notification('error');
      toast.error('Failed!');
    }
  };

  return <button onClick={handleClick}>Save</button>;
}
```

---

## Design System

### Glassmorphism Theme

All components use a glassmorphism design with:
- Backdrop blur effects
- Gradient backgrounds based on mood
- Smooth transitions and animations
- Consistent spacing and shadows

### Color Mapping

Mood scores map to colors:
- 9-10: Green (`bg-green-500`)
- 7-8: Emerald (`bg-emerald-500`)
- 5-6: Amber (`bg-amber-500`)
- 3-4: Orange (`bg-orange-500`)
- 0-2: Red (`bg-red-500`)

### Animations

Using Framer Motion:
- Card entrance: `scale: 0.95 → 1`
- Card exit: `scale: 1 → 0.95, x: -300`
- Swipe gestures: `dragConstraints={{ left: -150, right: 0 }}`
- Bar chart: Staggered animation with 50ms delay between bars

---

## Mobile Optimizations

### Touch Targets

All interactive elements meet minimum 48px touch target size:
- Buttons: `min-h-[48px]`
- Edit/Delete icons: `h-10 w-10` (40px + padding)
- FAB: `w-14 h-14` (56px)

### Responsive Breakpoints

- Mobile: `< 768px`
- Desktop: `≥ 768px`

Components automatically adapt:
- Mobile: Drawer for forms, FAB for quick actions
- Desktop: Dialog for forms, inline button

### Haptic Feedback

Integrated throughout:
- Slider changes: Light impact
- Button presses: Light/Medium impact
- Delete confirmation: Medium impact
- Save success: Success notification
- Error states: Error notification

---

## Data Structure

Components expect the following `MoodEntry` type:

```typescript
interface MoodEntry {
  id: string;
  timestamp: number;
  moodScore: number;          // 0-10
  anxietyLevel?: number;      // 0-10 (optional)
  energyLevel?: number;       // 0-10 (optional)
  focusLevel?: number;        // 0-10 (optional)
  notes?: string;             // Optional text
  createdAt: number;
}
```

---

## Dependencies

Required packages (already in package.json):
- `framer-motion` - Animations and gestures
- `date-fns` - Date formatting and manipulation
- `@phosphor-icons/react` - Icon library
- `vaul` - Drawer component
- `sonner` - Toast notifications
- `@radix-ui/*` - UI primitives

---

## Performance Considerations

### Optimizations

1. **useMemo** for expensive calculations (filtering, grouping)
2. **useCallback** for event handlers to prevent re-renders
3. **AnimatePresence** with `mode="popLayout"` for smooth list animations
4. **Lazy loading** with React.Suspense in EnhancedMoodPage
5. **Debounced search** (handled by input controlled state)

### Bundle Size

Component bundle sizes (estimated):
- QuickMoodButton: ~3KB (gzipped)
- MoodHistory: ~5KB (gzipped)
- MoodTrends: ~4KB (gzipped)
- useHaptic: ~1KB (gzipped)

Total: ~13KB additional bundle size

---

## Customization

### Theming

Components use CSS variables from your theme:
- `--primary`: Main accent color
- `--card`: Card background
- `--muted-foreground`: Secondary text
- `--destructive`: Delete/error color

### Overriding Styles

Use className prop or extend with Tailwind:

```tsx
<MoodTrends className="shadow-2xl" />
```

### Custom Haptic Patterns

Modify patterns in `use-haptic.ts`:

```typescript
const HAPTIC_PATTERNS = {
  custom: [10, 20, 10, 20, 30], // Your pattern
  // ...
};
```

---

## Accessibility

### Keyboard Navigation

- All buttons are keyboard accessible
- Focus indicators on interactive elements
- Logical tab order

### Screen Readers

- Semantic HTML (button, dialog, etc.)
- ARIA labels on icon-only buttons
- Descriptive error messages

### Color Contrast

All text meets WCAG AA standards:
- Primary text: 7:1 contrast ratio
- Secondary text: 4.5:1 contrast ratio

---

## Browser Support

### Desktop
- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+

### Mobile
- iOS Safari: 14+
- Chrome Android: 90+
- Samsung Internet: 14+

### Haptic Feedback Support

- iOS: All devices with Taptic Engine
- Android: Devices with vibration motor
- Desktop: Not supported (gracefully degrades)

---

## Troubleshooting

### Haptic not working

Check:
1. Device has vibration capability
2. Vibration not disabled in system settings
3. Browser supports Vibration API

### Swipe gestures not smooth

Ensure:
1. No conflicting touch event handlers
2. Parent doesn't have `touch-action: none`
3. Framer Motion is properly installed

### Cards not animating

Verify:
1. AnimatePresence wraps the list
2. Unique `key` prop on each card
3. No CSS `overflow: hidden` on parent

---

## License

MIT
