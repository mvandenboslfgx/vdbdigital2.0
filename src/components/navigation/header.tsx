"use client";

import { ChevronDown, Menu, ShoppingCart, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utilities/cn";
import { BrandLink } from "@/components/brand/BrandLink";
import { siteConfig } from "@/config/site";
import { paths } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { LocaleLink, useLocalePathname } from "@/i18n/locale-link";
import { LanguageSwitcherBoundary } from "@/i18n/language-switcher-boundary";

interface HeaderProps {
  cartItemCount?: number;
}

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
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="pb-3">
        <div className="space-y-0.5 pl-1">{children}</div>
      </div>
    </div>
  );
}

export function Header({ cartItemCount = 0 }: HeaderProps) {
  const pathname = useLocalePathname();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const closeMenu = useCallback(() => setMobileOpen(false), []);

  useLockBody(mobileOpen);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, closeMenu]);

  const linkClass = (target: string, exact = false) =>
    cn(
      "block rounded-lg px-3 py-3 text-base transition-colors",
      (exact ? pathname === target : pathname === target || pathname.startsWith(`${target}/`))
        ? "bg-primary-soft text-primary"
        : "text-muted hover:bg-surface-elevated hover:text-foreground",
    );

  return (
    <header
      data-surface="dark"
      className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 page-pad-x sm:h-16">
        <BrandLink variant="light" priority />

        <nav className="hidden lg:flex items-center gap-0.5" aria-label={t("nav.mainNav")}>
          {siteConfig.navigation.main.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <LocaleLink
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm rounded-md transition-colors",
                  active ? "text-primary" : "text-muted hover:text-foreground",
                )}
              >
                {t(item.labelKey)}
              </LocaleLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcherBoundary className="hidden md:inline-flex" />
          <LocaleLink
            href={paths.cart}
            className="relative flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-elevated transition-colors"
            aria-label={
              cartItemCount > 0
                ? `${t("nav.cart")}, ${cartItemCount}`
                : t("nav.cart")
            }
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded bg-primary px-1 text-[10px] font-semibold leading-none text-white">
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </span>
            )}
          </LocaleLink>

          <LocaleLink
            href={`${paths.contact}?intent=introduction`}
            className="hidden lg:inline-flex min-h-10 items-center px-3.5 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-hover"
          >
            {t("nav.scheduleIntro")}
          </LocaleLink>
          <LocaleLink
            href={paths.quote}
            className="hidden xl:inline-flex min-h-10 items-center px-3.5 py-2 text-sm rounded-md border border-border hover:border-primary hover:text-primary"
          >
            {t("nav.quote")}
          </LocaleLink>

          <button
            type="button"
            className="lg:hidden flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-elevated"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls={panelId}
            aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-label={t("nav.closeMenu")}
            onClick={closeMenu}
          />
          <div
            id={panelId}
            className="fixed inset-x-0 top-0 z-50 flex max-h-dvh flex-col bg-surface lg:hidden pt-[env(safe-area-inset-top,0px)]"
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.mobileNav")}
          >
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border page-pad-x">
              <BrandLink
                variant="light"
                logoClassName="h-9 w-auto max-w-[min(10rem,calc(100vw-11rem))] object-contain object-left"
              />
              <div className="flex items-center gap-2">
                <LanguageSwitcherBoundary />
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-elevated"
                  onClick={closeMenu}
                  aria-label={t("nav.closeMenu")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <nav
              className="flex-1 overflow-y-auto overscroll-contain page-pad-x py-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
              aria-label={t("nav.mobileNav")}
            >
              <AccordionGroup title={t("nav.solutions")} defaultOpen>
                <LocaleLink
                  href={siteConfig.navigation.mobile.solutionsOverview.href}
                  onClick={closeMenu}
                  className={linkClass(paths.solutions, true)}
                >
                  {t(siteConfig.navigation.mobile.solutionsOverview.labelKey)}
                </LocaleLink>
                {siteConfig.navigation.solutions.map((item) => (
                  <LocaleLink
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={linkClass(item.href)}
                  >
                    {t(item.labelKey)}
                  </LocaleLink>
                ))}
              </AccordionGroup>

              <LocaleLink
                href={paths.shop}
                onClick={closeMenu}
                className={cn(linkClass(paths.shop), "border-b border-border rounded-none")}
              >
                {t("nav.shop")}
              </LocaleLink>

              <AccordionGroup title={t("nav.forBusiness")}>
                <LocaleLink
                  href={paths.forBusiness}
                  onClick={closeMenu}
                  className={linkClass(paths.forBusiness)}
                >
                  {t("nav.forBusiness")}
                </LocaleLink>
                {siteConfig.navigation.mobile.business.map((item) => (
                  <LocaleLink
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={linkClass(item.href)}
                  >
                    {t(item.labelKey)}
                  </LocaleLink>
                ))}
              </AccordionGroup>

              {siteConfig.navigation.mobile.primaryLinks
                .filter((item) => item.href !== paths.shop)
                .map((item) => (
                  <LocaleLink
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={cn(linkClass(item.href), "border-b border-border rounded-none")}
                  >
                    {t(item.labelKey)}
                  </LocaleLink>
                ))}

              <div className="pt-5 space-y-2">
                <LocaleLink
                  href={siteConfig.navigation.mobile.introHref}
                  onClick={closeMenu}
                  className="flex w-full min-h-12 items-center justify-center rounded-lg bg-primary text-base font-medium text-white hover:bg-primary-hover"
                >
                  {t("nav.scheduleIntro")}
                </LocaleLink>
                <LocaleLink
                  href={paths.quote}
                  onClick={closeMenu}
                  className="flex w-full min-h-12 items-center justify-center rounded-lg border border-border text-base font-medium hover:border-primary hover:text-primary"
                >
                  {t("nav.quote")}
                </LocaleLink>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
