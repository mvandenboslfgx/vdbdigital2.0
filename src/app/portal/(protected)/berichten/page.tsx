import type { Metadata } from "next";
import { EmptyState } from "@/components/portal/empty-state";
import { listPortalConversations } from "@/server/repositories/portal";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDateTime } from "@/i18n/format-date";
import { withLocale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Berichten",
  robots: { index: false },
};

export default async function PortalMessagesPage() {
  const { t, locale } = await getDictionary();
  const { conversations } = await listPortalConversations();

  return (
    <div className="space-y-6">
      <h1 className="text-h1">{t("portal.messagesPage.title")}</h1>
      <p className="text-muted text-small">{t("portal.messagesPage.intro")}</p>
      {conversations.length === 0 ? (
        <EmptyState
          title={t("portal.messagesPage.emptyTitle")}
          description={t("portal.messagesPage.emptyBody")}
          actionHref={withLocale("/portal/support", locale)}
          actionLabel={t("portal.messagesPage.openTicket")}
        />
      ) : (
        <ul className="space-y-3">
          {conversations.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <p className="font-medium">{c.subject}</p>
              <p className="text-small text-muted mt-1">
                {c.last_message_at
                  ? formatDateTime(c.last_message_at, locale)
                  : t("portal.messagesPage.noMessagesYet")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
