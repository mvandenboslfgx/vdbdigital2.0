import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/container";
import { checkAdminAccess } from "@/server/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import {
  listAdminPayoutRequests,
  listPendingPayoutsForRequest,
} from "@/server/repositories/partner-payouts";
import {
  PayoutReviewActions,
  euro,
} from "@/components/admin/payout-review-actions";

export const metadata: Metadata = {
  title: "Uitbetalingen",
  robots: { index: false },
};

export default async function AdminPayoutsPage() {
  const access = await checkAdminAccess();
  if (!access.authorized || !access.context) {
    redirect("/inloggen?next=/admin/payouts");
  }
  if (!hasPermission(access.context.role, "payouts.review")) {
    redirect("/admin");
  }

  const requests = await listAdminPayoutRequests();
  const withPayouts = await Promise.all(
    requests.map(async (request) => {
      const payouts = await listPendingPayoutsForRequest(request.id);
      return { request, payout: payouts[0] ?? null };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Partneruitbetalingen</h1>
        <p className="text-muted text-small mt-1">
          Klanten betalen altijd aan VDB Digital. Partners vragen uitbetaling aan
          van vrijgegeven commissie. Bedragen komen uit de server, niet uit de
          client.
        </p>
      </div>
      <Card>
        {withPayouts.length === 0 ? (
          <p className="text-small text-muted">Geen uitbetalingsaanvragen.</p>
        ) : (
          <ul className="space-y-5">
            {withPayouts.map(({ request, payout }) => {
              const partner = Array.isArray(request.partner)
                ? request.partner[0]
                : request.partner;
              return (
                <li
                  key={request.id}
                  className="border-b border-border/50 pb-4 space-y-2"
                >
                  <p className="font-medium">
                    {partner?.display_name || partner?.legal_name || request.partner_id}
                  </p>
                  <p className="text-small text-muted">
                    Aangevraagd {euro(request.requested_amount_cents)} · beschikbaar
                    op aanvraag {euro(request.available_amount_snapshot_cents)} ·{" "}
                    {request.status}
                    {payout ? ` · payout ${payout.status}` : ""}
                  </p>
                  <PayoutReviewActions
                    requestId={request.id}
                    status={request.status}
                    payoutId={payout?.id}
                    payoutStatus={payout?.status}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
