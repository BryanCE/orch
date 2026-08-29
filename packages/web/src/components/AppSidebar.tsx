import { Link, useLocation } from "@tanstack/react-router";
import { Activity, ListTodo, FolderGit2, Terminal } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { DaemonBadge } from "@/components/DaemonBadge";
import { useFleet } from "@/hooks/use-fleet";
import type { ColorSchemeId } from "@/lib/color-scheme";

const cockpitNav = [
  { path: "/events", label: "Activity", icon: Activity, exact: false },
  { path: "/queue", label: "Queue", icon: ListTodo, exact: false },
];

/**
 * Primary application navigation — a full-height sidebar that collapses to an
 * icon rail (the LMS sub-tool pattern, promoted to app-level chrome). Top group
 * is the global cockpit; second group lists orch spaces by their own names.
 */
export function AppSidebar({ initialScheme }: { initialScheme: ColorSchemeId }) {
  const pathname = useLocation({ select: (l) => l.pathname });
  const { data } = useFleet();
  const spaces = data?.spaces ?? [];
  const isActive = (path: string, exact: boolean) =>
    exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1">
          {/* logo IS the home link — no separate god-view nav item */}
          <Link to="/" className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Terminal className="size-5 shrink-0 text-primary" />
            <span className="font-mono text-sm font-bold tracking-wider text-primary">orch</span>
          </Link>
          {/* always visible — this is the only way to re-expand when collapsed */}
          <SidebarTrigger className="ml-auto size-7 group-data-[collapsible=icon]:ml-0" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Cockpit</SidebarGroupLabel>
          <SidebarMenu>
            {cockpitNav.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={isActive(item.path, item.exact)} tooltip={item.label}>
                  <Link to={item.path}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Spaces</SidebarGroupLabel>
          <SidebarMenu>
            {spaces.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                none running
              </p>
            )}
            {spaces.map((space) => (
              <SidebarMenuItem key={space.slug}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(`/spaces/${space.slug}`)}
                  tooltip={space.name}
                >
                  <Link to="/spaces/$slug" params={{ slug: space.slug }}>
                    <FolderGit2 />
                    <span className="flex-1 truncate">{space.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <DaemonBadge />
        <div className="flex items-center px-1">
          <AnimatedThemeToggler initialScheme={initialScheme} />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
