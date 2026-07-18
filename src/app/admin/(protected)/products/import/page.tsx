import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProductImportPanel } from "@/components/admin/product-import-panel";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Productimport",
  robots: { index: false },
};

export default async function AdminProductImportPage() {
  const access = await checkAdminAccess();
  if (!access.authorized || !access.context) redirect("/admin/login");

  return (
    <ProductImportPanel canImport={hasPermission(access.context.role, "products.import")} />
  );
}
