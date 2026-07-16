import type { Metadata } from "next";
import { Card } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Leads",
  robots: { index: false },
};

export default function AdminLeadsPage() {
  return (
    <div>
      <h1 className="text-h1 mb-8">Leads</h1>
      <Card>
        <p className="text-muted">
          Contact, quote and support requests will appear here once Supabase is
          configured.
        </p>
      </Card>
    </div>
  );
}
