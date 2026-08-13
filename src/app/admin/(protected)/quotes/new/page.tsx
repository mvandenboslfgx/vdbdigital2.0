import type { Metadata } from "next";
import Link from "next/link";
import { QuoteEditorForm } from "@/components/admin/quote-editor-form";
import { listAdminOrganizations } from "@/server/repositories/admin-portal";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";
import { buildQuoteEditorLabels } from "@/lib/admin/line-item-editor-labels";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.quotes.newQuote"), robots: { index: false } };
}

export default async function AdminNewQuotePage() {
  const { t, locale } = await getDictionary();
  const { organizations } = await listAdminOrganizations({
    pageSize: 100,
    status: "ACTIVE",
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href={withLocale("/admin/quotes", locale)}
          className="text-small text-primary hover:underline"
        >
          ← {t("admin.quotes")}
        </Link>
        <h1 className="text-h1 mt-2">{t("admin.page.quotes.newQuote")}</h1>
        <p className="text-muted text-small mt-1">
          {t("admin.page.quotes.newSubtitle")}
        </p>
      </div>
      {organizations.length === 0 ? (
        <p className="text-muted text-small">
          {t("admin.page.quotes.noOrganizations")}
        </p>
      ) : (
        <QuoteEditorForm
          mode="create"
          organizations={organizations.map((o) => ({
            id: o.id,
            label: o.trade_name || o.legal_name,
          }))}
          labels={buildQuoteEditorLabels(t)}
        />
      )}
    </div>
  );
}
