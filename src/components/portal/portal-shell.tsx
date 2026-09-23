"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utilities/cn";
import { VdbLogo } from "@/components/brand/VdbLogo";
import { siteConfig } from "@/config/site";
import { LocaleLink, useLocalePathname } from "@/i18n/locale-link";
import { useI18n } from "@/i18n/provider";
import { LanguageSwitcherBoundary } from "@/i18n/language-switcher-boundary";

export type PortalNavItem = { label: string; href: string };

function PortalNavLinks({
  nav,
  onNavigate,
  ariaLabel,
}: {
  nav: PortalNavItem[];
  onNavigate?: () => void;
  ariaLabel: string;
}) {
  const pathname = useLocalePathname();

  return (
    <nav className="space-y-1" aria-label={ariaLabel}>
      {nav.map((item) => {
        const active =
          item.href === "/portal"
            ? pathname === "/portal"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <LocaleLink
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "block px-3 py-2 rounded-lg text-sm transition-colors",
              active
                ? "bg-primary-soft text-primary"
                : "text-muted hover:text-foreground hover:bg-surface-elevated",
            )}
          >
            {item.label}
          </LocaleLink>
        );
      })}
    </nav>
  );
}

interface PortalShellProps {
  nav: PortalNavItem[];
  displayName: string;
  organizationName: string;
  children: React.ReactNode;
}

export function PortalShell({
  nav,
  displayName,
  organizationName,
  children,
}: PortalShellProps) {
  const [open, setOpen] = useState(false);
  const { locale } = useI18n();
  const ui = locale === "en"
    ? { portal: "Customer portal", nav: "Customer portal navigation", logout: "Log out", open: "Open menu", close: "Close menu" }
    : { portal: "Klantenportaal", nav: "Klantenportaal navigatie", logout: "Uitloggen", open: "Menu openen", close: "Menu sluiten" };

  return (
    <div data-surface="dark" className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between border-b border-border bg-surface px-4 h-14 pt-[env(safe-area-inset-top,0px)] min-h-14">
        <LocaleLink
          href="/portal"
          className="inline-flex items-center"
          aria-label={`${siteConfig.name} — ${ui.portal}`}
        >
          <VdbLogo lockup="header" variant="light" alt="" className="h-8 w-auto" />
        </LocaleLink>
        <div className="flex items-center gap-2">
          <LanguageSwitcherBoundary size="compact" />
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-surface-elevated"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="portal-mobile-nav"
            aria-label={open ? ui.close : ui.open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="portal-mobile-nav" className="md:hidden border-b border-border bg-surface px-4 py-4">
          <p className="text-small text-muted mb-3">{organizationName}</p>
          <PortalNavLinks nav={nav} onNavigate={() => setOpen(false)} ariaLabel={ui.nav} />
          <LocaleLink href="/uitloggen" className="mt-4 block px-3 py-2 text-sm text-muted hover:text-foreground">
            {ui.logout}
          </LocaleLink>
        </div>
      )}

      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-surface md:min-h-screen">
        <div className="p-5 border-b border-border">
          <LocaleLink href="/portal" className="inline-flex flex-col gap-1" aria-label={`${siteConfig.name} — ${ui.portal}`}>
            <VdbLogo lockup="header" variant="light" alt="" className="h-9 w-auto" />
            <span className="text-small text-muted">{ui.portal}</span>
          </LocaleLink>
          <p className="text-small mt-3 truncate">{organizationName}</p>
          <p className="text-small text-muted truncate">{displayName}</p>
          <LanguageSwitcherBoundary size="compact" className="mt-4" />
        </div>
        <div className="flex-1 p-3">
          <PortalNavLinks nav={nav} ariaLabel={ui.nav} />
        </div>
        <div className="p-3 border-t border-border">
          <LocaleLink href="/uitloggen" className="block px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-surface-elevated">
            {ui.logout}
          </LocaleLink>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto">{children}</main>
    </div>
  );
}
