import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Check } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  COLOR_SCHEMES,
  getColorSchemeSnapshot,
  setColorScheme,
  subscribeColorScheme,
  type ColorSchemeId,
} from '@/lib/color-scheme'

interface ColorSchemeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialScheme: ColorSchemeId
}

export function ColorSchemeDialog({
  open,
  onOpenChange,
  initialScheme,
}: ColorSchemeDialogProps) {
  const { resolvedTheme } = useTheme()
  const currentScheme = useSyncExternalStore(
    subscribeColorScheme,
    getColorSchemeSnapshot,
    () => initialScheme
  )

  const handleSelect = (schemeId: ColorSchemeId) => {
    setColorScheme(schemeId)
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Color Theme</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="grid gap-2 py-4">
            {COLOR_SCHEMES.map((scheme) => {
            const isSelected = currentScheme === scheme.id
            const previewColor = isDark ? scheme.colors.dark : scheme.colors.light

            return (
              <button
                key={scheme.id}
                onClick={() => handleSelect(scheme.id)}
                className={`flex items-center justify-between px-4 py-3 rounded-md border transition-colors outline-none
                  ${isSelected
                    ? 'border-primary bg-accent'
                    : 'border-transparent hover:bg-accent/50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-sm"
                    style={{ backgroundColor: previewColor }}
                  />
                  <span className="font-medium">{scheme.name}</span>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </button>
            )
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
