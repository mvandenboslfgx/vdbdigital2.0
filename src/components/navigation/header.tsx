"use client";

import { ChevronDown, Menu, ShoppingCart, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utilities/cn";
import { BrandLink } from "@/components/brand/BrandLink";
import { siteConfig } from "@/config/site";
import { isDirectCheckoutEnabled } from "@/config/features";
import { paths } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { LocaleLink, useLocalePathname } from "@/i18n/locale-link";
import { LanguageSwitcherBoundary } from "@/i18n/language-switcher-boundary";

interface HeaderProps {
  cartItemCount?: number;
}

type OpenSection = "solutions" | "pricing" | null;

/** Desktop nav labels must never wrap mid-word (body uses aggressive overflow-wrap). */
const navLinkClass =
  "shrink-0 whitespace-nowrap [word-break:normal] [overflow-wrap:normal]";

function useLockBody(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const scrollY = window.scrollY;
    const { overflow, position, top, width } = document.body.style;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.position = position;
      document.body.style.top = top;
      document.body.style.width = width;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

export function Header({ cartItemCount = 0 }: HeaderProps) {
  const pathname = useLocalePathname();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openForPath, setOpenForPath] = useState(pathname);
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const solutionsPanelId = useId();
  const pricingPanelId = useId();
  const showCart = isDirectCheckoutEnabled();

  // Auto-dismiss when route changes without setState-in-effect
  const isMenuOpen = mobileOpen && openForPath === pathname;

  const closeMenu = useCallback(() => {
    setMobileOpen(false);
    setOpenSection(null);
  }, []);

  const openMenu = useCallback(() => {
    setMobileOpen(true);
    setOpenForPath(pathname);
    setOpenSection(null);
  }, [pathname]);

  const toggleSection = useCallback((section: Exclude<OpenSection, null>) => {
    setOpenSection((current) => (current === section ? null : section));
  }, []);

  useLockBody(isMenuOpen);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen, closeMenu]);

  const solutionItems = [
    { href: paths.websites, label: t("nav.mobileMenu.websites") },
    { href: paths.aiAutomation, label: t("nav.mobileMenu.automation") },
    { href: paths.conversionOptimisation, label: t("nav.mobileMenu.conversion") },
    { href: paths.customSoftware, label: t("nav.mobileMenu.software") },
    { href: paths.technicalSupport, label: t("nav.mobileMenu.technicalSupport") },
  ] as const;

  const pricingItems = [
    { href: paths.shop, label: t("nav.mobileMenu.packages") },
    { href: paths.forBusiness, label: t("nav.mobileMenu.forBusiness") },
    { href: paths.quote, label: t("nav.mobileMenu.requestQuote") },
  ] as const;

  const flatLinks = [
    { href: paths.cases, label: t("nav.cases") },
    { href: paths.about, label: t("nav.about") },
    { href: paths.support, label: t("nav.support") },
    { href: paths.login, label: t("nav.login") },
  ] as const;

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      data-surface="dark"
      className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]"
    >
      <div
        className={cn(
          "mx-auto flex h-14 items-center sm:h-16",
          "max-w-[1440px] px-4 sm:px-6 lg:px-8",
          "gap-4 lg:gap-6",
        )}
      >
        <BrandLink
          variant="light"
          priority
          className="shrink-0"
          logoClassName="h-9 w-auto max-w-[min(10rem,calc(100vw-11rem))] object-contain object-left sm:h-10 sm:max-w-[12rem] lg:h-11 lg:max-w-none"
        />

        {/* ≥1024: desktop nav; ≥1280: fuller gaps; never wrap labels */}
        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-5 lg:flex xl:gap-7"
          aria-label={t("nav.mainNav")}
        >
          {siteConfig.navigation.main.map((item) => {
            const active = isActive(item.href);
            const compactHide = item.href === paths.about;
            return (
              <LocaleLink
                key={item.href}
                href={item.href}
                className={cn(
                  navLinkClass,
                  "px-1 py-2 text-sm font-medium transition-colors",
                  compactHide && "hidden xl:inline-flex",
                  active ? "text-primary" : "text-muted hover:text-foreground",
                )}
              >
                {t(item.labelKey)}
              </LocaleLink>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageSwitcherBoundary
            size="compact"
            className="hidden lg:inline-flex"
          />
          <LocaleLink
            href={paths.login}
            className={cn(
              navLinkClass,
              "hidden lg:inline-flex items-center py-2 text-sm text-muted hover:text-foreground",
            )}
          >
            {t("nav.login")}
          </LocaleLink>
          {showCart ? (
            <LocaleLink
              href={paths.cart}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-elevated transition-colors"
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
          ) : null}

          <LocaleLink
            href={`${paths.contact}?intent=introduction`}
            className={cn(
              navLinkClass,
              "hidden lg:inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover",
            )}
          >
            {t("nav.scheduleIntro")}
          </LocaleLink>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-elevated lg:hidden"
            onClick={() => (isMenuOpen ? closeMenu() : openMenu())}
            aria-expanded={isMenuOpen}
            aria-controls={panelId}
            aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/55 lg:hidden"
            aria-label={t("nav.closeMenu")}
            onClick={closeMenu}
          />
          <div
            id={panelId}
            className="fixed inset-x-0 top-0 z-50 flex h-dvh max-h-dvh flex-col bg-background lg:hidden pt-[env(safe-area-inset-top,0px)]"
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.mobileNav")}
          >
            {/* Menu chrome */}
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-5 sm:px-6">
              <BrandLink
                variant="light"
                className="min-w-0 flex-1"
                logoClassName="h-8 w-auto max-w-[min(9.5rem,calc(100vw-9.5rem))] object-contain object-left"
              />
              <LanguageSwitcherBoundary size="compact" className="shrink-0" />
              <button
                ref={closeButtonRef}
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-elevated hover:text-foreground"
                onClick={closeMenu}
                aria-label={t("nav.closeMenu")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Compact primary list */}
            <nav
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6"
              aria-label={t("nav.mobileNav")}
            >
              <ul className="py-1">
                <li className="border-b border-white/10">
                  <button
                    type="button"
                    className="flex min-h-14 w-full items-center justify-between gap-3 text-left text-[17px] font-medium text-foreground"
                    aria-expanded={openSection === "solutions"}
                    aria-controls={solutionsPanelId}
                    onClick={() => toggleSection("solutions")}
                  >
                    <span>{t("nav.solutions")}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
                        openSection === "solutions" && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={solutionsPanelId}
                    role="region"
                    hidden={openSection !== "solutions"}
                    className={cn(openSection === "solutions" ? "pb-2" : "hidden")}
                  >
                    <ul className="space-y-0.5 pb-1 pl-1">
                      {solutionItems.map((item) => (
                        <li key={item.href}>
                          <LocaleLink
                            href={item.href}
                            onClick={closeMenu}
                            className={cn(
                              "flex min-h-11 items-center rounded-md px-3 text-[15px] transition-colors",
                              isActive(item.href)
                                ? "bg-primary-soft text-primary"
                                : "text-muted hover:bg-surface-elevated hover:text-foreground",
                            )}
                          >
                            {item.label}
                          </LocaleLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>

                <li className="border-b border-white/10">
                  <button
                    type="button"
                    className="flex min-h-14 w-full items-center justify-between gap-3 text-left text-[17px] font-medium text-foreground"
                    aria-expanded={openSection === "pricing"}
                    aria-controls={pricingPanelId}
                    onClick={() => toggleSection("pricing")}
                  >
                    <span>{t("nav.shop")}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
                        openSection === "pricing" && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={pricingPanelId}
                    role="region"
                    hidden={openSection !== "pricing"}
                    className={cn(openSection === "pricing" ? "pb-2" : "hidden")}
                  >
                    <ul className="space-y-0.5 pb-1 pl-1">
                      {pricingItems.map((item) => (
                        <li key={item.href}>
                          <LocaleLink
                            href={item.href}
                            onClick={closeMenu}
                            className={cn(
                              "flex min-h-11 items-center rounded-md px-3 text-[15px] transition-colors",
                              isActive(item.href, item.href === paths.shop)
                                ? "bg-primary-soft text-primary"
                                : "text-muted hover:bg-surface-elevated hover:text-foreground",
                            )}
                          >
                            {item.label}
                          </LocaleLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>

                {flatLinks.map((item) => (
                  <li key={item.href} className="border-b border-white/10 last:border-b-0">
                    <LocaleLink
                      href={item.href}
                      onClick={closeMenu}
                      className={cn(
                        "flex min-h-14 items-center text-[17px] font-medium transition-colors",
                        isActive(item.href)
                          ? "text-primary"
                          : "text-foreground hover:text-primary",
                      )}
                    >
                      {item.label}
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Sticky primary CTA */}
            <div className="shrink-0 border-t border-white/10 bg-background px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6">
              <LocaleLink
                href={`${paths.contact}?intent=introduction`}
                onClick={closeMenu}
                className="flex min-h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-medium text-white hover:bg-primary-hover"
              >
                {t("nav.scheduleIntro")}
              </LocaleLink>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
