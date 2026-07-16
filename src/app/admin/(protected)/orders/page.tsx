import type { Metadata } from "next";
import { Card } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false },
};

export default function AdminOrdersPage() {
  return (
    <div>
      <h1 className="text-h1 mb-8">Orders</h1>
      <Card>
        <p className="text-muted">
          Orders will appear here once Supabase is configured and orders exist in
          the database.
        </p>
      </Card>
    </div>
  );
}
