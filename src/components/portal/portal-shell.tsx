"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Calendar,
  CreditCard,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  Shield,
  ClipboardList,
  User,
  LifeBuoy,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utilities/cn";
import { VdbLogo } from "@/components/brand/VdbLogo";
import { siteConfig } from "@/config/site";

export type PortalNavItem = { label: string; href: string };

const NAV_ICONS: Record<string, LucideIcon> = {
  "/portal": LayoutDashboard,
  "/portal/projecten": FolderKanban,
  "/portal/intake": ClipboardList,
  "/portal/offertes": FileText,
  "/portal/bestellingen": Package,
  "/portal/facturen": Receipt,
  "/portal/betalingen": CreditCard,
  "/portal/afspraken": Calendar,
  "/portal/documenten": FileText,
  "/portal/berichten": MessageSquare,
  "/portal/support": LifeBuoy,
  "/portal/meldingen": Bell,
  "/portal/profiel": User,
  "/portal/beveiliging": Shield,
  "/portal/instellingen": Settings,
};

function PortalNavLinks({
  nav,
  onNavigate,
}: {
  nav: PortalNavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5" aria-label="Klantenportaal navigatie">
      {nav.map((item) => {
        const active =
          item.href === "/portal"
            ? pathname === "/portal"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = NAV_ICONS[item.href] ?? FileText;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-gradient-to-r from-primary/20 to-primary/5 text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                : "text-muted hover:text-foreground hover:bg-white/[0.04]",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon
              className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "opacity-70")}
              aria-hidden
            />
            <span className={cn(active && "font-medium")}>{item.label}</span>
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
  children: React.ReactNode;
}

export function PortalShell({
  nav,
  displayName,
  organizationName,
  children,
}: PortalShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      data-surface="dark"
      className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.08),_transparent_45%),linear-gradient(180deg,#0b0f14_0%,#0a0c10_100%)] flex flex-col md:flex-row"
    >
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-white/8 bg-[#0c1016]/90 backdrop-blur-md px-4 h-14 pt-[env(safe-area-inset-top,0px)] min-h-14">
        <Link
          href="/portal"
          className="inline-flex items-center"
          aria-label={`${siteConfig.name} — klantenportaal`}
        >
          <VdbLogo lockup="header" variant="light" alt="" className="h-8 w-auto" />
        </Link>
        <button
          type="button"
          className="p-2 rounded-xl hover:bg-white/5"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="portal-mobile-nav"
          aria-label={open ? "Menu sluiten" : "Menu openen"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div
          id="portal-mobile-nav"
          className="md:hidden border-b border-white/8 bg-[#0c1016]/95 px-4 py-4 max-h-[70vh] overflow-y-auto"
        >
          <p className="text-xs uppercase tracking-[0.14em] text-muted mb-1">
            Klantenportaal
          </p>
          <p className="text-small font-medium truncate mb-4">{organizationName}</p>
          <PortalNavLinks nav={nav} onNavigate={() => setOpen(false)} />
          <form action="/uitloggen" method="POST" className="mt-4">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Uitloggen
            </button>
          </form>
        </div>
      ) : null}

      <aside className="hidden md:flex md:w-72 md:flex-col md:border-r md:border-white/8 md:bg-[#0c1016]/80 md:backdrop-blur-sm md:min-h-screen">
        <div className="p-6 border-b border-white/8">
          <Link
            href="/portal"
            className="inline-flex flex-col gap-1"
            aria-label={`${siteConfig.name} — klantenportaal`}
          >
            <VdbLogo lockup="header" variant="light" alt="" className="h-9 w-auto" />
            <span className="text-xs uppercase tracking-[0.16em] text-muted">
              Klantenportaal
            </span>
          </Link>
          <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <p className="text-sm font-medium truncate">{organizationName}</p>
            <p className="text-small text-muted truncate">{displayName}</p>
          </div>
        </div>
        <div className="flex-1 p-3 overflow-y-auto">
          <PortalNavLinks nav={nav} />
        </div>
        <div className="p-3 border-t border-white/8">
          <form action="/uitloggen" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:text-foreground hover:bg-white/[0.04]"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Uitloggen
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 md:p-10 max-w-6xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
