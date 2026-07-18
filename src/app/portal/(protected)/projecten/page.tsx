import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listPortalProjects } from "@/server/repositories/portal";
import {
  PROJECT_STATUS_NL,
  PROJECT_TYPE_NL,
  labelNl,
} from "@/lib/portal/labels";

export const metadata: Metadata = {
  title: "Projecten",
  robots: { index: false },
};

export default async function PortalProjectsPage() {
  const result = await listPortalProjects();
  const projects = result.projects;

  return (
    <div className="space-y-6">
      <h1 className="text-h1">Projecten</h1>
      {projects.length === 0 ? (
        <EmptyState
          title="Geen projecten"
          description="Er zijn momenteel geen projecten aan je account gekoppeld."
        />
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/portal/projecten/${p.id}/overview`}
                className="block rounded-xl border border-border bg-surface p-5 hover:border-primary transition-colors"
              >
                <div className="flex flex-wrap justify-between gap-2 mb-2">
                  <h2 className="font-medium text-lg">{p.name}</h2>
                  <span className="text-small text-muted">
                    {labelNl(PROJECT_STATUS_NL, p.status)}
                  </span>
                </div>
                <p className="text-small text-muted mb-3">
                  {labelNl(PROJECT_TYPE_NL, p.project_type)}
                  {p.next_milestone_title
                    ? ` · Volgende: ${p.next_milestone_title}`
                    : ""}
                  {p.open_customer_actions
                    ? ` · ${p.open_customer_actions} open actie(s)`
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
                    ? ` · Gepland ${new Date(p.planned_delivery_date).toLocaleDateString("nl-NL")}`
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
