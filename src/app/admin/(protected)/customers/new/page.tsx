import type { Metadata } from "next";
import Link from "next/link";
import { CreateCustomerForm } from "@/components/admin/create-customer-form";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Nieuwe klant",
  robots: { index: false },
};

export default async function AdminNewCustomerPage() {
  const access = await checkAdminAccess();
  if (!access.authorized || !access.context) {
    redirect("/inloggen?next=/admin/customers/new");
  }
  if (!hasPermission(access.context.role, "customers.create")) {
    redirect("/admin/customers");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-small text-muted mb-1">
          <Link href="/admin/customers" className="hover:text-foreground">
            Klanten
          </Link>{" "}
          / Nieuw
        </p>
        <h1 className="text-h1">Nieuwe klant</h1>
        <p className="text-muted text-small mt-1">
          Invitation-first: organisatie + uitnodiging. Geen open portaltoegang zonder acceptatie.
        </p>
      </div>
      <CreateCustomerForm />
    </div>
  );
}
