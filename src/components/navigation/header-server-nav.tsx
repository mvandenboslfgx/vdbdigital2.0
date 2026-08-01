import "server-only";

import { cn } from "@/lib/utilities/cn";
import { paths } from "@/i18n/config";
import { ServerLocaleLink } from "@/i18n/server-locale-link";
import { ServerLanguageSwitcher } from "@/i18n/server-language-switcher";
import { VdbLogo } from "@/components/brand/VdbLogo";

export type ServerMobileNavLabels = {
  openMenu: string;
  closeMenu: string;
  mobileNav: string;
  homeAria: string;
  solutions: string;
  forBusiness: string;
  company: string;
  login: string;
  scheduleIntro: string;
  quote: string;
  solutionsOverview: string;
  solutionsOverviewHref: string;
  forBusinessHref: string;
  introHref: string;
  solutionsItems: { href: string; label: string }[];
  businessItems: { href: string; label: string }[];
  primaryLinks: { href: string; label: string }[];
  companyItems: { href: string; label: string }[];
};

/**
 * Zero-JS mobile navigation via native <details>/<summary>.
 * Avoids shipping React islands on public marketing first paint.
 */
export async function HeaderMobileNavServer({
  pathname,
  labels,
}: {
  pathname: string;
  labels: ServerMobileNavLabels;
}) {
  const linkClass = (target: string, exact = false) =>
    cn(
      "block rounded-lg px-3 py-3 text-base transition-colors",
      (exact
        ? pathname === target
        : pathname === target || pathname.startsWith(`${target}/`))
        ? "bg-primary-soft text-primary"
        : "text-muted hover:bg-surface-elevated hover:text-foreground",
    );

  return (
    <details className="group/mobile relative xl:hidden">
          <summary
        data-testid="mobile-menu-button"
        role="button"
        className="flex h-11 w-11 list-none items-center justify-center rounded-lg hover:bg-surface-elevated marker:content-none [&::-webkit-details-marker]:hidden"
        aria-label={labels.openMenu}
      >
        <span className="group-open/mobile:hidden" aria-hidden="true">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </span>
        <span className="hidden group-open/mobile:inline" aria-hidden="true">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </span>
      </summary>

      <div
        data-testid="mobile-nav-drawer"
        className="fixed inset-x-0 top-0 z-50 flex max-h-dvh flex-col bg-surface pt-[env(safe-area-inset-top,0px)]"
        role="dialog"
        aria-label={labels.mobileNav}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border page-pad-x">
          <ServerLocaleLink
            href="/"
            aria-label={labels.homeAria ?? "VDB Digital Software"}
            className="inline-flex shrink-0 items-center"
          >
            <VdbLogo
              lockup="header"
              variant="light"
              className="h-9 w-auto max-w-[min(10rem,calc(100vw-11rem))] object-contain object-left"
              alt=""
            />
          </ServerLocaleLink>
          <div className="flex items-center gap-2">
            <ServerLanguageSwitcher compact />
            {/* Closing control: clicking summary toggles details */}
            <span className="flex h-11 w-11 items-center justify-center rounded-lg text-muted" aria-hidden="true">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </span>
          </div>
        </div>

        <nav
          className="flex-1 overflow-y-auto overscroll-contain page-pad-x py-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          aria-label={labels.mobileNav}
        >
          <details open className="border-b border-border">
            <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-left text-base font-medium marker:content-none [&::-webkit-details-marker]:hidden">
              {labels.solutions}
              <svg className="h-5 w-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="space-y-0.5 pb-3 pl-1">
              <ServerLocaleLink
                href={labels.solutionsOverviewHref}
                className={linkClass(labels.solutionsOverviewHref)}
              >
                {labels.solutionsOverview}
              </ServerLocaleLink>
              {labels.solutionsItems.map((item) => (
                <ServerLocaleLink
                  key={item.href}
                  href={item.href}
                  className={linkClass(item.href)}
                >
                  {item.label}
                </ServerLocaleLink>
              ))}
            </div>
          </details>

          <details className="border-b border-border">
            <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-left text-base font-medium marker:content-none [&::-webkit-details-marker]:hidden">
              {labels.forBusiness}
              <svg className="h-5 w-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="space-y-0.5 pb-3 pl-1">
              <ServerLocaleLink
                href={labels.forBusinessHref}
                className={linkClass(labels.forBusinessHref)}
              >
                {labels.forBusiness}
              </ServerLocaleLink>
              {labels.businessItems.map((item) => (
                <ServerLocaleLink
                  key={item.href}
                  href={item.href}
                  className={linkClass(item.href)}
                >
                  {item.label}
                </ServerLocaleLink>
              ))}
            </div>
          </details>

          <details className="border-b border-border">
            <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-left text-base font-medium marker:content-none [&::-webkit-details-marker]:hidden">
              {labels.company}
              <svg className="h-5 w-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="space-y-0.5 pb-3 pl-1">
              {labels.companyItems.map((item) => (
                <ServerLocaleLink
                  key={item.href}
                  href={item.href}
                  className={linkClass(item.href)}
                >
                  {item.label}
                </ServerLocaleLink>
              ))}
            </div>
          </details>

          {labels.primaryLinks.map((item) => (
            <ServerLocaleLink
              key={item.href}
              href={item.href}
              className={cn(linkClass(item.href), "border-b border-border")}
            >
              {item.label}
            </ServerLocaleLink>
          ))}

          <div className="mt-4 space-y-2">
            <ServerLocaleLink
              href={paths.login}
              className="block rounded-lg border border-border px-3 py-3 text-center text-base"
            >
              {labels.login}
            </ServerLocaleLink>
            <ServerLocaleLink
              href={labels.introHref}
              className="block rounded-lg bg-primary px-3 py-3 text-center text-base text-primary-fg"
            >
              {labels.scheduleIntro}
            </ServerLocaleLink>
            <ServerLocaleLink
              href={paths.quote}
              className="block rounded-lg border border-primary/40 px-3 py-3 text-center text-base text-primary"
            >
              {labels.quote}
            </ServerLocaleLink>
          </div>
        </nav>
      </div>
    </details>
  );
}

export async function HeaderCompanyNavServer({
  pathname,
  companyLabel,
  companyMenuLabel,
  items,
}: {
  pathname: string;
  companyLabel: string;
  companyMenuLabel: string;
  items: { href: string; label: string }[];
}) {
  const companyActive = items.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <details className="group/company relative shrink-0">
      <summary
        className={cn(
          "text-nowrap-safe inline-flex cursor-pointer list-none items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors marker:content-none [&::-webkit-details-marker]:hidden",
          companyActive
            ? "text-primary"
            : "text-muted hover:text-foreground",
        )}
        aria-label={companyMenuLabel}
      >
        <span className="text-nowrap-safe">{companyLabel}</span>
        <svg
          className="h-3.5 w-3.5 shrink-0 transition-transform group-open/company:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div
        role="menu"
        className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] rounded-md border border-border bg-surface p-1 shadow-lg"
      >
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <ServerLocaleLink
              key={item.href}
              href={item.href}
              role="menuitem"
              className={cn(
                "block rounded px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground",
              )}
            >
              {item.label}
            </ServerLocaleLink>
          );
        })}
      </div>
    </details>
  );
}
