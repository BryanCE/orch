import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { z } from 'zod'

import { THEMES } from '@/themes'
import type { ColorSchemeId, ThemeMeta } from '@/themes'

export const COLOR_SCHEMES: readonly ThemeMeta[] = THEMES
export type { ColorSchemeId, ThemeMeta }

const COOKIE_NAME = 'color-scheme'
const STORAGE_KEY = 'color-scheme'
const DEFAULT_SCHEME: ColorSchemeId = 'ilsynth'

function isValidScheme(value: string | null | undefined): value is ColorSchemeId {
  return !!value && COLOR_SCHEMES.some((s) => s.id === value)
}

// Server functions for SSR
export const getColorSchemeCookie = createServerFn({ method: 'GET' }).handler((): ColorSchemeId => {
  const cookie = getCookie(COOKIE_NAME)
  return isValidScheme(cookie) ? cookie : DEFAULT_SCHEME
})

export const setColorSchemeCookie = createServerFn({ method: 'POST' })
  .validator(z.object({ colorScheme: z.string() }))
  .handler(({ data }) => {
    setCookie(COOKIE_NAME, data.colorScheme, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    })
  })

// Client functions
export function getColorScheme(): ColorSchemeId {
  if (typeof window === 'undefined') return DEFAULT_SCHEME
  const stored = localStorage.getItem(STORAGE_KEY)
  return isValidScheme(stored) ? stored : DEFAULT_SCHEME
}

function applyToDom(scheme: ColorSchemeId): void {
  if (typeof document === 'undefined') return
  if (scheme === DEFAULT_SCHEME) {
    delete document.documentElement.dataset.colorScheme
  } else {
    document.documentElement.dataset.colorScheme = scheme
  }
}

// Tiny pub/sub store so every consumer stays in sync.
const subscribers = new Set<() => void>()

let currentScheme: ColorSchemeId = getColorScheme()
let hydrated = false

export function subscribeColorScheme(fn: () => void): () => void {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

export function getColorSchemeSnapshot(): ColorSchemeId {
  return currentScheme
}

export function hydrateColorScheme(ssrValue: ColorSchemeId): void {
  if (hydrated) return
  hydrated = true
  const stored = getColorScheme()
  const resolved = stored !== DEFAULT_SCHEME || !isValidScheme(ssrValue) ? stored : ssrValue
  currentScheme = resolved
  applyToDom(resolved)
  if (resolved !== ssrValue) {
    void setColorSchemeCookie({ data: { colorScheme: resolved } })
  }
  subscribers.forEach((fn) => fn())
}

export function setColorScheme(scheme: ColorSchemeId): void {
  if (typeof window === 'undefined') return

  if (scheme === DEFAULT_SCHEME) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, scheme)
  }
  applyToDom(scheme)
  currentScheme = scheme
  subscribers.forEach((fn) => fn())
  void setColorSchemeCookie({ data: { colorScheme: scheme } })
}
