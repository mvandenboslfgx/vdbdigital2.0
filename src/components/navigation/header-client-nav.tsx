"use client";

import dynamic from "next/dynamic";
import type { CompanyNavItem } from "@/components/navigation/header-company-dropdown";
import type { HeaderMobileMenuLabels } from "@/components/navigation/header-mobile-menu";

const HeaderCompanyDropdown = dynamic(
  () =>
    import("@/components/navigation/header-company-dropdown").then(
      (m) => m.HeaderCompanyDropdown,
    ),
  {
    ssr: false,
    loading: () => (
      <span className="inline-flex min-h-11 min-w-[5.5rem] shrink-0" aria-hidden="true" />
    ),
  },
);

const HeaderMobileMenu = dynamic(
  () =>
    import("@/components/navigation/header-mobile-menu").then(
      (m) => m.HeaderMobileMenu,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="xl:hidden h-11 w-11 shrink-0" aria-hidden="true" />
    ),
  },
);

export function HeaderCompanyDropdownLazy(props: {
  pathname: string;
  companyLabel: string;
  companyMenuLabel: string;
  items: CompanyNavItem[];
}) {
  return <HeaderCompanyDropdown {...props} />;
}

export function HeaderMobileMenuLazy(props: {
  pathname: string;
  labels: HeaderMobileMenuLabels;
}) {
  return <HeaderMobileMenu {...props} />;
}
