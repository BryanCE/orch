import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'
import { AppBreadcrumbs } from '@/components/PageBreadcrumbs'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'

/** One sub-tool entry in a section's sidebar — a flat list, no sub-categories. */
export interface SubToolNavItem {
  path: string
  label: string
  icon: LucideIcon
}

/** Most-specific-match-wins active path: of every nav item whose path is the
 * current pathname or an ancestor of it, the longest wins — so `/x/users`
 * lights on `/x/users/jane` but yields to a sibling `/x/users/create` item on
 * that page. Returns null when nothing matches. */
function findActiveNavPath(
  pathname: string,
  items: SubToolNavItem[],
): string | null {
  const path = pathname.replace(/\/+$/, '')
  let best: string | null = null
  for (const item of items) {
    const owns = path === item.path || path.startsWith(`${item.path}/`)
    if (owns && (!best || item.path.length > best.length)) best = item.path
  }
  return best
}

/**
 * The single sub-tool navigation chrome: an icon-collapsible sidebar that sits
 * under the app top nav, plus the inset that renders the active sub-tool route
 * behind the app-wide breadcrumb bar. Every section with more than one sub-tool
 * (Vici, LMS, …) renders this with its own `items` — the shell, sizing,
 * active-state, and breadcrumb logic live here once and are never duplicated
 * per section.
 */
export function SubToolSidebar({
  items,
  actions,
}: {
  items: SubToolNavItem[]
  /** Section-wide actions for the right side of the breadcrumb bar (e.g. the
   * LMS jump-to-user search). */
  actions?: ReactNode
}) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const activePath = findActiveNavPath(pathname, items)

  return (
    <SidebarProvider className="min-h-0! h-full flex-1">
      <Sidebar collapsible="icon" className="top-14! h-[calc(100svh-3.5rem)]!">
        <SidebarHeader>
          <SidebarTrigger className="size-7" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <div className="flex h-8 shrink-0 items-center px-2">
              <span className="text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                Tools
              </span>
              <div className="mx-auto hidden h-px w-6 bg-sidebar-border group-data-[collapsible=icon]:block" />
            </div>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.path === activePath}
                    tooltip={item.label}
                  >
                    <Link to={item.path}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="flex min-h-0 flex-1 flex-col">
        <AppBreadcrumbs actions={actions} />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
