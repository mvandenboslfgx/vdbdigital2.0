import { notFound } from "next/navigation";
import { PortalProjectTabShell } from "@/components/portal/project-tabs";
import { ProjectFeedbackForm } from "@/components/portal/project-customer-forms";
import { getPortalProject } from "@/server/repositories/portal";
import { hasCustomerPermission } from "@/lib/auth/customer-permissions";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function PortalProjectFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { id } = await params;
  const bundle = await getPortalProject(id);
  if (!bundle.project) notFound();

  const canFeedback = hasCustomerPermission(
    bundle.ctx.customerRole,
    "portal.projects.feedback",
  );

  return (
    <PortalProjectTabShell projectId={id} active="feedback">
      {canFeedback ? <ProjectFeedbackForm projectId={id} /> : null}
      {bundle.feedback.length === 0 ? (
        <p className="text-muted text-small">
          {t("portal.projectFeedbackPage.empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {bundle.feedback.map(
            (f: { id: string; body: string; created_at: string }) => (
              <li
                key={f.id}
                className="rounded-lg border border-border p-4 text-small"
              >
                <p className="whitespace-pre-wrap">{f.body}</p>
                <p className="text-muted mt-2">
                  {new Date(f.created_at).toLocaleString(
                    locale === "nl" ? "nl-NL" : "en-US",
                  )}
                </p>
              </li>
            ),
          )}
        </ul>
      )}
    </PortalProjectTabShell>
  );
}
