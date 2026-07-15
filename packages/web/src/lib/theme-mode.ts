import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { z } from 'zod'

export type ThemeMode = 'light' | 'dark' | 'system'

const COOKIE_NAME = 'theme-mode'
const STORAGE_KEY = 'theme'
const DEFAULT_MODE: ThemeMode = 'system'
const VALID: readonly ThemeMode[] = ['light', 'dark', 'system']

function isValidMode(value: string | null | undefined): value is ThemeMode {
  return !!value && (VALID as readonly string[]).includes(value)
}

export const getThemeModeCookie = createServerFn({ method: 'GET' }).handler(async (): Promise<ThemeMode> => {
  const cookie = getCookie(COOKIE_NAME)
  return isValidMode(cookie) ? cookie : DEFAULT_MODE
})

export const setThemeModeCookie = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ mode: z.enum(['light', 'dark', 'system']) }))
  .handler(async ({ data }) => {
    setCookie(COOKIE_NAME, data.mode, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    })
  })

export function getThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_MODE
  const stored = localStorage.getItem(STORAGE_KEY)
  return isValidMode(stored) ? stored : DEFAULT_MODE
}
