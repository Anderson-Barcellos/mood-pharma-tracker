# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mood & Pharma Tracker** - A privacy-first Progressive Web App (PWA) for personal therapeutic monitoring of psychiatric medications with real-time pharmacokinetic modeling, mood tracking, and AI-powered cognitive testing. Built as a local-first application with optional server synchronization for cross-device access.

**Current Status**: Production-ready with authentication, data sync, and full PWA capabilities.

**Tech Stack**:
- **Frontend**: React 19 + TypeScript + Vite 6.3.5
- **Styling**: Tailwind CSS 4 + Custom Glassmorphism Design System
- **Database**: IndexedDB (Dexie 4.0.8) - Offline-first storage
- **UI Components**: Radix UI + Custom Glass Components
- **Charts**: Recharts + D3.js
- **AI**: Google Gemini API (cognitive tests only)
- **Build**: Vite with optimized chunking and PWA support
- **Backend**: Express.js (optional, file-based data sync)

**Key Characteristics**:
- Feature-based architecture (not MVC)
- Offline-first with PWA capabilities
- Complex pharmacokinetic calculations with multi-level caching
- Medical-grade data handling (privacy-critical)
- Glassmorphism UI with triadic color palette
- Cross-device data synchronization (optional)

---

## Current Configuration & Setup

### Server Configuration

**Apache Reverse Proxy**:
- **Config File**: `/etc/apache2/sites-available/mood-pharma-tracker-8114.conf`
- **Status**: Enabled (symlink in `/etc/apache2/sites-enabled/`)
- **Public Port**: 8114 (HTTPS with Let's Encrypt SSL)
- **Domain**: ultrassom.ai / www.ultrassom.ai
- **Proxy Target**: localhost:8112 (Vite dev server)
- **WebSocket**: HMR (Hot Module Replacement) enabled
- **Security**: Headers configured (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)

**Access URLs**:
- **Local Development**: http://127.0.0.1:8112/
- **Production**: https://ultrassom.ai:8114/

**API Backend** (Optional):
- **Port**: 3001
- **Endpoint**: `/api/save-data` (POST)
- **Storage**: File-based (`/public/data/app-data.json`)
- **Features**: Data validation, backup creation, timestamp checking

### Development Commands

```bash
# Development server (Vite on port 8112)
npm run dev

# Development with API backend
npm run dev:api      # API only (port 3001)
npm run dev:all      # Both Vite + API simultaneously

# Production build
npm run build        # Outputs to dist/ with optimized chunks

# Type checking (highly recommended before commits)
npx tsc --noEmit

# Linting
npm run lint

# Kill dev server if port is stuck
npm run kill         # Kills port 8133
npm run kill:all     # Kills ports 8112 and 3001
# Manual: fuser -k 8112/tcp

# Preview production build
npm run preview      # Serves dist/ on port 8112
```

### Environment Variables

```bash
# Required for cognitive tests
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

---

## Architecture Deep Dive

### Feature-Based Structure

Code is organized by feature, NOT by type. Each feature is self-contained with its own components, hooks, services, and types:

```
src/features/
├── auth/           # Password-based lock screen + session management
├── medications/     # Medication CRUD + pharmacokinetic parameters
├── doses/          # Dose logging + timestamp management
├── mood/           # Mood tracking (multi-dimensional scales)
├── cognitive/      # AI-generated Raven's matrices tests
├── analytics/      # Concentration curves, correlations, dashboard
└── settings/       # App configuration and preferences
```

**Shared Code**: Lives in `src/shared/` (components, utilities, types, styles)

**Core Business Logic**: Lives in `src/core/` (database, services, auth)

### Database Schema (IndexedDB + Dexie)

**Database Name**: `MoodPharmaTrackerDB`
**Current Version**: v3

**Tables**:
```typescript
interface Medication {
  id: string;
  name: string;
  category: 'antidepressant' | 'antipsychotic' | 'mood_stabilizer' | 'anxiolytic' | 'stimulant';
  halfLife: number;           // hours
  volumeOfDistribution: number; // L/kg
  bioavailability: number;    // fraction [0..1]
  absorptionRate?: number;    // 1/h (optional)
  createdAt: number;
  updatedAt: number;
}

interface MedicationDose {
  id: string;
  medicationId: string;
  timestamp: number;          // Unix timestamp (ms)
  doseAmount: number;         // mg
  route: 'oral' | 'intravenous' | 'intramuscular' | 'subcutaneous';
  notes?: string;
  createdAt: number;
}

interface MoodEntry {
  id: string;
  timestamp: number;
  moodScore: number;          // 0-10 scale
  anxietyLevel: number;       // 0-10 scale
  energyLevel: number;        // 0-10 scale
  focusLevel: number;         // 0-10 scale
  notes?: string;
  createdAt: number;
}

interface CognitiveTest {
  id: string;
  timestamp: number;
  matrices: RavenMatrix[];    // Test questions
  totalScore: number;
  averageResponseTime: number;
  accuracy: number;           // percentage
  createdAt: number;
}

interface AppMetadata {
  key: string;
  value: unknown;
  updatedAt: number;
}
```

**Critical Indexes**:
- `doses`: `[medicationId+timestamp]` - Compound index for efficient dose queries
- `medications`: `name, category, createdAt, updatedAt`
- `moodEntries`: `timestamp, moodScore, createdAt`
- `cognitiveTests`: `timestamp, totalScore, createdAt`

**Migration System**: Automatic upgrades from legacy localStorage data with validation and normalization.

### Pharmacokinetic Calculation System

**Location**: `src/features/analytics/utils/pharmacokinetics.ts`

**Models Supported**:
- **One-compartment**: Standard model for most medications
- **Two-compartment**: For highly distributed drugs (Vd > 10 L/kg)

**Key Functions**:
```typescript
calculateConcentration(
  medication: Medication,
  doses: MedicationDose[],
  targetTime: number,
  bodyWeight: number = 70
): number
```

**Performance Optimizations**:
- **LRU Cache**: 5-minute TTL with automatic invalidation
- **React Query**: 5-minute staleTime for component-level caching
- **Multi-level Caching**: Prevents recalculation of expensive operations

**Cache Monitoring**: `window.__perfMonitor.getReport()` in browser console

### Authentication System

**Type**: Password-based with SHA-256 hashing + device-specific salt
**Storage**: localStorage (PWA-compatible)
**Features**:
- Optional activation in Analytics settings
- Session management with tokens
- Glassmorphism lock screen UI
- No backend required

**Files**:
- `src/features/auth/services/simple-auth.ts` - Core auth logic
- `src/features/auth/components/LockScreen.tsx` - Password entry UI
- `src/features/auth/components/PasswordSettings.tsx` - Configuration UI

### Data Synchronization System

**Architecture**: Bidirectional sync between IndexedDB ↔ Server JSON file
**Server Storage**: `/public/data/app-data.json` (file-based, no database needed)
**Trigger**: Manual via UI buttons (not real-time)

**Key Components**:
- `src/core/services/server-data-loader.ts` - Sync logic
- `api/save-data.js` - Express endpoint with validation
- `src/shared/components/DataExportImport.tsx` - UI controls

**Sync Flow**:
1. **Load**: Automatic on app start (pull from server)
2. **Save**: Manual button click (push to server)
3. **Backup**: Automatic server-side backups before overwrites

---

## UI/UX Design System

### Glassmorphism Components

**Core Components** (`src/shared/ui/`):
- `GlassCard` - Main container with blur effects
- `GlassButton` - Interactive elements with glow
- `GlassInput` - Form inputs with glass styling
- `GlassModal` - Overlay dialogs

**Variants**: `default`, `elevated`, `flat`, `interactive`

### Color Palette (Triadic System)

```css
/* Medical/Pharmaceutical (Primary) */
--color-primary-500: #00adad;  /* Teal */

/* Psychological/Mood (Secondary) */
--color-secondary-500: #8b73bd; /* Purple */

/* Cognitive (Accent) */
--color-accent-500: #3d9fc1;   /* Blue */
```

### Typography Scale

- **Display**: Medical headers and titles
- **Sans**: UI text and content
- **Mono**: Code and data display

### Animations & Transitions

- **Clinical**: Smooth, medical-appropriate easing
- **Spring**: Interactive feedback
- **Glass Morph**: Progressive blur effects

---

## Key Features Implementation

### 1. Medication Management

**CRUD Operations**: Create, read, update, delete medications
**Pharmacokinetic Parameters**: Half-life, Vd, bioavailability, absorption rate
**Categories**: Antidepressant, antipsychotic, mood stabilizer, anxiolytic, stimulant
**Validation**: Medical parameter ranges and required fields

### 2. Dose Logging

**Timestamp Precision**: Millisecond-accurate logging
**Routes**: Oral, IV, IM, subcutaneous
**Quick Add**: Floating action button for rapid entry
**Validation**: Dose ranges and medication existence

### 3. Mood Tracking

**Multi-dimensional**: Mood (0-10), anxiety, energy, focus
**Time-based**: Timestamp-accurate entries
**Visualization**: Time-series charts with correlations
**Notes**: Optional text annotations

### 4. Cognitive Testing

**AI-Powered**: Google Gemini generates Raven's matrices
**Offline Fallback**: Cached test patterns
**Metrics**: Score, response time, accuracy
**Progressive**: Difficulty scaling based on performance

### 5. Analytics Dashboard

**Concentration Curves**: Real-time pharmacokinetic modeling
**Correlations**: Mood vs medication levels
**Timeframes**: Custom date ranges with presets
**Export**: JSON backup and server sync

### 6. Health Data Integration (Samsung Health)

**Data Sources**: Heart rate, activity (steps/exercise), sleep
**Parsers**: Specialized parsers for each Samsung Health CSV format
**Correlations**: Advanced statistical analysis (Pearson correlation with p-values)
**Multi-system Analysis**: Health ↔ Mood ↔ Medication concentration correlations
**Health Score**: Composite 0-100 score based on multiple metrics
**Insights**: AI-generated actionable recommendations
**Processing**: `npx tsx src/features/health-data/core/analysis-demo.ts`
**Output**: JSON data + Markdown executive summaries

### 7. PWA Features

**Manifest**: `public/manifest.json`
**Service Worker**: `public/service-worker.js`
**Install Prompt**: Automatic PWA installation
**Offline Mode**: Full functionality without network

---

## Development Guidelines

### Code Conventions

**Imports**: Use `@/` alias for absolute imports (configured in `vite.config.ts`)

**File Naming**:
- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Services: `kebab-case.ts`
- Types: Feature-specific or `shared/types.ts`

**TypeScript**: Strict mode enabled. No `any` types. Use Zod for runtime validation.

**Styling**: Tailwind utility classes. Custom CSS only when necessary.

### Performance Targets

- **P50**: < 50ms for calculations
- **P95**: < 200ms for chart renders
- **P99**: < 500ms for database queries

**Measurement**: Use `perfMonitor.measure()` for performance tracking.

### Build Optimization

**Chunk Splitting** (configured in `vite.config.ts`):
- `vendor-react`: React core libraries
- `vendor-ui`: Radix UI components
- `vendor-charts`: Recharts + D3
- `vendor-forms`: React Hook Form + validation
- `vendor-motion`: Framer Motion
- `vendor-db`: Dexie + hooks

**Asset Optimization**:
- SVG icons with multiple sizes
- WebP/AVIF image support
- Font subsetting and optimization

### Testing Strategy

**Unit Tests**: Pharmacokinetic calculations and utilities
**Integration Tests**: Database operations and API endpoints
**E2E Tests**: Critical user flows (planned)

---

## Deployment & Production

### Build Process

```bash
npm run build  # Creates optimized dist/
```

**Output Structure**:
```
dist/
├── assets/
│   ├── js/     # Code-split chunks
│   ├── css/    # Stylesheets
│   └── icons/  # PWA icons
├── index.html
└── manifest.json
```

### Apache Configuration

**Virtual Host**: Port 8114 with SSL termination
**Proxy**: WebSocket support for HMR
**Security**: Comprehensive headers and SSL

### Environment Setup

**Production Variables**:
```bash
VITE_GEMINI_API_KEY=production_key_here
```

**Systemd Service**: `mood-pharma-tracker.service` for auto-start

### Monitoring & Maintenance

**Logs**: Apache access/error logs
**Backups**: Automatic data snapshots
**Updates**: Rolling deployments with backup validation

---

## Security & Privacy

### Data Handling

- **Local-First**: All data stored in IndexedDB
- **Encryption**: Password hashing with salt
- **No Telemetry**: Zero tracking or analytics
- **Server Sync**: Optional, user-controlled, file-based

### Medical Context

**Disclaimer**: Personal monitoring tool, not medical device
**Privacy**: Single-user app with optional password protection
**Data Export**: JSON format for external analysis

---

## Common Development Tasks

### Adding a New Medication Parameter

1. Update `Medication` interface in `src/shared/types.ts`
2. Add to Dexie schema in `src/core/database/db.ts` (increment version!)
3. Update normalization in `medication-helpers.ts`
4. Add to UI forms in `src/features/medications/`
5. Update pharmacokinetic calculations if needed

### Modifying Pharmacokinetic Calculations

1. Update functions in `src/features/analytics/utils/pharmacokinetics.ts`
2. **CRITICAL**: Increment `CACHE_VERSION` constant to invalidate cache
3. Test with `window.__perfMonitor.logReport()`
4. Update performance benchmarks

### Adding a New Chart Type

1. Use Recharts components in `src/features/analytics/components/`
2. Follow existing patterns with cached data hooks
3. Apply glassmorphism styling
4. Add to dashboard layout

### Implementing New Feature

1. Create feature directory under `src/features/`
2. Implement components, hooks, services, types
3. Add navigation in `src/shared/layouts/`
4. Update database schema if needed
5. Add to main app routing

---

## Documentation Structure

```
docs/
├── architecture/    # PRD, navigation, security
├── design/          # Design system, colors, glassmorphism
├── deployment/      # PWA setup, service config
├── features/        # Feature-specific guides
└── performance/     # Optimization docs, benchmarks
```

**Essential Reading**:
- `docs/architecture/PRD.md` - Product requirements
- `docs/performance/PHARMACOKINETICS_OPTIMIZATION.md` - Cache system
- `docs/design/DESIGN_SYSTEM.md` - UI patterns

---

## Troubleshooting

### Common Issues

**Port Conflicts**:
```bash
# Check what's using ports
lsof -i :8112
lsof -i :3001

# Kill processes
npm run kill:all
```

**Database Issues**:
```typescript
// Reset database in browser console
await db.delete();
location.reload();
```

**Cache Problems**:
```typescript
// Clear all caches
localStorage.clear();
location.reload();
```

**Build Issues**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## Recent Updates (October 2025)

- ✅ **Authentication System**: SHA-256 password hashing with device salt
- ✅ **Data Synchronization**: Bidirectional IndexedDB ↔ Server sync
- ✅ **Apache Integration**: Reverse proxy with SSL and WebSocket support
- ✅ **PWA Optimization**: Service worker, install prompts, offline mode
- ✅ **Performance Monitoring**: Built-in perf tracking and reporting
- ✅ **Type Safety**: Full TypeScript with strict mode
- ✅ **Build Optimization**: Advanced chunk splitting and asset optimization

**Next Priorities**:
- Enhanced cognitive test patterns
- Advanced pharmacokinetic models
- Mobile-specific optimizations
- Automated testing suite
