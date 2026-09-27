import { redirect } from "next/navigation";
import { checkCustomerAccess } from "@/server/auth/require-customer";
import { PortalShell } from "@/components/portal/portal-shell";

export const dynamic = "force-dynamic";

const portalNav = [
  { label: "Overzicht", href: "/portal" },
  { label: "Projecten", href: "/portal/projecten" },
  { label: "Intake", href: "/portal/intake" },
  { label: "Offertes", href: "/portal/offertes" },
  { label: "Bestellingen", href: "/portal/bestellingen" },
  { label: "Facturen", href: "/portal/facturen" },
  { label: "Betalingen", href: "/portal/betalingen" },
  { label: "Afspraken", href: "/portal/afspraken" },
  { label: "Documenten", href: "/portal/documenten" },
  { label: "Berichten", href: "/portal/berichten" },
  { label: "Support", href: "/portal/support" },
  { label: "Meldingen", href: "/portal/meldingen" },
  { label: "Profiel", href: "/portal/profiel" },
  { label: "Beveiliging", href: "/portal/beveiliging" },
  { label: "Instellingen", href: "/portal/instellingen" },
];

export default async function PortalProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await checkCustomerAccess();
  if (!access.authorized || !access.context) {
    console.info(
      JSON.stringify({
        type: "portal_layout_redirect",
        reason: access.reason ?? "UNKNOWN",
        redirectTo: access.redirectTo ?? "/inloggen",
        isStaff: Boolean(access.isStaff),
      }),
    );
    redirect(access.redirectTo ?? "/inloggen");
  }

  const { context } = access;
  const orgName =
    context.organization.tradeName || context.organization.legalName;

  return (
    <PortalShell
      nav={portalNav}
      displayName={context.displayName}
      organizationName={orgName}
    >
      {children}
    </PortalShell>
  );
}
