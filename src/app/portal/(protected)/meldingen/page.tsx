import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listPortalNotifications } from "@/server/repositories/portal";
import { MarkNotificationsReadButton } from "@/components/portal/mark-notifications-read";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = {
  title: "Meldingen",
  robots: { index: false },
};

export default async function PortalNotificationsPage() {
  const { t, locale } = await getDictionary();
  const { notifications } = await listPortalNotifications();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1">{t("portal.notificationsPage.title")}</h1>
        <MarkNotificationsReadButton />
      </div>
      {notifications.length === 0 ? (
        <EmptyState
          title={t("portal.notificationsPage.emptyTitle")}
          description={t("portal.notificationsPage.emptyBody")}
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border p-4 ${
                n.read_at ? "border-border" : "border-primary bg-primary-soft/30"
              }`}
            >
              {n.href ? (
                <Link href={n.href} className="font-medium hover:underline">
                  {n.title}
                </Link>
              ) : (
                <p className="font-medium">{n.title}</p>
              )}
              {n.body ? (
                <p className="text-small text-muted mt-1">{n.body}</p>
              ) : null}
              <p className="text-small text-muted mt-2">
                {new Date(n.created_at).toLocaleString(
                  locale === "nl" ? "nl-NL" : "en-US",
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
