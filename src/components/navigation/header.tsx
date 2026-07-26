import { headers } from "next/headers";
import { cn } from "@/lib/utilities/cn";
import { VdbLogo } from "@/components/brand/VdbLogo";
import { siteConfig } from "@/config/site";
import { isDirectCheckoutEnabled } from "@/config/features";
import { paths } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { ServerLocaleLink } from "@/i18n/server-locale-link";
import { ServerLanguageSwitcher } from "@/i18n/server-language-switcher";
import {
  HeaderCompanyNavServer,
  HeaderMobileNavServer,
  type ServerMobileNavLabels,
} from "@/components/navigation/header-server-nav";

function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

interface HeaderProps {
  cartItemCount?: number;
}

async function getPathname(): Promise<string> {
  const headerStore = await headers();
  return headerStore.get("x-pathname") ?? "/";
}

export async function Header({ cartItemCount = 0 }: HeaderProps) {
  const [{ t }, pathname] = await Promise.all([getDictionary(), getPathname()]);
  const showCart = isDirectCheckoutEnabled();

  const companyItems = siteConfig.navigation.company.map((item) => ({
    href: item.href,
    label: t(item.labelKey),
  }));

  const mobileLabels: ServerMobileNavLabels = {
    openMenu: t("nav.openMenu"),
    closeMenu: t("nav.closeMenu"),
    mobileNav: t("nav.mobileNav"),
    solutions: t("nav.solutions"),
    forBusiness: t("nav.forBusiness"),
    company: t("nav.company"),
    login: t("nav.login"),
    scheduleIntro: t("nav.scheduleIntro"),
    quote: t("nav.quote"),
    solutionsOverview: t(siteConfig.navigation.mobile.solutionsOverview.labelKey),
    solutionsOverviewHref: siteConfig.navigation.mobile.solutionsOverview.href,
    forBusinessHref: paths.forBusiness,
    introHref: siteConfig.navigation.mobile.introHref,
    solutionsItems: siteConfig.navigation.solutions.map((item) => ({
      href: item.href,
      label: t(item.labelKey),
    })),
    businessItems: siteConfig.navigation.mobile.business.map((item) => ({
      href: item.href,
      label: t(item.labelKey),
    })),
    primaryLinks: siteConfig.navigation.mobile.primaryLinks
      .filter(
        (item) =>
          item.href !== paths.shop &&
          item.href !== paths.about &&
          item.href !== paths.support,
      )
      .map((item) => ({
        href: item.href,
        label: t(item.labelKey),
      })),
    companyItems: siteConfig.navigation.company.map((item) => ({
      href: item.href,
      label: t(item.labelKey),
    })),
  };

  return (
    <header
      data-surface="dark"
      className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 page-pad-x sm:h-16">
        <ServerLocaleLink
          href="/"
          aria-label="VDB Digital Software — naar de homepage"
          className="inline-flex shrink-0 items-center"
        >
          <VdbLogo
            lockup="header"
            variant="light"
            priority
            className="h-10 w-auto max-w-[min(11rem,calc(100vw-11rem))] object-contain object-left sm:h-11 sm:max-w-[14rem] xl:h-12 xl:max-w-none"
            alt=""
          />
        </ServerLocaleLink>

        <nav
          className="hidden xl:flex min-w-0 flex-1 items-center justify-center gap-0.5 px-2"
          aria-label={t("nav.mainNav")}
          data-testid="desktop-nav"
        >
          {siteConfig.navigation.main.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <ServerLocaleLink
                key={item.href}
                href={item.href}
                prefetch={item.href === paths.shop ? false : undefined}
                className={cn(
                  "text-nowrap-safe shrink-0 rounded-md px-3 py-2 text-sm transition-colors min-h-11 inline-flex items-center",
                  active ? "text-primary" : "text-muted hover:text-foreground",
                )}
              >
                {t(item.labelKey)}
              </ServerLocaleLink>
            );
          })}
          <HeaderCompanyNavServer
            pathname={pathname}
            companyLabel={t("nav.company")}
            companyMenuLabel={t("nav.companyMenu")}
            items={companyItems}
          />
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ServerLanguageSwitcher compact className="hidden sm:inline-flex" />
          <ServerLocaleLink
            href={paths.login}
            className="text-nowrap-safe hidden sm:inline-flex min-h-10 shrink-0 items-center px-2.5 py-2 text-sm text-muted hover:text-foreground"
          >
            {t("nav.login")}
          </ServerLocaleLink>
          {showCart ? (
            <ServerLocaleLink
              href={paths.cart}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-surface-elevated transition-colors"
              aria-label={
                cartItemCount > 0
                  ? `${t("nav.cart")}, ${cartItemCount}`
                  : t("nav.cart")
              }
            >
              <CartIcon className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded bg-primary px-1 text-[10px] font-semibold leading-none text-primary-fg">
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </span>
              )}
            </ServerLocaleLink>
          ) : null}

          <ServerLocaleLink
            href={`${paths.contact}?intent=introduction`}
            data-testid="header-primary-cta"
            className="text-nowrap-safe hidden xl:inline-flex min-h-10 shrink-0 items-center rounded-md bg-primary px-3.5 py-2 text-sm text-primary-fg hover:bg-primary-hover"
          >
            {t("nav.scheduleIntro")}
          </ServerLocaleLink>

          <HeaderMobileNavServer pathname={pathname} labels={mobileLabels} />
        </div>
      </div>
    </header>
  );
}
