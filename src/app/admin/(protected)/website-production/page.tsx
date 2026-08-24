import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/portal/empty-state";
import { listWebsiteProductionJobs } from "@/server/repositories/admin-commerce";

export const metadata: Metadata = {
  title: "Website-productie",
  robots: { index: false },
};

export default async function AdminWebsiteProductionPage() {
  const jobs = await listWebsiteProductionJobs(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Website-productie</h1>
        <p className="text-small text-muted mt-2">
          Automatische jobs na een betaalde websitebestelling. Production-deploy
          gebeurt nooit zonder review.
        </p>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="Nog geen websitejobs"
          description="Na een betaalde website-order maakt het systeem automatisch een project, intake en generate-job aan."
        />
      ) : (
        <ul className="space-y-3 md:hidden">
          {jobs.map((job) => {
            const spec = (job.spec ?? {}) as Record<string, unknown>;
            return (
              <li key={job.id as string} className="rounded-xl border border-border p-4 space-y-1">
                <p className="font-medium">{String(job.job_type)}</p>
                <p className="text-small text-muted">
                  {String(job.status)} · {String(spec.lifecycle ?? "—")}
                </p>
                {job.project_id ? (
                  <Link
                    href={`/admin/projects/${job.project_id}`}
                    className="text-small text-primary hover:underline"
                  >
                    Open project
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {jobs.length > 0 ? (
        <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-small">
            <thead className="text-muted">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Lifecycle</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Fout</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const spec = (job.spec ?? {}) as Record<string, unknown>;
                return (
                  <tr key={job.id as string} className="border-t border-border">
                    <td className="px-3 py-2">{String(job.job_type)}</td>
                    <td className="px-3 py-2">{String(job.status)}</td>
                    <td className="px-3 py-2">{String(spec.lifecycle ?? "—")}</td>
                    <td className="px-3 py-2">
                      {job.project_id ? (
                        <Link
                          href={`/admin/projects/${job.project_id}`}
                          className="text-primary hover:underline"
                        >
                          Open
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted">{(job.last_error as string | null) ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
