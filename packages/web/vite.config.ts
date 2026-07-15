import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin'

// Base config mirrored from workspace-onboarding, stripped of that app's
// native/domain externals (ssh2, libsql, google, canvas, papaparse). Add
// orch-specific SSR externals here when we wire the daemon socket client.
export default defineConfig({
  plugins: [
    nitroV2Plugin({
      compatibilityDate: '2026-02-03',
      preset: 'bun',
    }),
    // enables the @/* and @shadcn/* path aliases from tsconfig
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})
