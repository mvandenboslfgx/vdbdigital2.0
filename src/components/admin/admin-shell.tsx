"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utilities/cn";
import { VdbLogo } from "@/components/brand/VdbLogo";
import { siteConfig } from "@/config/site";
import { LocaleLink, useLocalePathname } from "@/i18n/locale-link";
import { useI18n } from "@/i18n/provider";
import { LanguageSwitcherBoundary } from "@/i18n/language-switcher-boundary";

interface AdminNavItem {
  label: string;
  href: string;
}

function AdminNavLinks({
  nav,
  onNavigate,
  ariaLabel,
}: {
  nav: AdminNavItem[];
  onNavigate?: () => void;
  ariaLabel: string;
}) {
  const pathname = useLocalePathname();

  return (
    <nav className="space-y-1" aria-label={ariaLabel}>
      {nav.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
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

interface AdminShellProps {
  nav: AdminNavItem[];
  maskedEmail: string;
  role: string;
  children: React.ReactNode;
  logoutAction: (formData: FormData) => void | Promise<void>;
}

export function AdminShell({
  nav,
  maskedEmail,
  role,
  children,
  logoutAction,
}: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const { locale } = useI18n();
  const ui = locale === "en"
    ? { nav: "Admin navigation", open: "Open menu", close: "Close menu", logout: "Log out" }
    : { nav: "Adminnavigatie", open: "Menu openen", close: "Menu sluiten", logout: "Uitloggen" };

  return (
    <div data-surface="dark" className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between border-b border-border bg-surface px-4 h-14 pt-[env(safe-area-inset-top,0px)] min-h-14">
        <LocaleLink
          href="/admin"
          className="inline-flex items-center gap-2 font-semibold font-display"
          aria-label={`${siteConfig.name} Admin`}
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
            aria-controls="admin-mobile-nav"
            aria-label={open ? ui.close : ui.open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="admin-mobile-nav" className="md:hidden border-b border-border bg-surface p-4">
          <AdminNavLinks nav={nav} onNavigate={() => setOpen(false)} ariaLabel={ui.nav} />
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-small text-muted mb-2">{maskedEmail} ({role})</p>
            <form action={logoutAction}>
              <button type="submit" className="text-small text-muted hover:text-foreground">
                {ui.logout}
              </button>
            </form>
          </div>
        </div>
      )}

      <aside className="w-64 border-r border-border bg-surface p-4 hidden md:flex md:flex-col">
        <LocaleLink href="/admin" className="mb-5 inline-flex flex-col gap-1" aria-label={`${siteConfig.name} Admin`}>
          <VdbLogo lockup="header" variant="light" alt="" className="h-9 w-auto" />
          <span className="text-small text-muted">Admin</span>
        </LocaleLink>
        <LanguageSwitcherBoundary size="compact" className="mb-5" />
        <AdminNavLinks nav={nav} ariaLabel={ui.nav} />
        <div className="mt-auto pt-8 space-y-2">
          <p className="text-small text-muted">{maskedEmail} ({role})</p>
          <form action={logoutAction}>
            <button type="submit" className="text-small text-muted hover:text-foreground">
              {ui.logout}
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
