import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/sonner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DaemonGate } from "@/components/DaemonGate";
import { AppSidebar } from "@/components/AppSidebar";
import { AppBreadcrumbs } from "@/components/PageBreadcrumbs";
import { NotFoundPage } from "@/components/common/NotFoundPage";
import { getColorSchemeCookie } from "@/lib/color-scheme";
import { getThemeModeCookie } from "@/lib/theme-mode";

import { THEME_CSS_URLS } from "@/themes";
import appCss from "@/styles.css?url";

// One shared query cache for the whole app.
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

export const Route = createRootRoute({
  notFoundComponent: NotFoundPage,
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

            <DaemonGate>
              <SidebarProvider>
                <AppSidebar initialScheme={colorScheme} />
                <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <AppBreadcrumbs />
                  <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
                </SidebarInset>
              </SidebarProvider>
            </DaemonGate>
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
