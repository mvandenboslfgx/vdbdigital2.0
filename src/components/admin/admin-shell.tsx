"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utilities/cn";
import { VdbLogo } from "@/components/brand/VdbLogo";
import { siteConfig } from "@/config/site";

export type AdminNavLink = {
  label: string;
  href: string;
};

export type AdminNavGroupView = {
  id: string;
  label: string;
  items: AdminNavLink[];
};

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminNavLinks({
  groups,
  onNavigate,
}: {
  groups: AdminNavGroupView[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-5" aria-label="Admin navigation">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={`${group.id}:${item.href}:${item.label}`}
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
          </div>
        </div>
      ))}
    </nav>
  );
}

interface AdminShellProps {
  groups: AdminNavGroupView[];
  maskedEmail: string;
  role: string;
  children: React.ReactNode;
  logoutAction: (formData: FormData) => void | Promise<void>;
}

export function AdminShell({
  groups,
  maskedEmail,
  role,
  children,
  logoutAction,
}: AdminShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div data-surface="dark" className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between border-b border-border bg-surface px-4 h-14 pt-[env(safe-area-inset-top,0px)] min-h-14">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 font-semibold font-display"
          aria-label={`${siteConfig.name} Command Center`}
        >
          <VdbLogo lockup="header" variant="light" alt="" className="h-8 w-auto" />
        </Link>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-surface-elevated"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          aria-label={open ? "Menu sluiten" : "Menu openen"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div
          id="admin-mobile-nav"
          className="md:hidden border-b border-border bg-surface p-4 max-h-[70vh] overflow-y-auto"
        >
          <AdminNavLinks groups={groups} onNavigate={() => setOpen(false)} />
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-small text-muted mb-2">
              {maskedEmail} ({role})
            </p>
            <form action={logoutAction}>
              <button type="submit" className="text-small text-muted hover:text-foreground">
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      )}

      <aside className="w-64 border-r border-border bg-surface p-4 hidden md:flex md:flex-col overflow-y-auto">
        <Link
          href="/admin"
          className="mb-6 inline-flex flex-col gap-1"
          aria-label={`${siteConfig.name} Command Center`}
        >
          <VdbLogo lockup="header" variant="light" alt="" className="h-9 w-auto" />
          <span className="text-small text-muted">Command Center</span>
        </Link>
        <AdminNavLinks groups={groups} />
        <div className="mt-auto pt-8 space-y-2">
          <p className="text-small text-muted">
            {maskedEmail} ({role})
          </p>
          <form action={logoutAction}>
            <button type="submit" className="text-small text-muted hover:text-foreground">
              Uitloggen
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 md:p-8 min-w-0">{children}</main>
    </div>
  );
}
