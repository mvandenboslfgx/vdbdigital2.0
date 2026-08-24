import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { listFulfillmentJobs } from "@/server/services/fulfillment/jobs";
import {
  retryFulfillmentJobAction,
  resolveFulfillmentJobAction,
} from "@/server/actions/fulfillment-job-actions";

export const dynamic = "force-dynamic";

export default async function AdminFulfillmentJobsPage() {
  const ctx = await requireAdmin();
  await requirePermission(ctx, "jobs.review");
  const jobs = await listFulfillmentJobs(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">Fulfillment jobs</h1>
        <p className="text-small text-muted mt-2">
          Retry-safe queue na betaling. Geen databasehandwerk nodig voor review of retry.
        </p>
      </div>

      {jobs.length === 0 ? (
        <p className="text-muted">Geen jobs in de wachtrij.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-light-border">
          <table className="w-full min-w-[720px] text-left text-small">
            <thead className="bg-light-surface text-light-muted">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Fout</th>
                <th className="px-3 py-2">Acties</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-light-border">
                  <td className="px-3 py-2 font-mono text-xs">{job.orderId.slice(0, 8)}</td>
                  <td className="px-3 py-2">{job.fulfillmentType}</td>
                  <td className="px-3 py-2">{job.status}</td>
                  <td className="px-3 py-2">{job.provider}</td>
                  <td className="px-3 py-2 text-muted">{job.lastError ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <form action={retryFulfillmentJobAction}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <button type="submit" className="min-h-11 rounded-lg border px-3">
                          Retry
                        </button>
                      </form>
                      <form action={resolveFulfillmentJobAction}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <input type="hidden" name="status" value="completed" />
                        <button type="submit" className="min-h-11 rounded-lg border px-3">
                          Markeer gedaan
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
