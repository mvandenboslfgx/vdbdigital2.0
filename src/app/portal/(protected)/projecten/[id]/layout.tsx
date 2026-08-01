import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalProject } from "@/server/repositories/portal";
import {
  PROJECT_STATUS_KEYS,
  PROJECT_TYPE_KEYS,
  labelFor,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";

export default async function PortalProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { id } = await params;
  const { project } = await getPortalProject(id);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={withLocale("/portal/projecten", locale)}
          className="text-small text-primary hover:underline"
        >
          {t("portal.projectDetail.backToProjects")}
        </Link>
        <h1 className="text-h1 mt-2">{project.name}</h1>
        <p className="text-muted mt-1">
          {labelFor(t, PROJECT_TYPE_KEYS, project.project_type)} ·{" "}
          {labelFor(t, PROJECT_STATUS_KEYS, project.status)}
          {project.project_number ? ` · ${project.project_number}` : ""}
        </p>
      </div>
      {children}
    </div>
  );
}
