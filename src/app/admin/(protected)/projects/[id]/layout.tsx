import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminProjectBundle } from "@/server/repositories/admin-projects";
import {
  PROJECT_STATUS_KEYS,
  PROJECT_TYPE_KEYS,
  labelFor,
} from "@/lib/portal/labels";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function AdminProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { t } = await getDictionary();
  const { id } = await params;
  const bundle = await getAdminProjectBundle(id);
  if (!bundle) notFound();

  const { project } = bundle;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/projects" className="text-small text-primary hover:underline">
          ← Projecten
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-h1">{project.name}</h1>
          <span className="text-small text-muted font-mono">
            {project.project_number}
          </span>
        </div>
        <p className="text-muted text-small mt-1">
          {project.organization?.trade_name ||
            project.organization?.legal_name ||
            "—"}{" "}
          · {labelFor(t, PROJECT_TYPE_KEYS, project.project_type)} ·{" "}
          {labelFor(t, PROJECT_STATUS_KEYS, project.status)} ·{" "}
          {project.visibility === "CUSTOMER_VISIBLE"
            ? "Klantzichtbaar"
            : "Intern"}
        </p>
      </div>
      {children}
    </div>
  );
}
