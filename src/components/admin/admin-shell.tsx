"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utilities/cn";
import { VdbLogo } from "@/components/brand/VdbLogo";
import { stripLocalePrefix } from "@/i18n/config";

interface AdminNavItem {
  label: string;
  href: string;
}

export type AdminShellLabels = {
  navAria: string;
  brandAria: string;
  areaLabel: string;
  logout: string;
  openMenu: string;
  closeMenu: string;
};

/** Nav hrefs carry the active locale prefix; matching must ignore it. */
function bareHref(href: string): string {
  return stripLocalePrefix(href).pathname;
}

function AdminNavLinks({
  nav,
  onNavigate,
  navAria,
}: {
  nav: AdminNavItem[];
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
          itemBare === "/admin"
            ? barePath === "/admin"
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

interface AdminShellProps {
  nav: AdminNavItem[];
  maskedEmail: string;
  role: string;
  labels: AdminShellLabels;
  children: React.ReactNode;
  logoutAction: (formData: FormData) => void | Promise<void>;
  /** Rendered server-side (`ServerLanguageSwitcher`) and passed in as a slot. */
  languageSwitcher?: React.ReactNode;
}

export function AdminShell({
  nav,
  maskedEmail,
  role,
  labels,
  children,
  logoutAction,
  languageSwitcher,
}: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const homeHref = nav[0]?.href ?? "/admin";

  return (
    <div data-surface="dark" className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between border-b border-border bg-surface px-4 h-14 pt-[env(safe-area-inset-top,0px)] min-h-14">
        <Link
          href={homeHref}
          className="inline-flex items-center gap-2 font-semibold font-display"
          aria-label={labels.brandAria}
        >
          <VdbLogo lockup="header" variant="light" alt="" className="h-8 w-auto" />
        </Link>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-surface-elevated"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          aria-label={open ? labels.closeMenu : labels.openMenu}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div
          id="admin-mobile-nav"
          className="md:hidden border-b border-border bg-surface p-4"
        >
          <AdminNavLinks
            nav={nav}
            navAria={labels.navAria}
            onNavigate={() => setOpen(false)}
          />
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <p className="text-small text-muted">
              {maskedEmail} ({role})
            </p>
            {languageSwitcher}
            <form action={logoutAction}>
              <button type="submit" className="text-small text-muted hover:text-foreground">
                {labels.logout}
              </button>
            </form>
          </div>
        </div>
      )}

      <aside className="w-64 border-r border-border bg-surface p-4 hidden md:flex md:flex-col">
        <Link
          href={homeHref}
          className="mb-8 inline-flex flex-col gap-1"
          aria-label={labels.brandAria}
        >
          <VdbLogo lockup="header" variant="light" alt="" className="h-9 w-auto" />
          <span className="text-small text-muted">{labels.areaLabel}</span>
        </Link>
        <AdminNavLinks nav={nav} navAria={labels.navAria} />
        <div className="mt-auto pt-8 space-y-3">
          <p className="text-small text-muted">
            {maskedEmail} ({role})
          </p>
          {languageSwitcher}
          <form action={logoutAction}>
            <button type="submit" className="text-small text-muted hover:text-foreground">
              {labels.logout}
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
