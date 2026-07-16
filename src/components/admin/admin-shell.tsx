"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utilities/cn";
import { siteConfig } from "@/config/site";

interface AdminNavItem {
  label: string;
  href: string;
}

function AdminNavLinks({
  nav,
  onNavigate,
}: {
  nav: AdminNavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1" aria-label="Admin navigation">
      {nav.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
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

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between border-b border-border bg-surface px-4 h-14 pt-[env(safe-area-inset-top,0px)] min-h-14">
        <Link href="/admin" className="font-semibold font-display">
          {siteConfig.name} Admin
        </Link>
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-surface-elevated"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div
          id="admin-mobile-nav"
          className="md:hidden border-b border-border bg-surface p-4"
        >
          <AdminNavLinks nav={nav} onNavigate={() => setOpen(false)} />
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-small text-muted mb-2">
              {maskedEmail} ({role})
            </p>
            <form action={logoutAction}>
              <button type="submit" className="text-small text-muted hover:text-foreground">
                Log out
              </button>
            </form>
          </div>
        </div>
      )}

      <aside className="w-64 border-r border-border bg-surface p-4 hidden md:flex md:flex-col">
        <Link href="/admin" className="font-semibold text-lg font-display block mb-8">
          {siteConfig.name} Admin
        </Link>
        <AdminNavLinks nav={nav} />
        <div className="mt-auto pt-8 space-y-2">
          <p className="text-small text-muted">
            {maskedEmail} ({role})
          </p>
          <form action={logoutAction}>
              <button type="submit" className="text-small text-muted hover:text-foreground">
                Log out
              </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
