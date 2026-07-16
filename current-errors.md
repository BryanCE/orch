$ oxlint . && bunx tsc --noEmit && fallow check
Found 0 warnings and 0 errors.
Finished in 350.8s on 194 files with 65 rules using 4 threads.
fallow: `check` is deprecated; use `dead-code` instead.
loaded config: /mnt/c/Users/Bryan/Documents/orch/.fallowrc.json
  71 entry points detected (63 plugin, 8 package.json)

── Unused Code ─────────────────────────────────────

● Unused files (33)
  packages/web/src/components/SubToolSidebar.tsx
  packages/web/src/components/ui/accordion.tsx
  packages/web/src/components/ui/alert-dialog.tsx
  packages/web/src/components/ui/alert.tsx
  packages/web/src/components/ui/animated-beam.tsx
  packages/web/src/components/ui/animated-gradient-text.tsx
  packages/web/src/components/ui/animated-list.tsx
  packages/web/src/components/ui/avatar.tsx
  packages/web/src/components/ui/button-group.tsx
  packages/web/src/components/ui/calendar.tsx
  ... and 23 more (--format json for full list)
  Files not reachable from any entry point — https://docs.fallow.tools/explanations/dead-code#unused-files
  To suppress: // fallow-ignore-file unused-file

● Unused exports (39)
  packages/web/src/components/ui/sidebar.tsx (11)
    :706 SidebarGroupAction
    :707 SidebarGroupContent
    :710 SidebarInput
    :713 SidebarMenuAction
    :714 SidebarMenuBadge
    ... and 6 more (--format json for full list)
  packages/web/src/components/ui/dropdown-menu.tsx (10)
    :241 DropdownMenuPortal
    :244 DropdownMenuGroup
    :245 DropdownMenuLabel
    :247 DropdownMenuCheckboxItem
    :248 DropdownMenuRadioGroup
    ... and 5 more (--format json for full list)
  packages/web/src/components/ui/dialog.tsx (5)
    :132 DialogClose
    :135 DialogFooter
    :137 DialogOverlay
    :138 DialogPortal
    :140 DialogTrigger
  packages/web/src/components/ui/card.tsx (2)
    :87 CardFooter
    :89 CardAction
  packages/web/src/components/ui/sheet.tsx (2)
    :134 SheetTrigger
    :135 SheetClose
  packages/web/src/lib/color-scheme.ts (2)
    :25 setColorSchemeCookie
    :36 getColorScheme
  packages/web/src/components/PageBreadcrumbs.tsx
    :55 PageBreadcrumbs
  packages/web/src/components/ui/badge.tsx
    :46 badgeVariants
  packages/web/src/components/ui/breadcrumb.tsx
    :108 BreadcrumbEllipsis
  packages/web/src/components/ui/scroll-area.tsx
    :56 ScrollBar
  ... and 3 more in 3 files (--format json for full list)
  Exported symbols with no known consumers — https://docs.fallow.tools/explanations/dead-code#unused-exports
  To auto-fix: fallow fix --dry-run
  To suppress: // fallow-ignore-next-line unused-export
  (3 more in files already reported as unused)

● Unused type exports (1)
  packages/web/src/server/orch.ts
    :26 DaemonStatus
  Type exports with no known consumers — https://docs.fallow.tools/explanations/dead-code#unused-types

● Unused class members (4)
  src/backends/tmux/index.ts (2)
    :85 TmuxBackend.list
    :108 TmuxBackend.applyLayout
  src/backends/headless/index.ts
    :257 HeadlessBackend.applyLayout
  src/backends/herdr/index.ts
    :219 HerdrBackend.applyLayout
  Class methods or properties never referenced outside their class — https://docs.fallow.tools/explanations/dead-code#unused-class-members
  To suppress: // fallow-ignore-next-line unused-class-member

── Dependencies ─────────────────────────────────────

● Unused dependencies (1)
  @tanstack/react-db
  Listed in dependencies but never imported — https://docs.fallow.tools/explanations/dead-code#unused-dependencies

── Maintenance ─────────────────────────────────────

● Stale suppressions (1)
  src/adapters/codex.ts:233:0 // fallow-ignore-next-line unused-class-member (no unused-class-member issue found on the next line)
  Suppression comments or JSDoc tags that no longer match any issue — https://docs.fallow.tools/explanations/dead-code#stale-suppressions

✗ 33 files · 39 exports · 1 type · 4 class members · 1 unused dependency · 1 stale suppression (26.39s)
  82 issues · 6 suppressed · 1 stale suppression
error: script "check" exited with code 1
