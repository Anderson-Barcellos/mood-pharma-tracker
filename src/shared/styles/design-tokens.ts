/**
 * Design System Tokens
 * Medical-grade precision with warm, approachable aesthetics
 * Glassmorphism-ready with dark mode support
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // Primary - Deep Teal (clinical yet calming)
  primary: {
    50: '#e6f7f7',
    100: '#b3e8e8',
    200: '#80d9d9',
    300: '#4dcaca',
    400: '#26bcbc',
    500: '#00adad', // Base primary
    600: '#009a9a',
    700: '#008080',
    800: '#006666',
    900: '#004d4d',
    950: '#003333',
  },

  // Secondary - Muted Purple (mood tracking focus)
  secondary: {
    50: '#f3f0f9',
    100: '#dfd7ed',
    200: '#cabee1',
    300: '#b5a5d5',
    400: '#a08cc9',
    500: '#8b73bd', // Base secondary
    600: '#7a63a8',
    700: '#684f8e',
    800: '#563c74',
    900: '#44295a',
    950: '#331640',
  },

  // Accent - Soft Blue (cognitive clarity)
  accent: {
    50: '#e8f4f8',
    100: '#c3e2ed',
    200: '#9ed0e2',
    300: '#79bed7',
    400: '#54accc',
    500: '#3d9fc1', // Base accent
    600: '#3589a9',
    700: '#2d7391',
    800: '#255d79',
    900: '#1d4761',
    950: '#153149',
  },

  // Neutral - Warm grays with subtle tint
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
    1000: '#000000',
  },

  // Semantic Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },

  // Glassmorphism overlays
  glass: {
    white: 'rgba(255, 255, 255, 0.1)',
    whiteHover: 'rgba(255, 255, 255, 0.15)',
    dark: 'rgba(0, 0, 0, 0.1)',
    darkHover: 'rgba(0, 0, 0, 0.15)',
    primary: 'rgba(0, 173, 173, 0.1)',
    secondary: 'rgba(139, 115, 189, 0.1)',
  },
} as const;

// ============================================================================
// GRADIENTS
// ============================================================================

export const gradients = {
  primary: {
    light: 'linear-gradient(135deg, #00adad 0%, #3d9fc1 100%)',
    medium: 'linear-gradient(135deg, #009a9a 0%, #3589a9 100%)',
    dark: 'linear-gradient(135deg, #008080 0%, #2d7391 100%)',
  },

  secondary: {
    light: 'linear-gradient(135deg, #8b73bd 0%, #a08cc9 100%)',
    medium: 'linear-gradient(135deg, #7a63a8 0%, #8b73bd 100%)',
    dark: 'linear-gradient(135deg, #684f8e 0%, #7a63a8 100%)',
  },

  accent: {
    light: 'linear-gradient(135deg, #3d9fc1 0%, #79bed7 100%)',
    medium: 'linear-gradient(135deg, #3589a9 0%, #3d9fc1 100%)',
    dark: 'linear-gradient(135deg, #2d7391 0%, #3589a9 100%)',
  },

  mesh: {
    calm: 'radial-gradient(at 0% 0%, #00adad 0%, transparent 50%), radial-gradient(at 100% 100%, #8b73bd 0%, transparent 50%), radial-gradient(at 50% 50%, #3d9fc1 0%, transparent 50%)',
    energy: 'radial-gradient(at 0% 100%, #3d9fc1 0%, transparent 50%), radial-gradient(at 100% 0%, #00adad 0%, transparent 50%)',
    focus: 'radial-gradient(at 50% 0%, #8b73bd 0%, transparent 50%), radial-gradient(at 50% 100%, #3d9fc1 0%, transparent 50%)',
  },

  glass: {
    lightOverlay: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
    darkOverlay: 'linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.05) 100%)',
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.016em' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],           // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.011em' }], // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.014em' }],  // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.019em' }],   // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.021em' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.022em' }],   // 36px
    '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.024em' }],           // 48px
    '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.025em' }],        // 60px
    '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.025em' }],         // 72px
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
} as const;

// ============================================================================
// SPACING SYSTEM (8px base grid)
// ============================================================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  base: '0.5rem',   // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  full: '9999px',
} as const;

// ============================================================================
// SHADOWS (Glassmorphism + Depth)
// ============================================================================

export const shadows = {
  // Subtle shadows for glassmorphism
  glass: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
    base: '0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.08)',
    md: '0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.1)',
    lg: '0 16px 48px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.12)',
    xl: '0 24px 64px rgba(0, 0, 0, 0.12), 0 12px 24px rgba(0, 0, 0, 0.14)',
  },

  // Colored shadows for emphasis
  colored: {
    primary: '0 8px 24px rgba(0, 173, 173, 0.2), 0 4px 8px rgba(0, 173, 173, 0.1)',
    secondary: '0 8px 24px rgba(139, 115, 189, 0.2), 0 4px 8px rgba(139, 115, 189, 0.1)',
    accent: '0 8px 24px rgba(61, 159, 193, 0.2), 0 4px 8px rgba(61, 159, 193, 0.1)',
  },

  // Inner shadows for depth
  inner: {
    sm: 'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
    base: 'inset 0 2px 4px rgba(0, 0, 0, 0.08)',
    md: 'inset 0 4px 8px rgba(0, 0, 0, 0.1)',
  },

  // Standard elevation shadows
  elevation: {
    0: 'none',
    1: '0 1px 2px rgba(0, 0, 0, 0.04)',
    2: '0 2px 4px rgba(0, 0, 0, 0.06)',
    3: '0 4px 8px rgba(0, 0, 0, 0.08)',
    4: '0 8px 16px rgba(0, 0, 0, 0.1)',
    5: '0 16px 32px rgba(0, 0, 0, 0.12)',
  },
} as const;

// ============================================================================
// BLUR (for glassmorphism)
// ============================================================================

export const blur = {
  none: '0',
  sm: '4px',
  base: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '40px',
  '3xl': '64px',
} as const;

// ============================================================================
// TRANSITIONS & ANIMATIONS
// ============================================================================

export const transitions = {
  duration: {
    fast: '150ms',
    base: '250ms',
    slow: '350ms',
    slower: '500ms',
  },

  timing: {
    // Medical precision timing functions
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

    // Smooth, organic animations
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

    // Professional, clinical feel
    clinical: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    precise: 'cubic-bezier(0.33, 0, 0.67, 1)',
  },
} as const;

export const animations = {
  // Keyframe names for Tailwind
  keyframes: {
    'fade-in': {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    'fade-out': {
      '0%': { opacity: '1' },
      '100%': { opacity: '0' },
    },
    'slide-up': {
      '0%': { transform: 'translateY(10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    'slide-down': {
      '0%': { transform: 'translateY(-10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    'slide-left': {
      '0%': { transform: 'translateX(10px)', opacity: '0' },
      '100%': { transform: 'translateX(0)', opacity: '1' },
    },
    'slide-right': {
      '0%': { transform: 'translateX(-10px)', opacity: '0' },
      '100%': { transform: 'translateX(0)', opacity: '1' },
    },
    'scale-up': {
      '0%': { transform: 'scale(0.95)', opacity: '0' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    },
    'pulse-slow': {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.7' },
    },
    'shimmer': {
      '0%': { backgroundPosition: '-200% 0' },
      '100%': { backgroundPosition: '200% 0' },
    },
    'glass-morph': {
      '0%': { backdropFilter: 'blur(8px)', opacity: '0' },
      '100%': { backdropFilter: 'blur(16px)', opacity: '1' },
    },
  },
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  xs: '375px',   // Mobile small
  sm: '640px',   // Mobile
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Desktop large
  '2xl': '1536px', // Desktop XL
} as const;

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
} as const;

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type ColorPalette = typeof colors;
export type Gradients = typeof gradients;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;
export type Blur = typeof blur;
export type Transitions = typeof transitions;
export type Animations = typeof animations;
export type Breakpoints = typeof breakpoints;
export type ZIndex = typeof zIndex;
