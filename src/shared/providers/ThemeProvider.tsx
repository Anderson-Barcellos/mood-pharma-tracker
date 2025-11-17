import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

/**
 * ThemeProvider - Wrapper for next-themes with app-specific configuration
 *
 * Features:
 * - System preference detection (prefers-color-scheme)
 * - Manual theme override with localStorage persistence
 * - Smooth transitions between themes
 * - No flash of unstyled content (FOUC)
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="mood-pharma-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
