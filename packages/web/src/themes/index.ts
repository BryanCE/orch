import type { ThemeMeta } from './types'

// Collect CSS URLs from every theme.css so they can be linked as blocking stylesheets.
const cssUrls = import.meta.glob<string>('./*/theme.css', {
  eager: true,
  query: '?url',
  import: 'default',
})

// Collect metadata from every theme.ts module.
const modules = import.meta.glob<{ default: ThemeMeta }>('./*/theme.ts', { eager: true })

export const THEMES: readonly ThemeMeta[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => {
    if (a.id === 'ilsynth') return -1
    if (b.id === 'ilsynth') return 1
    return a.name.localeCompare(b.name)
  })

export const THEME_CSS_URLS: readonly string[] = Object.values(cssUrls)

export type { ColorSchemeId, ThemeMeta } from './types'
