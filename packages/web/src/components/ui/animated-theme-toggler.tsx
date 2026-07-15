import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { flushSync } from "react-dom"
import { Sun, Moon, Monitor, Check, Palette, Play } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ColorSchemeDialog } from "@/components/ColorSchemeDialog"
import {
  COLOR_SCHEMES,
  getColorSchemeSnapshot,
  hydrateColorScheme,
  setColorScheme,
  subscribeColorScheme,
  type ColorSchemeId,
} from "@/lib/color-scheme"
import { setThemeModeCookie } from "@/lib/theme-mode"

type Theme = "light" | "dark" | "system"

// SSR-resolved initial scheme arrives via prop — reading the root route's
// loader data here would create an import cycle Header → toggler → __root →
// Header. The parent (Header / __root) owns the loader read.
export const AnimatedThemeToggler = ({
  initialScheme,
}: {
  initialScheme: ColorSchemeId
}) => {
  const { theme, setTheme } = useTheme()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [colorSchemeOpen, setColorSchemeOpen] = useState(false)

  useEffect(() => {
    hydrateColorScheme(initialScheme)
  }, [initialScheme])

  const currentScheme = useSyncExternalStore(
    subscribeColorScheme,
    getColorSchemeSnapshot,
    () => initialScheme
  )
  const currentMeta = COLOR_SCHEMES.find((s) => s.id === currentScheme) ?? COLOR_SCHEMES[0]

  const handleThemeChange = useCallback(
    async (newTheme: Theme) => {
      if (!newTheme || newTheme === theme || !triggerRef.current) return

      const button = triggerRef.current

      await document.startViewTransition(() => {
        flushSync(() => {
          setTheme(newTheme)
        })
      }).ready

      const { top, left, width, height } = button.getBoundingClientRect()
      const x = left + width / 2
      const y = top + height / 2
      const maxRadius = Math.hypot(
        Math.max(left, window.innerWidth - left),
        Math.max(top, window.innerHeight - top)
      )

      const animation = document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 1000,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      )

      // Persist for the next SSR paint only — next-themes owns the client from
      // here. Fire the server round-trip after the animation so it can't jank it.
      animation.finished.finally(() => {
        setThemeModeCookie({ data: { mode: newTheme } }).catch((err) => {
          console.error("Failed to persist theme mode cookie", err)
        })
      })
    },
    [theme, setTheme]
  )

  const handleCycleScheme = useCallback(
    (e: Event | React.SyntheticEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const idx = COLOR_SCHEMES.findIndex((s) => s.id === currentScheme)
      const next = COLOR_SCHEMES[(idx + 1) % COLOR_SCHEMES.length]
      setColorScheme(next.id)
    },
    [currentScheme]
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="ghost" size="icon">
          <span className="flex h-5 w-5 items-center justify-center" suppressHydrationWarning>
            {theme === "dark" ? <Moon className="h-5 w-5" /> : theme === "light" ? <Sun className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </span>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[16rem]">
        <DropdownMenuItem onClick={() => handleThemeChange("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
          {theme === "light" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
          {theme === "system" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center gap-1 px-1 py-1">
          <button
            type="button"
            onClick={() => setColorSchemeOpen(true)}
            className="flex flex-col items-start gap-0 flex-1 min-w-0 px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground outline-none"
          >
            <span className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4 shrink-0" />
              Color Theme
            </span>
            <span
              className="pl-6 text-[10px] leading-tight text-muted-foreground truncate max-w-full"
              suppressHydrationWarning
            >
              {currentMeta?.name}
            </span>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleCycleScheme}
            aria-label="Cycle color theme"
            title="Cycle to next theme"
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DropdownMenuContent>
      <ColorSchemeDialog
        open={colorSchemeOpen}
        onOpenChange={setColorSchemeOpen}
        initialScheme={initialScheme}
      />
    </DropdownMenu>
  )
}
