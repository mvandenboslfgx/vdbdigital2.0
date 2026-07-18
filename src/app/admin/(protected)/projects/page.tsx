import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listAdminProjects } from "@/server/repositories/admin-portal";
import { PROJECT_STATUS_NL, labelNl } from "@/lib/portal/labels";

export const metadata: Metadata = {
  title: "Projecten",
  robots: { index: false },
};

export default async function AdminProjectsPage() {
  const projects = await listAdminProjects();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <h1 className="text-h1">Projecten</h1>
        <Link
          href="/admin/projects/new"
          className="rounded-lg bg-primary text-white px-4 py-2 text-sm min-h-11 inline-flex items-center"
        >
          Nieuw project
        </Link>
      </div>
      {projects.length === 0 ? (
        <EmptyState
          title="Nog geen projecten"
          description="Maak een project aan voor een klantorganisatie. Geen fictieve data."
          actionHref="/admin/projects/new"
          actionLabel="Project aanmaken"
        />
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => {
            const rawOrg = (p as { organization?: unknown }).organization;
            const organization = (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as
              | { legal_name: string }
              | null
              | undefined;
            return (
            <li key={p.id}>
              <Link
                href={`/admin/projects/${p.id}`}
                className="block rounded-xl border border-border p-4 hover:border-primary"
              >
                <p className="font-medium">{p.name}</p>
                <p className="text-small text-muted">
                  {organization?.legal_name ?? "—"} ·{" "}
                  {labelNl(PROJECT_STATUS_NL, p.status)} · {p.progress_percent}%
                </p>
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
