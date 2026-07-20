import { Link, useMatches } from '@tanstack/react-router'
import { Fragment, type ReactNode } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

/** One entry in a page's crumb trail. The last crumb is the current page and
 * needs no `to`; ancestors link via `to` (+ `params` for dynamic routes). */
export interface PageCrumb {
  label: string
  to?: string
  params?: Record<string, string>
}

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /** Crumb trail for this route, built from its params. Declared on the
     * route, rendered app-wide by {@link AppBreadcrumbs}. */
    crumbs?: (params: Record<string, string>) => PageCrumb[]
  }
}

/**
 * The application-wide breadcrumb bar: reads the deepest matched route that
 * declares `staticData.crumbs` and renders its trail top-left of the content
 * area, with optional section `actions` (e.g. the LMS jump-to-user search) on
 * the right. Renders nothing when there are neither crumbs nor actions.
 */
export function AppBreadcrumbs({ actions }: { actions?: ReactNode }) {
  const matches = useMatches()
  const match = [...matches]
    .reverse()
    .find((m) => m.staticData.crumbs !== undefined)
  const crumbs = match?.staticData.crumbs?.(match.params as Record<string, string>)
  if (!crumbs && !actions) return null

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 px-4 pt-3">
      {crumbs ? <PageBreadcrumbs crumbs={crumbs} /> : <span />}
      {actions}
    </div>
  )
}

/**
 * The single page-level breadcrumb trail — every page that sits deeper than a
 * sidebar tab renders this in its own header instead of a back button. Pages
 * declare their trail explicitly; no path-derivation magic.
 */
export function PageBreadcrumbs({ crumbs }: { crumbs: PageCrumb[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast || !crumb.to ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to} params={crumb.params}>
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
