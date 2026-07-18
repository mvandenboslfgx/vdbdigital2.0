import { notFound } from "next/navigation";
import { ProjectTabShell } from "@/components/admin/project-tabs";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";

export default async function AdminProjectFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAdminProjectBundle(id);
  if (!bundle) notFound();

  return (
    <ProjectTabShell projectId={id} active="feedback">
      {bundle.feedback.length === 0 ? (
        <p className="text-muted text-small">Nog geen feedback.</p>
      ) : (
        <ul className="space-y-3">
          {bundle.feedback.map(
            (f: {
              id: string;
              body: string;
              visibility: string;
              status: string;
              created_at: string;
            }) => (
              <li key={f.id} className="rounded-xl border border-border p-4 text-small">
                <p className="text-muted mb-2">
                  {f.visibility === "INTERNAL" ? "Intern" : "Gedeeld met klant"} ·{" "}
                  {f.status} ·{" "}
                  {new Date(f.created_at).toLocaleString("nl-NL")}
                </p>
                <p className="whitespace-pre-wrap">{f.body}</p>
              </li>
            ),
          )}
        </ul>
      )}
    </ProjectTabShell>
  );
}
