import { redirect } from "next/navigation";
import { checkCustomerAccess } from "@/server/auth/require-customer";
import { PortalShell } from "@/components/portal/portal-shell";
import { getLocale } from "@/i18n/get-dictionary";

export const dynamic = "force-dynamic";

const navByLocale = {
  nl: [
    ["Overzicht", "/portal"], ["Projecten", "/portal/projecten"],
    ["Offertes", "/portal/offertes"], ["Facturen", "/portal/facturen"],
    ["Bestellingen", "/portal/bestellingen"], ["Documenten", "/portal/documenten"], ["Berichten", "/portal/berichten"],
    ["Support", "/portal/support"], ["Meldingen", "/portal/meldingen"],
    ["Profiel", "/portal/profiel"], ["Beveiliging", "/portal/beveiliging"],
  ],
  en: [
    ["Overview", "/portal"], ["Projects", "/portal/projecten"],
    ["Quotes", "/portal/offertes"], ["Invoices", "/portal/facturen"],
    ["Orders", "/portal/bestellingen"], ["Documents", "/portal/documenten"], ["Messages", "/portal/berichten"],
    ["Support", "/portal/support"], ["Notifications", "/portal/meldingen"],
    ["Profile", "/portal/profiel"], ["Security", "/portal/beveiliging"],
  ],
} as const;

export default async function PortalProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await checkCustomerAccess();
  if (!access.authorized || !access.context) {
    redirect(access.redirectTo ?? "/inloggen");
  }

  const locale = await getLocale();
  const nav = navByLocale[locale].map(([label, href]) => ({ label, href }));
  const { context } = access;
  const orgName = context.organization.tradeName || context.organization.legalName;

  return (
    <PortalShell
      nav={nav}
      displayName={context.displayName}
      organizationName={orgName}
    >
      {children}
    </PortalShell>
  );
}
