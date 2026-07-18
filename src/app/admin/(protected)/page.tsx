import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { getAllProducts } from "@/server/repositories/products";
import { getAdminPortalDashboardCounts } from "@/server/repositories/admin-portal";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  const [products, counts] = await Promise.all([
    getAllProducts(),
    getAdminPortalDashboardCounts(),
  ]);

  const published = products.filter((p) => p.status === "PUBLISHED").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 mb-2">Dashboard</h1>
        <p className="text-muted text-small">
          Alleen echte databasegegevens. Geen verzonnen omzet.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <p className="text-label text-muted mb-1">Actieve klanten</p>
          <p className="text-3xl font-semibold">{counts.customers}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">Open leads</p>
          <p className="text-3xl font-semibold">{counts.openLeads}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">Actieve projecten</p>
          <p className="text-3xl font-semibold">{counts.projects}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">Openstaande offertes</p>
          <p className="text-3xl font-semibold">{counts.openQuotes}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">Open supporttickets</p>
          <p className="text-3xl font-semibold">{counts.openTickets}</p>
        </Card>
        <Card>
          <p className="text-label text-muted mb-1">Gepubliceerde producten</p>
          <p className="text-3xl font-semibold">{published}</p>
        </Card>
      </div>

      <section>
        <h2 className="text-h3 mb-4">Snelacties</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/customers"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary"
          >
            Klant aanmaken
          </Link>
          <Link
            href="/admin/projects"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary"
          >
            Projecten
          </Link>
          <Link
            href="/admin/products"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary"
          >
            Producten beheren
          </Link>
          <Link
            href="/admin/support"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary"
          >
            Support
          </Link>
          <Link
            href="/admin/messages"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary"
          >
            Berichten
          </Link>
        </div>
      </section>
    </div>
  );
}
