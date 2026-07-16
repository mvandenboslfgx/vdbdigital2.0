import type { Metadata } from "next";
import { Card } from "@/components/ui/container";
import { isTawkEmbedConfigured } from "@/config/tawk";
import { getSiteReadinessWarnings } from "@/config/commercial/site-readiness";
import { foundingClientOfferConfig } from "@/config/commercial/founding-client-offer";
import { isBookingConfigured } from "@/config/commercial/booking";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false },
};

export default function AdminSettingsPage() {
  const readinessWarnings = getSiteReadinessWarnings();

  return (
    <div>
      <h1 className="text-h1 mb-8">Settings</h1>
      <Card className="space-y-4 mb-8">
        <p className="text-muted">
          Site settings are managed via environment variables and the site_settings
          table in Supabase.
        </p>
        <dl className="text-small space-y-2">
          <div className="flex justify-between">
            <dt className="text-muted">Supabase</dt>
            <dd>{process.env.NEXT_PUBLIC_SUPABASE_URL ? "Configured" : "Not configured"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Mollie</dt>
            <dd>{process.env.MOLLIE_API_KEY ? "Configured" : "Not configured"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Resend</dt>
            <dd>{process.env.RESEND_API_KEY ? "Configured" : "Not configured"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Booking</dt>
            <dd>{isBookingConfigured() ? "Configured" : "Not configured (fallback active)"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Founding Client Offer</dt>
            <dd>{foundingClientOfferConfig.enabled ? "Enabled" : "Disabled"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">tawk.to</dt>
            <dd className="text-right">
              {isTawkEmbedConfigured()
                ? "OPTIONAL — ENABLED"
                : "OPTIONAL — DISABLED (WhatsApp fallback active)"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-h3">Site readiness</h2>
        <p className="text-muted text-small">
          Missing business data and pre-production checks. Sensitive values are never shown here.
        </p>
        <ul className="space-y-2">
          {readinessWarnings.map((warning) => (
            <li
              key={warning.id}
              className={`text-small flex items-start gap-2 rounded-md border px-3 py-2 ${
                warning.severity === "critical"
                  ? "border-destructive/40 bg-destructive/5"
                  : warning.severity === "warning"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border"
              }`}
            >
              <span className="font-medium capitalize">{warning.severity}</span>
              <span>{warning.label}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
