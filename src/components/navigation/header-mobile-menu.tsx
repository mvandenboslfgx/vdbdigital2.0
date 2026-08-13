"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utilities/cn";
import { BrandLink } from "@/components/brand/BrandLink";
import { paths } from "@/i18n/config";
import { LocaleLink } from "@/i18n/locale-link";
import { LanguageSwitcherBoundary } from "@/i18n/language-switcher-boundary";

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

export type MobileNavItem = {
  href: string;
  label: string;
};

export type HeaderMobileMenuLabels = {
  openMenu: string;
  closeMenu: string;
  mobileNav: string;
  solutions: string;
  forBusiness: string;
  company: string;
  shop: string;
  login: string;
  scheduleIntro: string;
  quote: string;
  solutionsOverview: string;
  solutionsOverviewHref: string;
  forBusinessHref: string;
  introHref: string;
  solutionsItems: MobileNavItem[];
  businessItems: MobileNavItem[];
  primaryLinks: MobileNavItem[];
  companyItems: MobileNavItem[];
};

type HeaderMobileMenuProps = {
  pathname: string;
  labels: HeaderMobileMenuLabels;
};

function useLockBody(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}

function AccordionGroup({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const buttonId = useId();

  return (
    <div className="border-b border-border">
      <button
        type="button"
        id={buttonId}
        className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-base font-medium text-foreground touch-target"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <IconChevron
          className={cn(
            "h-5 w-5 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="pb-3">
        <div className="space-y-0.5 pl-1">{children}</div>
      </div>
    </div>
  );
}

export function HeaderMobileMenu({ pathname, labels }: HeaderMobileMenuProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const closeMenu = useCallback(() => setMobileOpen(false), []);

  useLockBody(mobileOpen);

  useEffect(() => {
    if (!mobileOpen) return;
    const panel = panelRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    const menuButton = menuButtonRef.current;
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      menuButton?.focus();
    };
  }, [mobileOpen, closeMenu]);

  const linkClass = (target: string, exact = false) =>
    cn(
      "block rounded-lg px-3 py-3 text-base transition-colors",
      (exact ? pathname === target : pathname === target || pathname.startsWith(`${target}/`))
        ? "bg-primary-soft text-primary"
        : "text-muted hover:bg-surface-elevated hover:text-foreground",
    );

  return (
    <>
      <button
        ref={menuButtonRef}
        type="button"
        data-testid="mobile-menu-button"
        className="xl:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-surface-elevated"
        onClick={() => setMobileOpen((open) => !open)}
        aria-expanded={mobileOpen}
        aria-controls={panelId}
        aria-label={mobileOpen ? labels.closeMenu : labels.openMenu}
      >
        {mobileOpen ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 xl:hidden"
            aria-label={labels.closeMenu}
            onClick={closeMenu}
          />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label={labels.mobileNav}
            data-testid="mobile-nav-drawer"
            className="fixed inset-x-0 top-0 z-50 flex max-h-dvh flex-col bg-surface xl:hidden pt-[env(safe-area-inset-top,0px)]"
          >
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border page-pad-x">
              <BrandLink
                variant="light"
                logoClassName="h-9 w-auto max-w-[min(10rem,calc(100vw-11rem))] object-contain object-left"
              />
              <div className="flex items-center gap-2">
                <LanguageSwitcherBoundary compact />
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-elevated"
                  onClick={closeMenu}
                  aria-label={labels.closeMenu}
                >
                  <IconClose className="h-5 w-5" />
                </button>
              </div>
            </div>

            <nav
              className="flex-1 overflow-y-auto overscroll-contain page-pad-x py-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
              aria-label={labels.mobileNav}
            >
              <AccordionGroup title={labels.solutions} defaultOpen>
                <LocaleLink
                  href={labels.solutionsOverviewHref}
                  onClick={closeMenu}
                  className={linkClass(paths.solutions, true)}
                >
                  {labels.solutionsOverview}
                </LocaleLink>
                {labels.solutionsItems.map((item) => (
                  <LocaleLink
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={linkClass(item.href)}
                  >
                    {item.label}
                  </LocaleLink>
                ))}
              </AccordionGroup>

              <LocaleLink
                href={paths.shop}
                onClick={closeMenu}
                className={cn(linkClass(paths.shop), "border-b border-border rounded-none")}
              >
                {labels.shop}
              </LocaleLink>

              <AccordionGroup title={labels.forBusiness}>
                <LocaleLink
                  href={labels.forBusinessHref}
                  onClick={closeMenu}
                  className={linkClass(paths.forBusiness)}
                >
                  {labels.forBusiness}
                </LocaleLink>
                {labels.businessItems.map((item) => (
                  <LocaleLink
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={linkClass(item.href)}
                  >
                    {item.label}
                  </LocaleLink>
                ))}
              </AccordionGroup>

              {labels.primaryLinks.map((item) => (
                <LocaleLink
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className={cn(linkClass(item.href), "border-b border-border rounded-none")}
                >
                  {item.label}
                </LocaleLink>
              ))}

              <AccordionGroup title={labels.company}>
                {labels.companyItems.map((item) => (
                  <LocaleLink
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={linkClass(item.href)}
                  >
                    {item.label}
                  </LocaleLink>
                ))}
              </AccordionGroup>

              <LocaleLink
                href={paths.login}
                onClick={closeMenu}
                className={cn(linkClass(paths.login), "border-b border-border rounded-none")}
              >
                {labels.login}
              </LocaleLink>

              <div className="space-y-2 pt-5">
                <LocaleLink
                  href={labels.introHref}
                  onClick={closeMenu}
                  className="flex w-full min-h-12 items-center justify-center rounded-lg bg-primary text-base font-medium text-primary-fg hover:bg-primary-hover"
                >
                  {labels.scheduleIntro}
                </LocaleLink>
                <LocaleLink
                  href={paths.quote}
                  onClick={closeMenu}
                  className="flex w-full min-h-12 items-center justify-center rounded-lg border border-border text-base font-medium hover:border-primary hover:text-primary"
                >
                  {labels.quote}
                </LocaleLink>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
