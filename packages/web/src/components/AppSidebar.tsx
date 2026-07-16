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
import { useFleet } from "@/hooks/use-fleet";
import type { ColorSchemeId } from "@/lib/color-scheme";

const cockpitNav = [
  { path: "/events", label: "Activity", icon: Activity, exact: false },
  { path: "/queue", label: "Queue", icon: ListTodo, exact: false },
];

/**
 * Primary application navigation — a full-height sidebar that collapses to an
 * icon rail (the LMS sub-tool pattern, promoted to app-level chrome). Top group
 * is the global cockpit; second group lists workspaces BY NAME with the herdr
 * workspace id as a muted secondary.
 */
export function AppSidebar({ initialScheme }: { initialScheme: ColorSchemeId }) {
  const pathname = useLocation({ select: (l) => l.pathname });
  const { data: workspaces = [] } = useFleet();
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
          <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
          <SidebarMenu>
            {workspaces.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                none running
              </p>
            )}
            {workspaces.map((ws) => (
              <SidebarMenuItem key={ws.slug}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(`/ws/${ws.slug}`)}
                  tooltip={ws.name === ws.id ? ws.name : `${ws.name} (${ws.id})`}
                >
                  <Link to="/ws/$slug" params={{ slug: ws.slug }}>
                    <FolderGit2 />
                    <span className="flex-1 truncate">{ws.name}</span>
                    {ws.name !== ws.id && (
                      <span className="font-mono text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                        {ws.id}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center px-1">
          <AnimatedThemeToggler initialScheme={initialScheme} />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
