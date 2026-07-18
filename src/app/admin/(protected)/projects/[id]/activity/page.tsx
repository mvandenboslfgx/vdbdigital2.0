import { notFound } from "next/navigation";
import { ProjectTabShell } from "@/components/admin/project-tabs";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";

export default async function AdminProjectActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAdminProjectBundle(id);
  if (!bundle) notFound();

  return (
    <ProjectTabShell projectId={id} active="activity">
      {bundle.activity.length === 0 ? (
        <p className="text-muted text-small">Nog geen activiteit.</p>
      ) : (
        <ol className="space-y-3">
          {bundle.activity.map(
            (a: {
              id: string;
              summary: string;
              activity_type: string;
              visibility: string;
              created_at: string;
            }) => (
              <li key={a.id} className="rounded-xl border border-border p-4 text-small">
                <p className="font-medium">{a.summary}</p>
                <p className="text-muted mt-1">
                  {a.activity_type} ·{" "}
                  {a.visibility === "CUSTOMER_VISIBLE" ? "klantzichtbaar" : "intern"}{" "}
                  · {new Date(a.created_at).toLocaleString("nl-NL")}
                </p>
              </li>
            ),
          )}
        </ol>
      )}
    </ProjectTabShell>
  );
}
