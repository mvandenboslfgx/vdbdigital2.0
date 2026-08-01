import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listPortalProjects } from "@/server/repositories/portal";
import {
  PROJECT_STATUS_KEYS,
  PROJECT_TYPE_KEYS,
  labelFor,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatDate } from "@/i18n/format-date";
import { withLocale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Projecten",
  robots: { index: false },
};

export default async function PortalProjectsPage() {
  const { t, locale } = await getDictionary();
  const result = await listPortalProjects();
  const projects = result.projects;

  return (
    <div className="space-y-6">
      <h1 className="text-h1">{t("portal.projectsPage.title")}</h1>
      {projects.length === 0 ? (
        <EmptyState
          title={t("portal.projectsPage.emptyTitle")}
          description={t("portal.projectsPage.emptyBody")}
        />
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={withLocale(`/portal/projecten/${p.id}/overview`, locale)}
                className="block rounded-xl border border-border bg-surface p-5 hover:border-primary transition-colors"
              >
                <div className="flex flex-wrap justify-between gap-2 mb-2">
                  <h2 className="font-medium text-lg">{p.name}</h2>
                  <span className="text-small text-muted">
                    {labelFor(t, PROJECT_STATUS_KEYS, p.status)}
                  </span>
                </div>
                <p className="text-small text-muted mb-3">
                  {labelFor(t, PROJECT_TYPE_KEYS, p.project_type)}
                  {p.next_milestone_title
                    ? t("portal.projectsPage.nextSuffix", {
                        title: p.next_milestone_title,
                      })
                    : ""}
                  {p.open_customer_actions
                    ? t("portal.projectsPage.openActionsSuffix", {
                        count: p.open_customer_actions,
                      })
                    : ""}
                </p>
                <div className="h-2 rounded-full bg-surface-elevated overflow-hidden mb-2">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${p.progress_percent}%` }}
                  />
                </div>
                <p className="text-small text-muted">
                  {p.progress_percent}%
                  {p.planned_delivery_date
                    ? t("portal.projectsPage.plannedSuffix", {
                        date: formatDate(p.planned_delivery_date, locale),
                      })
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
