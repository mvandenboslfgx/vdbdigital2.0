import type { Metadata } from "next";
import { Card } from "@/components/ui/container";
import { getSiteReadinessWarnings } from "@/config/commercial/site-readiness";
import { foundingClientOfferConfig } from "@/config/commercial/founding-client-offer";
import { isBookingConfigured } from "@/config/commercial/booking";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.settings.title"), robots: { index: false } };
}

export default async function AdminSettingsPage() {
  const { t } = await getDictionary();
  const readinessWarnings = getSiteReadinessWarnings();
  const configured = t("admin.common.configured");
  const notConfigured = t("admin.common.notConfigured");

  const integrations = [
    { label: "Supabase", value: process.env.NEXT_PUBLIC_SUPABASE_URL ? configured : notConfigured },
    { label: "Mollie", value: process.env.MOLLIE_API_KEY ? configured : notConfigured },
    { label: "Resend", value: process.env.RESEND_API_KEY ? configured : notConfigured },
    {
      label: t("admin.page.settings.booking"),
      value: isBookingConfigured() ? configured : t("admin.page.settings.bookingFallback"),
    },
    {
      label: t("admin.page.settings.foundingClientOffer"),
      value: foundingClientOfferConfig.enabled
        ? t("admin.common.enabled")
        : t("admin.common.disabled"),
    },
    {
      label: t("admin.page.settings.liveChat"),
      value: t("admin.page.settings.liveChatValue"),
    },
  ];

  return (
    <div>
      <h1 className="text-h1 mb-8">{t("admin.page.settings.title")}</h1>
      <Card className="space-y-4 mb-8">
        <p className="text-muted">{t("admin.page.settings.description")}</p>
        <dl className="text-small space-y-2">
          {integrations.map((integration) => (
            <div key={integration.label} className="flex justify-between gap-4">
              <dt className="text-muted">{integration.label}</dt>
              <dd className="text-right">{integration.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-h3">{t("admin.page.settings.readinessTitle")}</h2>
        <p className="text-muted text-small">
          {t("admin.page.settings.readinessDescription")}
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
