# Mood & Pharma Tracker - Project Context

## 📋 Project Overview

Personal health tracking PWA for monitoring medication adherence, mood patterns, and cognitive performance with pharmacokinetic modeling and correlation analysis.

**Stack:** React 19 + TypeScript + Vite + Dexie (IndexedDB) + Radix UI + Tailwind CSS v4

---

## 🎯 Core Features

### 1. Medication Tracking
- Pharmacokinetic modeling (half-life, bioavailability, volume of distribution)
- Real-time concentration calculations
- Multiple medication support with dose logging

### 2. Mood Monitoring
- Quick mood logging (1-10 scale)
- Anxiety, energy, and focus tracking
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
- Temporal lag analysis (planned)
- Pharmacokinetic concentration charting

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
- **Local-first:** Dexie (IndexedDB) for offline support
- **Optional sync:** Firebase for backup/multi-device
- **No server required:** PWA works fully offline

---
from 
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
  moodScore: number;        // 1-10
  anxietyLevel?: number;    // 1-10
  energyLevel?: number;     // 1-10
  focusLevel?: number;      // 1-10
  cognitiveScore?: number;  // from tests
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
```

### Optional (Firebase)
```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

## 🐛 Known Issues & Limitations

### TypeScript Errors (Non-Critical)
- 7 errors in test/script files (`SimpleTestDataGenerator`, `seed-test-data`)
- Do not affect runtime or build
- Can be safely ignored for now

### Incomplete Features
1. **Temporal Lag Analysis:** Tab exists but empty (AdvancedCorrelationsView.tsx:566)
2. **API Endpoint:** `/api/list-health-files` not implemented
3. **Console.log:** 120+ statements in production code (needs cleanup)

### Performance Notes
- Large bundle (733KB / 206KB gzip) - mainly from Recharts
- Consider lazy loading analytics features
- CSV processing is synchronous - large files may block UI

---

## 🚀 Recent Major Changes

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
- `/src/features/analytics/utils/statistics-engine.ts` - Stats calculations
- `/src/features/analytics/utils/pharmacokinetics.ts` - PK modeling

### Hooks
- `/src/shared/hooks/use-mobile.ts` - Mobile detection
- `/src/hooks/use-doses.ts` - Dose data management
- `/src/hooks/use-medications.ts` - Medication data
- `/src/hooks/use-mood-entries.ts` - Mood data
- `/src/features/health-data/hooks/useHeartRateData.ts` - HR data

### Main Components
- `/src/features/analytics/components/Dashboard.tsx` - Main dashboard
- `/src/features/analytics/components/PKChart.tsx` - Unified PK + Mood chart (use this!)
- `/src/features/analytics/components/AdvancedCorrelationsView.tsx` - Advanced correlations
- `/src/shared/layouts/AppLayout.tsx` - App shell

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

**Last Updated:** 2025-12-05
**Project Status:** ✅ Build passing, 5 non-critical TS errors, PKChart unified
**Next Priority:** Implement temporal lag analysis, cleanup console.logs, remove deprecated MedicationConcentrationChart

---

Bora codar! 🚀
