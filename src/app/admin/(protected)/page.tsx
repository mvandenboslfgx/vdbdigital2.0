import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { getAllProducts } from "@/server/repositories/products";
import { getAdminPortalDashboardCounts } from "@/server/repositories/admin-portal";

export const metadata: Metadata = {
  title: "Command Center",
  robots: { index: false, follow: false },
};

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="block h-full">
      <Card className="h-full hover:border-primary transition-colors">
        <p className="text-label text-muted mb-1">{label}</p>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
      </Card>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const [products, counts] = await Promise.all([
    getAllProducts(),
    getAdminPortalDashboardCounts(),
  ]);

  const published = products.filter((p) => p.status === "PUBLISHED").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 mb-2">Command Center</h1>
        <p className="text-muted text-small">
          Alleen echte databasegegevens. Geen verzonnen omzet.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="Nieuwe leads" value={counts.openLeads} href="/admin/leads" />
        <Stat label="Actieve klanten" value={counts.customers} href="/admin/customers" />
        <Stat label="Actieve projecten" value={counts.projects} href="/admin/projects" />
        <Stat label="Open orders" value={counts.openOrders} href="/admin/orders" />
        <Stat label="Pending payments" value={counts.pendingPayments} href="/admin/payments" />
        <Stat label="Openstaande offertes" value={counts.openQuotes} href="/admin/quotes" />
        <Stat label="Support open" value={counts.openTickets} href="/admin/support" />
        <Stat label="Gepubliceerde producten" value={published} href="/admin/products" />
        <Stat
          label="Website jobs in wachtrij"
          value={counts.websiteJobsQueued}
          href="/admin/website-production"
        />
        <Stat label="Automation failures" value={counts.failedJobs} href="/admin/jobs" />
        <Stat
          label="Commissies pending"
          value={counts.pendingCommissions}
          href="/admin/commissions"
        />
        <Stat label="Payouts pending" value={counts.pendingPayouts} href="/admin/payouts" />
      </div>
    </div>
  );
}
