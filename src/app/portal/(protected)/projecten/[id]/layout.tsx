import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalProject } from "@/server/repositories/portal";
import {
  PROJECT_STATUS_NL,
  PROJECT_TYPE_NL,
  labelNl,
} from "@/lib/portal/labels";

export default async function PortalProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project } = await getPortalProject(id);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal/projecten"
          className="text-small text-primary hover:underline"
        >
          ← Projecten
        </Link>
        <h1 className="text-h1 mt-2">{project.name}</h1>
        <p className="text-muted mt-1">
          {labelNl(PROJECT_TYPE_NL, project.project_type)} ·{" "}
          {labelNl(PROJECT_STATUS_NL, project.status)}
          {project.project_number ? ` · ${project.project_number}` : ""}
        </p>
      </div>
      {children}
    </div>
  );
}
