# Mood & Pharma Tracker - Product Requirements Document

A personal therapeutic monitoring application for tracking psychiatric medications, mood states, and cognitive performance with pharmacokinetic modeling.

**Experience Qualities**:
1. **Clinical** - Professional-grade data tracking with medical accuracy and validated pharmacokinetic models
2. **Empowering** - Transform subjective experiences into quantitative insights that inform treatment discussions
3. **Private** - All sensitive health data stored locally with no external servers or data sharing

**Complexity Level**: Complex Application (advanced functionality with pharmacokinetic calculations, AI integration, multiple interconnected features, and sophisticated data visualization)
  - Requires multi-dimensional state management (medications, doses, mood entries, cognitive tests), real-time pharmacokinetic calculations, AI-generated cognitive tests, and statistical correlation analysis

## Essential Features

### Medication Management
- **Functionality**: Create, edit, and manage psychiatric medications with pharmacokinetic parameters (half-life, volume of distribution, bioavailability, absorption rate)
- **Purpose**: Establish the foundation for calculating drug concentrations and correlating with psychological states
- **Trigger**: User clicks "Add Medication" from medications page
- **Progression**: Select medication category → Enter name and brand → Input pharmacokinetic parameters (with tooltips) → Optionally add therapeutic range → Save
- **Success criteria**: Medication persists locally, appears in medication list, becomes available for dose logging

### Dose Logging
- **Functionality**: Quick registration of medication doses with precise timestamps and amounts
- **Purpose**: Track actual medication intake to calculate real-time serum concentrations
- **Trigger**: User clicks "Log Dose" from dashboard or medication detail
- **Progression**: Select medication → Enter dose amount (mg) → Confirm current time or adjust → Add optional notes → Save
- **Success criteria**: Dose recorded with timestamp, updates pharmacokinetic calculations, appears in dose history

### Mood Tracking
- **Functionality**: Record emotional states using 0-10 scales for multiple dimensions (mood, anxiety, energy, focus)
- **Purpose**: Capture subjective well-being states to correlate with medication levels
- **Trigger**: User opens mood tracking from dashboard or scheduled reminder
- **Progression**: Adjust slider for primary mood (0-10) → Optionally rate additional dimensions → Add contextual notes → Save with timestamp
- **Success criteria**: Mood entry saved with timestamp, visualized in mood timeline graph, included in correlation analysis

### Cognitive Testing (Raven's Matrices)
- **Functionality**: Interactive mini-game presenting 4 AI-generated progressive matrices testing pattern recognition
- **Purpose**: Objectively measure cognitive performance to correlate with medication concentrations
- **Trigger**: User clicks "Take Cognitive Test" from dashboard
- **Progression**: Read instructions → Start test → Complete 4 matrices (each with 3x3 grid and 6 answer options) → View immediate feedback on errors → See final score and response times → Results saved automatically
- **Success criteria**: All 4 matrices completed, performance metrics calculated (accuracy, average response time, weighted score), results persist and display in analytics

### Analytics Dashboard
- **Functionality**: Visualize correlations between calculated medication concentrations, mood states, and cognitive performance over time
- **Purpose**: Identify patterns that inform treatment optimization discussions with healthcare providers
- **Trigger**: User navigates to Analytics page
- **Progression**: View default 14-day timeline → Select specific medication to analyze → See overlaid graphs of concentration curves, mood scores, and cognitive test results → Filter date ranges → Identify peak correlations
- **Success criteria**: Graphs accurately reflect pharmacokinetic models, correlations are visually apparent, user can export insights for medical appointments

## Edge Case Handling

- **Missed Doses** - Allow backdated dose entries with custom timestamps; recalculate concentration curves retroactively
- **Medication Changes** - Archive discontinued medications while preserving historical dose data for analysis continuity
- **Rapid Mood Fluctuations** - Support multiple mood entries per day; display density heatmaps for high-frequency tracking periods
- **API Failures (Gemini)** - Retry matrix generation up to 3 times; offer cached test as fallback; allow test cancellation without penalty
- **Invalid Pharmacokinetic Parameters** - Validate input ranges against medical literature; show warnings for unusual values; provide default presets for common medications
- **Data Export Needs** - Provide JSON/CSV export of all data for sharing with healthcare providers while maintaining privacy

## Design Direction

The interface should feel clinical yet compassionate - balancing medical precision with emotional sensitivity. Visual design should evoke a sense of scientific rigor while remaining approachable for users during vulnerable mental health moments. The aesthetic should lean toward pharmaceutical documentation clarity with humanizing touches, using a minimal interface that prioritizes data density and analytical clarity over decorative elements.

## Color Selection

**Triadic** - Using three equally spaced colors to represent the three core data types (pharmaceutical/green, psychological/purple, cognitive/blue) with clear semantic associations that aid quick pattern recognition in complex overlaid graphs.

- **Primary Color**: Deep Teal `oklch(0.45 0.12 200)` - Represents pharmaceutical/clinical aspects, communicates medical professionalism and trustworthiness without the sterility of pure blue
- **Secondary Colors**: 
  - Muted Purple `oklch(0.50 0.15 290)` for mood/psychological data - warmth suggesting emotional states
  - Soft Blue `oklch(0.55 0.12 240)` for cognitive performance - clarity suggesting mental acuity
- **Accent Color**: Vibrant Amber `oklch(0.70 0.15 60)` for alerts, CTAs, and data anomalies requiring attention
- **Foreground/Background Pairings**:
  - Background (White `oklch(0.98 0 0)`): Dark Gray text `oklch(0.25 0 0)` - Ratio 14.2:1 ✓
  - Card (Light Gray `oklch(0.96 0 0)`): Dark Gray text `oklch(0.25 0 0)` - Ratio 13.1:1 ✓
  - Primary (Deep Teal `oklch(0.45 0.12 200)`): White text `oklch(1 0 0)` - Ratio 6.8:1 ✓
  - Secondary (Muted Purple `oklch(0.50 0.15 290)`): White text `oklch(1 0 0)` - Ratio 5.2:1 ✓
  - Accent (Vibrant Amber `oklch(0.70 0.15 60)`): Dark Gray text `oklch(0.25 0 0)` - Ratio 5.1:1 ✓
  - Muted (Light Gray `oklch(0.92 0 0)`): Medium Gray text `oklch(0.45 0 0)` - Ratio 5.3:1 ✓

## Font Selection

Typography should balance clinical precision with readability during potentially distressed states, using a geometric sans-serif that suggests scientific accuracy while maintaining excellent legibility at all sizes.

**Primary Font**: Inter (Google Fonts) - Clean geometric sans-serif with excellent x-height and disambiguated characters (1/I/l distinction critical for medication dosages)

- **Typographic Hierarchy**:
  - H1 (Page Titles): Inter Bold / 32px / -0.02em letter-spacing / 1.2 line-height
  - H2 (Section Headers): Inter Semibold / 24px / -0.01em / 1.3
  - H3 (Card Titles): Inter Medium / 18px / 0 / 1.4
  - Body Text: Inter Regular / 16px / 0 / 1.6
  - Small (Timestamps, Meta): Inter Regular / 14px / 0 / 1.5
  - Data Values (Dosages, Scores): Inter Medium / 20px / 0 / 1.2 (tabular numerals)
  - Graph Labels: Inter Medium / 12px / 0 / 1.3

## Animations

Animations should be minimal and purposeful, reflecting the clinical nature of the application while providing necessary feedback. Motion should feel precise and measured, like medical equipment calibration rather than playful consumer apps - communicating reliability and accuracy through subtle, functional transitions.

- **Purposeful Meaning**: Smooth transitions between data visualizations reinforce continuity of treatment timeline; loading states for AI matrix generation reduce anxiety; micro-animations on successful data entry provide clinical "confirmation" feeling
- **Hierarchy of Movement**: Pharmacokinetic curve animations on analytics page (primary focus); cognitive test matrix reveals (secondary engagement); button/input states (tertiary utility)

## Component Selection

- **Components**:
  - **Card** - Primary container for medications, dose logs, mood entries, test results (subtle shadow, rounded corners per --radius)
  - **Button** - All actions (primary/secondary/outline variants for hierarchy: log dose=primary, view details=secondary, delete=destructive)
  - **Input** - Dose amounts, medication names, timestamps with clear focus states
  - **Slider** - Mood scale 0-10 input (customized with value label and tick marks)
  - **Dialog** - Medication form, confirmation modals, cognitive test instructions
  - **Tabs** - Analytics views (concentration/mood/cognitive), medication categories
  - **Select** - Medication selection for dose logging, date range pickers
  - **Separator** - Visual breaks between timeline sections
  - **Tooltip** - Pharmacokinetic parameter explanations, graph data points
  - **Badge** - Medication categories, test scores, adherence status
  - **Progress** - Cognitive test progression (4/4 matrices), concentration calculations

- **Customizations**:
  - **ConcentrationGraph** - Custom Recharts ComposedChart with area fill under pharmacokinetic curves, overlaid scatter points for mood entries
  - **MatrixGrid** - Custom SVG renderer for 3x3 Raven's matrices with responsive sizing
  - **TimelineView** - Custom horizontal timeline with dose markers, mood points, and test events
  - **MedicationCard** - Enhanced card showing current calculated concentration with visual indicator bar

- **States**:
  - Buttons: default → hover (slight elevation) → active (pressed depth) → disabled (reduced opacity)
  - Inputs: default border → focus (primary color ring) → error (destructive color) → success (green checkmark)
  - Cards: default → hover (elevated shadow for interactive cards) → selected (primary border)
  - Loading: skeleton screens for data fetching, spinner for AI generation with progress text

- **Icon Selection**:
  - Pills (medication management)
  - ChartLine (analytics)
  - Brain (cognitive tests)
  - Smiley/SmileyMeh/SmileySad (mood states)
  - CalendarBlank (dose scheduling)
  - Warning (alerts/anomalies)
  - Export (data export)
  - Plus/X (add/remove actions)

- **Spacing**:
  - Section padding: `p-6` (24px)
  - Card padding: `p-4` (16px)
  - Inter-card gaps: `gap-4` (16px)
  - Form field spacing: `space-y-4` (16px vertical)
  - Button padding: `px-4 py-2` (horizontal 16px, vertical 8px)
  - Tight groups (pill badges): `gap-2` (8px)

- **Mobile**:
  - Stack cards vertically with full width
  - Mood sliders become larger touch targets (minimum 44px height)
  - Cognitive test matrices scale to fit viewport width (max 90vw)
  - Analytics graphs switch to portrait orientation with swipeable time ranges
  - Bottom navigation bar for primary sections (Dashboard/Medications/Mood/Analytics)
  - Medication forms become full-screen modals
  - Dose logging becomes quick-action FAB (floating action button)
