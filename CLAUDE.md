# Mood & Pharma Tracker - Project Context

## 📋 Project Overview

Personal health tracking PWA for monitoring medication adherence, mood patterns, and cognitive performance with pharmacokinetic modeling and correlation analysis.

**Stack:** React 19 + TypeScript + Vite + Express API + Radix UI + Tailwind CSS v4

---

## 🎯 Core Features

### 1. Medication Tracking
- Pharmacokinetic modeling (half-life, bioavailability, volume of distribution)
- Real-time concentration calculations
- Multiple medication support with dose logging

### 2. Mood Monitoring

- Extended metrics: anxiety, energy, focus, cognitive clarity, attention shift
- Unified form component across all entry points
- Time-series visualization

### 3. Cognitive Testing
- AI-generated Raven's matrices (Gemini 2.0 Flash)
- Pattern recognition assessment
- Response time tracking

### 4. Health Data Integration
- Samsung Health CSV import (heart rate)
- Correlation analysis: HR ↔ Medications ↔ Mood
- Context-aware classification (sleep/exercise/stress/resting)

### 5. Advanced Analytics
- Correlation matrices with statistical significance
- Multi-metric correlations (mood, anxiety, energy, focus, cognition vs medications)
- Temporal lag analysis
- Pharmacokinetic concentration charting
- **Correlations use ALL available data** (not limited by timeframe)

### 6. Temporal Adherence Tracking
- Scheduled medication times (`scheduledTime` field)
- Adherence score calculation (0-100%)
- Deviation analysis: on-time, late, early doses
- Pattern detection: consistent, variable, irregular
- Correlation between timing deviations and mood

---

## 🏗️ Architecture

### Feature-Based Structure
```
src/
├── features/
│   ├── analytics/        # Correlations, charts, insights
│   ├── cognitive/        # Raven's matrices tests
│   ├── doses/            # Medication dose logging
│   ├── health-data/      # Samsung Health integration
│   │   ├── core/         # Types, parsers, engines
│   │   ├── heart-rate/   # HR-specific processing
│   │   ├── services/     # HeartRateProcessor
│   │   └── utils/        # csv-parser.ts (shared)
│   ├── medications/      # Medication CRUD
│   └── mood/             # Mood entry logging
├── shared/
│   ├── components/       # Reusable UI components
│   ├── hooks/            # use-mobile, use-haptic
│   ├── layouts/          # AppLayout, PWA shell
│   ├── types.ts          # Core types (Medication, MoodEntry, etc.)
│   └── ui/               # Design system (Radix + Tailwind)
└── core/
    └── auth/             # Firebase authentication
```

### Data Layer
- **API Backend:** Express server (`api/save-data.js`) on port 8113
- **Storage:** JSON file (`public/data/app-data.json`)
- **Sync:** All devices share same data via API (no Firebase needed)
- **Architecture:**
  ```
  Browser → Apache (proxy) → Vite (8112) + API (8113) → app-data.json
  ```

### Systemd Services
```bash
# Frontend (Vite)
sudo systemctl status mood-pharma-tracker    # port 8112

# Backend (API)
sudo systemctl status mood-pharma-api        # port 8113

# Restart after code changes
sudo systemctl restart mood-pharma-tracker
```

---

## 🔧 Coding Conventions

### TypeScript

#### Type Definitions
```typescript
// ✅ Use shared base types
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';
import type { HeartRateRecord } from '@/features/health-data/core/types';

// ✅ Extend base types when needed
export interface HeartRateRecord extends BaseHealthRecord {
  type: 'heart-rate';
  heartRate: number;
  context?: 'resting' | 'exercise' | 'sleep' | 'stress';
}

// ❌ Don't create duplicate interfaces
```

#### Optional Fields
```typescript
// ✅ Handle undefined with nullish coalescing
const avg = entries.reduce((sum, e) => sum + (e.anxietyLevel ?? 0), 0);

// ❌ Don't assume optional fields exist
const avg = entries.reduce((sum, e) => sum + e.anxietyLevel, 0); // Error!
```

#### Imports
```typescript
// ✅ Use path aliases
import { Button } from '@/shared/ui/button';
import { useDoses } from '@/hooks/use-doses';

// ❌ Avoid relative imports for shared code
import { Button } from '../../../shared/ui/button';
```

### Health Data Processing

#### Heart Rate Validation
```typescript
// ✅ Physiologically valid range
const isValidHR = (hr: number) => hr >= 30 && hr <= 220;

// ❌ Too permissive
const isValidHR = (hr: number) => hr > 0 && hr < 300;
```

#### Context Inference Logic
```typescript
const inferContext = (heartRate: number, hour: number): HeartRateRecord['context'] => {
  if ((hour >= 22 || hour <= 6) && heartRate < 70) return 'sleep';
  if (heartRate > 120) return 'exercise';
  if (heartRate > 100 || heartRate < 50) return 'stress';
  return 'resting';
};
```

#### CSV Parsing
```typescript
// ✅ Use shared csv-parser utility
import { parseSamsungHealthHeartRateCSV } from '@/features/health-data/utils/csv-parser';

const records = parseSamsungHealthHeartRateCSV(csvContent, {
  fileName: file.name,
  validateHR: (hr) => hr >= 30 && hr <= 220,
  inferContext: true
});

// ❌ Don't duplicate parsing logic
```

### React Components

#### Component Structure
```typescript
// ✅ Export as default for pages/views
export default function Dashboard({ medications, doses }: DashboardProps) {
  // ...
}

// ✅ Named exports for utilities/helpers
export function calculateCorrelation(x: number[], y: number[]) {
  // ...
}
```

#### Hooks
```typescript
// ✅ Use shared hooks from /shared/hooks
import { useIsMobile } from '@/shared/hooks/use-mobile';

// ❌ Don't duplicate hooks in feature folders
```

### UI/UX

#### GlassCard Variants
```typescript
// ✅ Valid variants
<GlassCard variant="default" />
<GlassCard variant="elevated" />
<GlassCard variant="interactive" />
<GlassCard variant="subtle" />

// ❌ Invalid
<GlassCard variant="flat" /> // Does not exist!
```

#### Recharts Custom Dots
```typescript
// ✅ Return empty fragment, not null
const renderDot = (props: any) => {
  if (!condition) return <></>;
  return <Dot {...props} />;
};

// ❌ Causes TypeScript errors
const renderDot = (props: any) => {
  if (!condition) return null; // Error!
  return <Dot {...props} />;
};
```

#### Recharts Unified Dataset (for tooltip everywhere)
```typescript
// ✅ Single dataset with mood entries at real timestamps
const data: ChartDataPoint[] = [];
for (let i = 0; i <= totalPoints; i++) {
  data.push({ timestamp, concentration, mood: null, ... });
}
for (const mood of moodEntries) {
  data.push({ timestamp: mood.timestamp, mood: mood.moodScore, ... });
}
data.sort((a, b) => a.timestamp - b.timestamp);

// ❌ Separate datasets = tooltip only on mood points
const concentrationData = [...];
const moodData = [...]; // Tooltip won't work on concentration line!
```

### React 19 + Radix UI
```typescript
// ✅ Required in main.tsx for Radix components
import { DirectionProvider } from '@radix-ui/react-direction';

<DirectionProvider dir="ltr">
  <App />
</DirectionProvider>

// ❌ Without this, useContext errors in Tabs, Select, etc.
```

---

## 🧪 Development Workflow

### Build & Type Check
```bash
# TypeScript check (should have ≤7 errors in test files)
npx tsc --noEmit

# Production build (should pass in ~18s)
npm run build

# Development server
npm run dev
```

### Testing Changes
1. **Always run TypeScript check first:** `npx tsc --noEmit`
2. **Test build:** `npm run build`
3. **Manual testing:** Test in browser, especially PWA features
4. **Check console:** No errors or warnings

### Adding New Features
1. Place in appropriate `/features` folder
2. Use shared types from `/shared/types.ts`
3. Create feature-specific types in `[feature]/types.ts` if needed
4. Import shared utilities (csv-parser, hooks, etc.)
5. Update Dashboard/Navigation if user-facing

---

## 📊 Data Models

### Medication
```typescript
interface Medication {
  id: string;
  name: string;
  genericName?: string;
  halfLife: number;              // hours
  volumeOfDistribution: number;  // L/kg
  bioavailability: number;       // 0-1
  absorptionRate: number;        // 1/hours
  therapeuticRange?: { min: number; max: number; unit: string };
  scheduledTime?: string;        // Default time to take (HH:mm format, e.g., "09:00")
  scheduledDays?: ('mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun')[]; // Days to take
  color?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

### MoodEntry
```typescript
interface MoodEntry {
  id: string;
  timestamp: number;
  moodScore: number;        // 1-10 (required)
  anxietyLevel?: number;    // 1-10
  energyLevel?: number;     // 1-10
  focusLevel?: number;      // 1-10
  cognitiveScore?: number;  // 1-10 (mental clarity)
  attentionShift?: number;  // 1-10 (attention flexibility)
  notes?: string;
  createdAt: number;
}
```

### HeartRateRecord
```typescript
interface HeartRateRecord extends BaseHealthRecord {
  type: 'heart-rate';
  heartRate: number;                                      // BPM (30-220)
  context?: 'resting' | 'exercise' | 'sleep' | 'stress';
  source_device?: string;
}
```

---

## 🔐 Environment Setup

### Required
```bash
# Gemini API for cognitive tests
VITE_GEMINI_API_KEY=your_key_here

# API port (default 8113)
API_PORT=8113
```

---

## 🐛 Known Issues & Limitations

### TypeScript Errors (Non-Critical)
- 7 errors in test/script files (`SimpleTestDataGenerator`, `seed-test-data`)
- Do not affect runtime or build
- Can be safely ignored for now

### Incomplete Features
1. **API Endpoint:** `/api/list-health-files` not implemented
2. **Console.log:** 120+ statements in production code (needs cleanup)

### Performance Notes
- Large bundle (733KB / 206KB gzip) - mainly from Recharts
- Consider lazy loading analytics features
- CSV processing is synchronous - large files may block UI

---

## 🚀 Recent Major Changes

### 2025-12-15: Concentration Variability Analysis + Statistical Improvements
- ✅ **NEW: `analyzeConcentrationVariability()`** - Compares mood during stable vs variable concentration periods
  - Uses CV (coefficient of variation) in 7-day rolling windows
  - Two-sample t-test with effect size (Cohen's d)
  - Answers: "Does mood improve when medication levels are stable or varying?"
- ✅ **NEW: `analyzeOptimalDoseInterval()`** - Finds which dose intervals correlate with best mood
  - Bins intervals (8-16h, 20-26h, etc.) and compares mood outcomes
  - Correlation analysis between interval duration and mood
- ✅ **NEW: Benjamini-Hochberg FDR correction** in statistics-engine.ts
  - Controls false discovery rate for multiple comparisons
  - Prevents ~46% false positive rate when testing 12+ correlations
- ✅ **NEW: Two-sample t-test** in statistics-engine.ts for group comparisons
- ✅ **NEW: Lamotrigine autoinduction** in pharmacokinetics.ts
  - Reduces half-life by up to 20% after 21 days of use
  - Prevents 20-30% overestimation of chronic Lamictal concentrations
- ✅ **NEW: `ConcentrationStabilityCard.tsx`** component in Dashboard "Progress" tab
  - Visual comparison of stable vs variable periods
  - Mood difference with significance badges
  - Optimal interval analysis per medication
  - Personalized recommendations

### 2025-12-14: Temporal Adherence + Full Data Correlations
- ✅ **Correlations now use ALL data** - removed timeframe selector from AdvancedCorrelationsView
- ✅ Added `scheduledTime` field to Medication type for default dosing time
- ✅ Added time input in medication form to configure scheduled time
- ✅ Created `calculateTemporalAdherence()` function in insights-generator.ts
- ✅ New `TemporalAdherenceCard` component showing:
  - Adherence score (0-100%) based on timing deviation
  - On-time / late / early dose counts
  - Pattern (consistent/variable/irregular)
  - Trend (improving/stable/declining)
  - Correlation between timing and mood
- ✅ Integrated adherence card into Dashboard "Progress" tab

### 2025-12-10: Unified Mood Form + Extended Correlations
- ✅ Created unified `MoodLogForm.tsx` component for all mood entry points
- ✅ All forms now have same fields: mood, anxiety, energy, focus, cognition, attention shift
- ✅ Fields grouped in collapsible sections (Cognitive / Emotional)
- ✅ Extended `AdvancedCorrelationsView` to correlate ALL metrics vs medications
- ✅ Dashboard card shows anxiety/energy averages when available
- ✅ Removed duplicate form code from QuickMoodLog, MoodView, QuickMoodButton

### 2025-12-05: PKChart Unification
- ✅ Created unified `PKChart.tsx` component for all PK visualizations
- ✅ Fixed mood timestamps (now shows real registration time, not noon)
- ✅ Tooltip works across entire chart line (not just mood points)
- ✅ Smoother curves: 48 points/day + monotoneX interpolation
- ✅ Dual Y-axis: concentration (left), mood (right)
- ✅ Added `DirectionProvider` for React 19 + Radix UI compatibility
- ✅ Consolidated Dashboard and Analytics to use same chart component
- ✅ Enhanced PK formula with Ka by drug class

### 2025-11-26: Major Refactoring
- ✅ Reduced TypeScript errors from 98 to 7 (-93%)
- ✅ Integrated AdvancedCorrelationsView into Dashboard
- ✅ Created shared CSV parser utility
- ✅ Standardized HeartRateRecord types
- ✅ Removed 17 unused dependencies
- ✅ Fixed build process (now passes in 17.55s)

See `REFACTORING_2025-11-26.md` for full details.

---

## 📝 Development Commands

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm preview

# Type check only
npx tsc --noEmit

# Generate test data
npm run seed:data

# Process health data
npm run process:health
```

---

## 🎨 Design System

### Colors
- **Primary:** Teal/Cyan (`#00adad`)
- **Medical UI:** Purple/Violet (`#8b73bd`)
- **Charts:** Multi-color palette for medications
- **Dark Mode:** Full support with CSS variables

### Components
- **GlassCard:** Primary container with glassmorphism
- **Button:** Radix UI with custom variants
- **Charts:** Recharts with custom styling
- **Forms:** React Hook Form + Zod validation

### Responsive
- Mobile-first design
- Touch targets ≥48px
- PWA safe areas for iOS notch
- Compact mode for smaller screens

---

## 🔍 File Locations Quick Reference

### Core Types
- `/src/shared/types.ts` - Medication, MoodEntry, CognitiveTest
- `/src/features/health-data/core/types.ts` - Health data types

### Utilities
- `/src/features/health-data/utils/csv-parser.ts` - Samsung Health CSV parsing
- `/src/features/analytics/utils/correlations.ts` - Statistical correlations
- `/src/features/analytics/utils/statistics-engine.ts` - Stats calculations + FDR + t-test
- `/src/features/analytics/utils/pharmacokinetics.ts` - PK modeling + Lamotrigine autoinduction
- `/src/features/analytics/utils/insights-generator.ts` - Insights + adherence + variability analysis

### Hooks
- `/src/shared/hooks/use-mobile.ts` - Mobile detection
- `/src/hooks/use-doses.ts` - Dose data management
- `/src/hooks/use-medications.ts` - Medication data
- `/src/hooks/use-mood-entries.ts` - Mood data
- `/src/features/health-data/hooks/useHeartRateData.ts` - HR data

### Main Components
- `/src/features/analytics/components/Dashboard.tsx` - Main dashboard
- `/src/features/analytics/components/PKChart.tsx` - Unified PK + Mood chart (use this!)
- `/src/features/analytics/components/AdvancedCorrelationsView.tsx` - Advanced correlations (uses ALL data)
- `/src/features/analytics/components/TemporalAdherenceCard.tsx` - Timing adherence analysis
- `/src/features/analytics/components/ConcentrationStabilityCard.tsx` - Variability vs stability analysis
- `/src/features/mood/components/MoodLogForm.tsx` - Unified mood entry form (use this!)
- `/src/shared/layouts/AppLayout.tsx` - App shell

### Mood Components (Consolidated)
```
MoodLogForm.tsx        ← USE THIS (unified form with all metrics)
├── Used by: QuickMoodLog.tsx (Dashboard card)
├── Used by: MoodView.tsx (Mood page)
└── Used by: QuickMoodButton.tsx (FAB button)
```

### Chart Components (Consolidated)
```
PKChart.tsx           ← USE THIS (unified, tooltip works everywhere)
├── Used by: ConcentrationChart.tsx (Dashboard wrapper)
├── Used by: AnalyticsView.tsx (Analytics page)
└── Features: dual Y-axis, real timestamps, smooth curves

MedicationConcentrationChart.tsx  ← DEPRECATED (do not use)
```

---

## 💡 Tips for AI Assistants

### When Adding Features
1. Check `/src/shared/types.ts` first for existing types
2. Look for similar features in other `/features` folders
3. Reuse utilities from `/shared` and `/features/*/utils`
4. Follow existing naming conventions
5. Update this CLAUDE.md if adding major conventions

### When Debugging
1. Run `npx tsc --noEmit` first
2. Check browser console for runtime errors
3. Verify imports use `@/` path aliases
4. Look for duplicate code (should be in utilities)

### When Refactoring
1. Create utilities for duplicated logic
2. Centralize types in appropriate locations
3. Maintain backwards compatibility when possible
4. Update documentation (this file + comments)
5. Test build and type check before committing

---

**Last Updated:** 2025-12-15
**Project Status:** ✅ Build passing (16.5s), 5 non-critical TS errors, Variability analysis + FDR implemented
**Next Priority:** Apply FDR correction to existing insights, add therapeutic range alerts

---

Bora codar! 🚀
