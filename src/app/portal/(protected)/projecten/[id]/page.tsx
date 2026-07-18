import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/container";
import { getPortalProject } from "@/server/repositories/portal";
import {
  PROJECT_STATUS_NL,
  PROJECT_TYPE_NL,
  labelNl,
} from "@/lib/portal/labels";

export const metadata: Metadata = {
  title: "Project",
  robots: { index: false },
};

export default async function PortalProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project, milestones, feedback } = await getPortalProject(id);
  if (!project) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/portal/projecten" className="text-small text-primary hover:underline">
          ← Projecten
        </Link>
        <h1 className="text-h1 mt-2">{project.name}</h1>
        <p className="text-muted mt-1">
          {labelNl(PROJECT_TYPE_NL, project.project_type)} ·{" "}
          {labelNl(PROJECT_STATUS_NL, project.status)}
        </p>
      </div>

      <Card>
        <p className="text-label text-muted mb-2">Voortgang</p>
        <div className="h-3 rounded-full bg-surface-elevated overflow-hidden mb-2">
          <div
            className="h-full bg-primary"
            style={{ width: `${project.progress_percent}%` }}
          />
        </div>
        <p className="text-small">{project.progress_percent}%</p>
        {project.description ? (
          <p className="mt-4 text-small whitespace-pre-wrap">{project.description}</p>
        ) : null}
      </Card>

      <section>
        <h2 className="text-h3 mb-4">Mijlpalen</h2>
        {milestones.length === 0 ? (
          <p className="text-muted text-small">Nog geen zichtbare mijlpalen.</p>
        ) : (
          <ol className="space-y-3">
            {milestones.map((m: { id: string; title: string; due_date: string | null; completed_at: string | null; description: string | null }) => (
              <li key={m.id} className="rounded-lg border border-border p-4">
                <p className="font-medium">{m.title}</p>
                {m.description ? (
                  <p className="text-small text-muted mt-1">{m.description}</p>
                ) : null}
                <p className="text-small text-muted mt-2">
                  {m.completed_at
                    ? `Afgerond op ${new Date(m.completed_at).toLocaleDateString("nl-NL")}`
                    : m.due_date
                      ? `Gepland: ${new Date(m.due_date).toLocaleDateString("nl-NL")}`
                      : "Nog geen datum"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="text-h3 mb-4">Feedback</h2>
        {feedback.length === 0 ? (
          <p className="text-muted text-small">Nog geen feedback geplaatst.</p>
        ) : (
          <ul className="space-y-3">
            {feedback.map((f: { id: string; body: string; created_at: string }) => (
              <li key={f.id} className="rounded-lg border border-border p-4 text-small">
                <p className="whitespace-pre-wrap">{f.body}</p>
                <p className="text-muted mt-2">
                  {new Date(f.created_at).toLocaleString("nl-NL")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
