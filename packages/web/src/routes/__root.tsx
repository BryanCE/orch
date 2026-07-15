import { HeadContent, Scripts, createRootRoute, Link } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/sonner";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { getColorSchemeCookie } from "@/lib/color-scheme";
import { getThemeModeCookie } from "@/lib/theme-mode";

import { THEME_CSS_URLS } from "@/themes";
import appCss from "@/styles.css?url";

// One shared query cache for the whole app.
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

export const Route = createRootRoute({
  notFoundComponent: () => (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <p className="text-lg font-semibold text-foreground">404</p>
      <p>Nothing here.</p>
      <Link to="/" className="text-primary underline">back to cockpit</Link>
    </div>
  ),
  loader: async () => ({
    colorScheme: await getColorSchemeCookie(),
    themeMode: await getThemeModeCookie(),
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "orch" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      ...THEME_CSS_URLS.map((href) => ({ rel: "stylesheet", href })),
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const { colorScheme, themeMode } = Route.useLoaderData();

  return (
    <html
      lang="en"
      className={themeMode === "dark" ? "dark" : undefined}
      data-color-scheme={colorScheme !== "ilsynth" ? colorScheme : undefined}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body className="h-screen overflow-hidden">
        <ThemeProvider attribute="class" defaultTheme={themeMode} enableSystem storageKey="theme">
          <QueryClientProvider client={queryClient}>
            {/* Scanline overlay — orch synthwave aesthetic */}
            <div
              className="pointer-events-none fixed inset-0 z-50 opacity-20 dark:opacity-75"
              style={{
                background:
                  "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)",
              }}
            />
            <div className="pointer-events-none fixed top-0 left-0 h-64 w-64 bg-primary/10 blur-[100px]" />
            <div className="pointer-events-none fixed bottom-0 right-0 h-64 w-64 bg-chart-2/10 blur-[100px]" />

            <div className="flex h-screen flex-col">
              <header className="flex h-12 shrink-0 items-center gap-4 border-b px-4">
                <Link to="/" className="font-mono text-sm font-bold tracking-tight text-primary">
                  orch
                </Link>
                <span className="text-xs text-muted-foreground">cockpit</span>
                <div className="ml-auto">
                  <AnimatedThemeToggler initialScheme={colorScheme} />
                </div>
              </header>
              <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
            </div>
          </QueryClientProvider>
          <Toaster />
          <TanStackDevtools
            config={{ position: "bottom-right" }}
            plugins={[{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> }]}
          />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
