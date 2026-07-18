import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/require-admin";
import { requirePermission } from "@/server/auth/require-permission";
import { createServiceRoleClient } from "@/lib/database/server";
import { writeAuditLog } from "@/lib/security/audit-log";
import { listAdminOrganizations } from "@/server/repositories/admin-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const metadata: Metadata = {
  title: "Nieuw project",
  robots: { index: false },
};

async function createProject(formData: FormData) {
  "use server";
  const ctx = await requireAdmin();
  await requirePermission(ctx, "projects.create");

  const parsed = z
    .object({
      organizationId: z.string().uuid(),
      name: z.string().min(2).max(200),
      description: z.string().max(5000).optional(),
      projectType: z.string().min(1),
    })
    .safeParse({
      organizationId: formData.get("organizationId"),
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      projectType: formData.get("projectType"),
    });

  if (!parsed.success) {
    redirect("/admin/projects/new?fout=1");
  }

  const supabase = createServiceRoleClient();
  if (!supabase) redirect("/admin/projects/new?fout=1");

  const { data, error } = await supabase
    .from("portal_projects")
    .insert({
      organization_id: parsed.data.organizationId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      project_type: parsed.data.projectType,
      status: "PLANNED",
      customer_visible: true,
      project_manager_id: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/admin/projects/new?fout=1");
  }

  await writeAuditLog({
    userId: ctx.user.id,
    action: "admin.project_created",
    metadata: { projectId: data.id },
  });

  redirect(`/admin/projects/${data.id}`);
}

export default async function AdminNewProjectPage() {
  const { organizations } = await listAdminOrganizations({ pageSize: 100 });

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-h1">Nieuw project</h1>
      {organizations.length === 0 ? (
        <p className="text-muted text-small">
          Maak eerst een klant aan voordat je een project start.
        </p>
      ) : (
        <form action={createProject} className="space-y-4">
          <div>
            <label htmlFor="organizationId" className="block text-small font-medium mb-1">
              Klantorganisatie
            </label>
            <select
              id="organizationId"
              name="organizationId"
              required
              className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
            >
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.trade_name || o.legal_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="name" className="block text-small font-medium mb-1">
              Projectnaam
            </label>
            <Input id="name" name="name" required maxLength={200} />
          </div>
          <div>
            <label htmlFor="projectType" className="block text-small font-medium mb-1">
              Type
            </label>
            <select
              id="projectType"
              name="projectType"
              className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
              defaultValue="WEBSITE"
            >
              <option value="WEBSITE">Website</option>
              <option value="WEBSHOP">Webshop</option>
              <option value="SOFTWARE">Software</option>
              <option value="OPTIMISATION">Optimalisatie</option>
              <option value="MAINTENANCE">Onderhoud</option>
              <option value="BRANDING">Branding</option>
              <option value="INTEGRATION">Integratie</option>
              <option value="SUPPORT">Ondersteuning</option>
              <option value="OTHER">Overig</option>
            </select>
          </div>
          <div>
            <label htmlFor="description" className="block text-small font-medium mb-1">
              Omschrijving
            </label>
            <Textarea id="description" name="description" rows={4} maxLength={5000} />
          </div>
          <Button type="submit">Project opslaan</Button>
        </form>
      )}
    </div>
  );
}
