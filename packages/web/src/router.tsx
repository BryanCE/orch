import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}

/** Without this, every `useParams()` / `useMatches()` in the app falls back to
 * `any`, because the router type has nowhere to be registered. It is the one
 * place TanStack learns which route tree this app actually has. */
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
