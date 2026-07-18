import { redirect } from "next/navigation";
import { checkCustomerAccess } from "@/server/auth/require-customer";
import { PortalShell } from "@/components/portal/portal-shell";

export const dynamic = "force-dynamic";

const portalNav = [
  { label: "Overzicht", href: "/portal" },
  { label: "Projecten", href: "/portal/projecten" },
  { label: "Offertes", href: "/portal/offertes" },
  { label: "Facturen", href: "/portal/facturen" },
  { label: "Documenten", href: "/portal/documenten" },
  { label: "Berichten", href: "/portal/berichten" },
  { label: "Support", href: "/portal/support" },
  { label: "Meldingen", href: "/portal/meldingen" },
  { label: "Profiel", href: "/portal/profiel" },
  { label: "Beveiliging", href: "/portal/beveiliging" },
];

export default async function PortalProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await checkCustomerAccess();
  if (!access.authorized || !access.context) {
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
