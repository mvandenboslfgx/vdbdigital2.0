import type { Metadata } from "next";
import { Card, Badge } from "@/components/ui/container";
import { foundingClientOfferConfig } from "@/config/commercial/founding-client-offer";
import { websitePackages } from "@/config/commercial/website-packages";
import { commercialBundles } from "@/config/commercial/bundles";
import { getFoundingClientState } from "@/server/services/founding-client-service";
import { formatCents } from "@/lib/utilities/money";

export const metadata: Metadata = {
  title: "Offers",
  robots: { index: false },
};

export default async function AdminOffersPage() {
  const state = await getFoundingClientState();
  const cfg = foundingClientOfferConfig;

  return (
    <div>
      <h1 className="text-h1 mb-2">Offers</h1>
      <p className="text-muted mb-8 max-w-2xl">
        Read-only commercial offer configuration. Slot counts come from{" "}
        <code className="text-small">getFoundingClientState</code> — no
        client-side mutation.
      </p>

      {!cfg.discountApproved ? (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
          <p className="text-small font-medium">
            Warning: discountApproved is false
          </p>
          <p className="text-small text-muted mt-1">
            Do not publish discount amounts until Matthijs approves. Draft
            benefits below are internal only.
          </p>
        </Card>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className="space-y-3">
          <h2 className="text-h3">Founding Client Offer</h2>
          <dl className="text-small space-y-2">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Enabled</dt>
              <dd>{cfg.enabled ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Max clients</dt>
              <dd>{cfg.maxClients}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Used slots</dt>
              <dd>{state.usedSlots}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Remaining</dt>
              <dd>{state.remainingSlots}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Can accept</dt>
              <dd>{state.canAccept ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Show campaign</dt>
              <dd>{state.showCampaign ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Start / end</dt>
              <dd className="text-right">
                {(cfg.startDate ?? "—") + " → " + (cfg.endDate ?? "—")}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted border-t border-border pt-3">
            {cfg.internalNotes}
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-h3">Draft benefits (internal)</h2>
          <ul className="text-small space-y-2">
            {Object.entries(cfg.draftBenefits).map(([key, benefit]) => (
              <li
                key={key}
                className="flex justify-between gap-4 border-b border-border pb-2 last:border-0"
              >
                <span className="capitalize">{key}</span>
                <span className="text-muted text-right">
                  {"foundingExclVatCents" in benefit &&
                  benefit.foundingExclVatCents != null
                    ? `${formatCents(benefit.foundingExclVatCents, "en")} excl. VAT · ${benefit.careMonths} care months`
                    : "notes" in benefit
                      ? benefit.notes
                      : "—"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mb-6 space-y-4">
        <h2 className="text-h3">Package founding eligibility</h2>
        <ul className="space-y-2">
          {websitePackages.map((pkg) => (
            <li
              key={pkg.id}
              className="flex flex-wrap items-center justify-between gap-2 text-small border-b border-border pb-2 last:border-0"
            >
              <span>
                {pkg.slug}{" "}
                <span className="text-muted">({pkg.id})</span>
              </span>
              <Badge>
                {pkg.foundingEligible ? "Founding eligible" : "Not eligible"}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-h3">Bundles</h2>
        <ul className="space-y-2">
          {commercialBundles.map((bundle) => (
            <li
              key={bundle.id}
              className="flex flex-wrap items-center justify-between gap-2 text-small border-b border-border pb-2 last:border-0"
            >
              <span>
                {bundle.slug}{" "}
                <span className="text-muted">· {bundle.billingModel}</span>
              </span>
              <div className="flex gap-2">
                <Badge>
                  {bundle.foundingEligible ? "Founding eligible" : "Not eligible"}
                </Badge>
                <Badge>
                  {bundle.b2b ? "B2B" : ""}
                  {bundle.b2b && bundle.b2c ? " / " : ""}
                  {bundle.b2c ? "B2C" : ""}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
