import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import SunIcon from 'lucide-react/dist/esm/icons/sun'
import MoonIcon from 'lucide-react/dist/esm/icons/moon'
import MonitorIcon from 'lucide-react/dist/esm/icons/monitor'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

/**
 * ThemeToggle - Theme switcher component with dropdown menu
 *
 * Features:
 * - Light/Dark/System theme options
 * - Smooth icon transitions
 * - Accessible (ARIA labels, keyboard navigation)
 * - Mounted state to prevent hydration mismatch
 *
 * @example
 * ```tsx
 * <ThemeToggle />
 * ```
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
        <SunIcon className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const getCurrentIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="h-4 w-4" />
      case 'dark':
        return <MoonIcon className="h-4 w-4" />
      default:
        return <MonitorIcon className="h-4 w-4" />
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 transition-all duration-200 hover:bg-accent/10"
          aria-label="Toggle theme"
        >
          <div className="transition-transform duration-200 hover:rotate-12">
            {getCurrentIcon()}
          </div>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="cursor-pointer gap-2"
        >
          <SunIcon className="h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="cursor-pointer gap-2"
        >
          <MoonIcon className="h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="cursor-pointer gap-2"
        >
          <MonitorIcon className="h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
