import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
import { includesValue } from './validation'

export type ThemeMode = 'light' | 'dark' | 'system'

const COOKIE_NAME = 'theme-mode'
const DEFAULT_MODE: ThemeMode = 'system'
const VALID: readonly ThemeMode[] = ['light', 'dark', 'system']

function isValidMode(value: string | null | undefined): value is ThemeMode {
  return includesValue(VALID, value)
}

export const getThemeModeCookie = createServerFn({ method: 'GET' }).handler((): ThemeMode => {
  const cookie = getCookie(COOKIE_NAME)
  return isValidMode(cookie) ? cookie : DEFAULT_MODE
})

export const setThemeModeCookie = createServerFn({ method: 'POST' })
  .validator(z.object({ mode: z.enum(['light', 'dark', 'system']) }))
  .handler(({ data }) => {
    setCookie(COOKIE_NAME, data.mode, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    })
  })
