"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utilities/cn";
import { VdbLogo } from "@/components/brand/VdbLogo";
import { stripLocalePrefix } from "@/i18n/config";

export type PortalNavItem = { label: string; href: string };

export type PortalShellLabels = {
  navAria: string;
  brandAria: string;
  logout: string;
  openMenu: string;
  closeMenu: string;
  portalSubtitle: string;
};

function bareHref(href: string): string {
  return stripLocalePrefix(href).pathname;
}

function PortalNavLinks({
  nav,
  onNavigate,
  navAria,
}: {
  nav: PortalNavItem[];
  onNavigate?: () => void;
  navAria: string;
}) {
  const pathname = usePathname();
  const barePath = stripLocalePrefix(pathname).pathname;

  return (
    <nav className="space-y-1" aria-label={navAria}>
      {nav.map((item) => {
        const itemBare = bareHref(item.href);
        const active =
          itemBare === "/portal"
            ? barePath === "/portal"
            : barePath === itemBare || barePath.startsWith(`${itemBare}/`);
        return (
          <Link
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
          </Link>
        );
      })}
    </nav>
  );
}

interface PortalShellProps {
  nav: PortalNavItem[];
  displayName: string;
  organizationName: string;
  labels: PortalShellLabels;
  children: React.ReactNode;
}

export function PortalShell({
  nav,
  displayName,
  organizationName,
  labels,
  children,
}: PortalShellProps) {
  const [open, setOpen] = useState(false);
  const homeHref = nav[0]?.href ?? "/portal";
  const logoutHref = homeHref.startsWith("/nl") ? "/nl/uitloggen" : "/uitloggen";

  return (
    <div
      data-surface="dark"
      className="min-h-screen bg-background flex flex-col md:flex-row"
    >
      <div className="md:hidden flex items-center justify-between border-b border-border bg-surface px-4 h-14 pt-[env(safe-area-inset-top,0px)] min-h-14">
        <Link
          href={homeHref}
          className="inline-flex items-center"
          aria-label={labels.brandAria}
        >
          <VdbLogo lockup="header" variant="light" alt="" className="h-8 w-auto" />
        </Link>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-surface-elevated"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="portal-mobile-nav"
          aria-label={open ? labels.closeMenu : labels.openMenu}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div
          id="portal-mobile-nav"
          className="md:hidden border-b border-border bg-surface px-4 py-4"
        >
          <p className="text-small text-muted mb-3">{organizationName}</p>
          <PortalNavLinks
            nav={nav}
            navAria={labels.navAria}
            onNavigate={() => setOpen(false)}
          />
          <Link
            href={logoutHref}
            className="mt-4 block px-3 py-2 text-sm text-muted hover:text-foreground"
          >
            {labels.logout}
          </Link>
        </div>
      )}

      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-surface md:min-h-screen">
        <div className="p-5 border-b border-border">
          <Link
            href={homeHref}
            className="inline-flex flex-col gap-1"
            aria-label={labels.brandAria}
          >
            <VdbLogo lockup="header" variant="light" alt="" className="h-9 w-auto" />
            <span className="text-small text-muted">{labels.portalSubtitle}</span>
          </Link>
          <p className="text-small mt-3 truncate">{organizationName}</p>
          <p className="text-small text-muted truncate">{displayName}</p>
        </div>
        <div className="flex-1 p-3">
          <PortalNavLinks nav={nav} navAria={labels.navAria} />
        </div>
        <div className="p-3 border-t border-border">
          <Link
            href={logoutHref}
            className="block px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-surface-elevated"
          >
            {labels.logout}
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
