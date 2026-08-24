import type { Metadata } from "next";
import { requireCustomer } from "@/server/auth/require-customer";
import { createServiceRoleClient } from "@/lib/database/server";
import { EmptyState } from "@/components/portal/empty-state";
import { WebsiteIntakeForm } from "@/components/portal/website-intake-form";

export const metadata: Metadata = {
  title: "Intake",
  robots: { index: false },
};

export default async function PortalIntakePage() {
  const ctx = await requireCustomer();
  const supabase = createServiceRoleClient();
  const { data: intakes } = supabase
    ? await supabase
        .from("website_intakes")
        .select(
          "id, status, payload, project_id, updated_at, project:portal_projects(id, name, project_number)",
        )
        .eq("organization_id", ctx.organization.id)
        .order("updated_at", { ascending: false })
    : { data: [] };

  const rows = intakes ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1">Website-intake</h1>
        <p className="text-muted text-small mt-1">
          Na een betaalde websitebestelling staat je intake hier klaar. Geen los
          WhatsApp-formulier.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nog geen intake"
          description="Intake verschijnt automatisch zodra een websitepakket is betaald."
        />
      ) : (
        <div className="space-y-8">
          {rows.map((intake) => {
            const projectRaw = (intake as { project?: unknown }).project;
            const project = (Array.isArray(projectRaw) ? projectRaw[0] : projectRaw) as
              | { id: string; name: string; project_number: string }
              | null;
            return (
              <section key={intake.id as string} className="space-y-3">
                <h2 className="text-h3">
                  {project?.name ?? "Websiteproject"}{" "}
                  <span className="text-muted text-small">
                    {String(intake.status)}
                  </span>
                </h2>
                <WebsiteIntakeForm
                  projectId={intake.project_id as string}
                  status={intake.status as string}
                  payload={(intake.payload ?? {}) as Record<string, string>}
                />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
