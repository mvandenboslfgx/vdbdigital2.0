import type { Metadata } from "next";
import { Card } from "@/components/ui/container";
import { getAllProducts } from "@/server/repositories/products";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  const products = await getAllProducts();

  return (
    <div>
      <h1 className="text-h1 mb-8">Dashboard</h1>
      <div className="grid sm:grid-cols-3 gap-6">
        <Card>
          <p className="text-label text-muted mb-1">Products</p>
          <p className="text-3xl font-semibold">{products.length}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">Orders</p>
          <p className="text-3xl font-semibold">—</p>
          <p className="text-small text-muted">Configure Supabase</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">Leads</p>
          <p className="text-3xl font-semibold">—</p>
          <p className="text-small text-muted">Configure Supabase</p>
        </Card>
      </div>
    </div>
  );
}
