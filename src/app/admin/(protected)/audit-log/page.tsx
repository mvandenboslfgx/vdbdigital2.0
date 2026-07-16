import type { Metadata } from "next";
import { Card } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Audit log",
  robots: { index: false },
};

export default function AdminAuditPage() {
  return (
    <div>
      <h1 className="text-h1 mb-8">Audit log</h1>
      <Card>
        <p className="text-muted">
          Admin actions are logged in the audit_logs table once Supabase is
          configured.
        </p>
      </Card>
    </div>
  );
}
