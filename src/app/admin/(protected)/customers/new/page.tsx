import type { Metadata } from "next";
import Link from "next/link";
import { CreateCustomerForm } from "@/components/admin/create-customer-form";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";
import { buildCreateCustomerFormLabels } from "@/lib/admin/support-form-labels";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.customers.newTitle"), robots: { index: false } };
}

export default async function AdminNewCustomerPage() {
  const { t, locale } = await getDictionary();
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
          <Link
            href={withLocale("/admin/customers", locale)}
            className="hover:text-foreground"
          >
            {t("admin.customers")}
          </Link>{" "}
          / {t("admin.page.customers.newBreadcrumb")}
        </p>
        <h1 className="text-h1">{t("admin.page.customers.newTitle")}</h1>
        <p className="text-muted text-small mt-1">
          {t("admin.page.customers.newSubtitle")}
        </p>
      </div>
      <CreateCustomerForm labels={buildCreateCustomerFormLabels(t)} />
    </div>
  );
}
