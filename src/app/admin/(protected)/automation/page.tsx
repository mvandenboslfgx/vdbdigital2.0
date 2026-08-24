import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { listPlatformEvents } from "@/server/services/platform-events";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";

export const metadata: Metadata = {
  title: "Automation events",
  robots: { index: false },
};

export default async function AdminAutomationPage() {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "jobs.review");
  const events = await listPlatformEvents(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Automation events</h1>
        <p className="text-small text-muted mt-2">
          Persistente, idempotente gebeurtenissen. Geen ruwe providerfouten naar klanten.
        </p>
      </div>
      {events.length === 0 ? (
        <EmptyState
          title="Nog geen events"
          description="Events verschijnen na betalingen, projectaanmaak, intake en fulfillment."
        />
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li
              key={event.id as string}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <p className="font-medium">{String(event.event_type)}</p>
              <p className="text-small text-muted">
                {String(event.entity_type)} · {String(event.status)} ·{" "}
                {new Date(String(event.created_at)).toLocaleString("nl-NL")}
              </p>
              {event.last_error ? (
                <p className="text-small mt-1">Verwerking mislukt — details staan in de serverlog.</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
