import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { checkCustomerAccess } from "@/server/auth/require-customer";
import { PortalShell } from "@/components/portal/portal-shell";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

/**
 * Defense-in-depth: every route under /portal/(protected) is customer
 * account data and must never be indexed, regardless of whether a given
 * page also sets its own `robots` metadata.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PortalProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, locale } = await getDictionary();
  const access = await checkCustomerAccess();
  if (!access.authorized || !access.context) {
    redirect(access.redirectTo ?? withLocale("/inloggen", locale));
  }

  const { context } = access;
  const orgName =
    context.organization.tradeName || context.organization.legalName;

  const portalNav = [
    { label: t("portal.overview"), href: withLocale("/portal", locale) },
    {
      label: t("portal.projects"),
      href: withLocale("/portal/projecten", locale),
    },
    { label: t("portal.quotes"), href: withLocale("/portal/offertes", locale) },
    {
      label: t("portal.invoices"),
      href: withLocale("/portal/facturen", locale),
    },
    {
      label: t("portal.documents"),
      href: withLocale("/portal/documenten", locale),
    },
    {
      label: t("portal.messages"),
      href: withLocale("/portal/berichten", locale),
    },
    { label: t("portal.support"), href: withLocale("/portal/support", locale) },
    {
      label: t("portal.notifications"),
      href: withLocale("/portal/meldingen", locale),
    },
    { label: t("portal.profile"), href: withLocale("/portal/profiel", locale) },
    {
      label: t("portal.security"),
      href: withLocale("/portal/beveiliging", locale),
    },
  ];

  return (
    <PortalShell
      nav={portalNav}
      displayName={context.displayName}
      organizationName={orgName}
      labels={{
        navAria: t("portal.navAria"),
        brandAria: `${siteConfig.name} — ${t("portal.brandAria")}`,
        logout: t("portal.logout"),
        openMenu: t("portal.openMenu"),
        closeMenu: t("portal.closeMenu"),
        portalSubtitle: t("portal.brandAria"),
      }}
    >
      {children}
    </PortalShell>
  );
}
