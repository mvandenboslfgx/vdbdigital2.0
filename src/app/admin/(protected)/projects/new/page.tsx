import type { Metadata } from "next";
import Link from "next/link";
import { createProjectAction } from "@/server/actions/project-actions";
import { listAdminOrganizations } from "@/server/repositories/admin-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_TYPE_NL, labelNl } from "@/lib/portal/labels";
import { PROJECT_TYPES } from "@/lib/validation/projects";

export const metadata: Metadata = {
  title: "Nieuw project",
  robots: { index: false },
};

export default async function AdminNewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ fout?: string }>;
}) {
  const { fout } = await searchParams;
  const { organizations } = await listAdminOrganizations({
    pageSize: 100,
    status: "ACTIVE",
  });

  const activeOrgs = organizations.filter((o) => o.status === "ACTIVE");

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/admin/projects" className="text-small text-primary hover:underline">
          ← Projecten
        </Link>
        <h1 className="text-h1 mt-2">Nieuw project</h1>
        <p className="text-muted text-small mt-1">
          Concept blijft standaard intern. Geen automatische klantmail in deze fase.
        </p>
      </div>

      {fout ? (
        <p className="text-sm text-red-600" role="alert">
          Project aanmaken is niet gelukt. Controleer de gegevens en probeer opnieuw.
        </p>
      ) : null}

      {activeOrgs.length === 0 ? (
        <p className="text-muted text-small">
          Maak eerst een actieve klantorganisatie aan voordat je een project start.
        </p>
      ) : (
        <form action={createProjectAction} className="space-y-4">
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
              {activeOrgs.map((o) => (
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
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {labelNl(PROJECT_TYPE_NL, t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="priority" className="block text-small font-medium mb-1">
              Prioriteit
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue="NORMAL"
              className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
            >
              <option value="LOW">Laag</option>
              <option value="NORMAL">Normaal</option>
              <option value="HIGH">Hoog</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-small font-medium mb-1">
              Initiële status
            </label>
            <select
              id="status"
              name="status"
              defaultValue="DRAFT"
              className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
            >
              <option value="DRAFT">Concept</option>
              <option value="PLANNED">Gepland</option>
            </select>
          </div>
          <div>
            <label htmlFor="visibility" className="block text-small font-medium mb-1">
              Klantzichtbaarheid
            </label>
            <select
              id="visibility"
              name="visibility"
              defaultValue="INTERNAL"
              className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
            >
              <option value="INTERNAL">Alleen intern (standaard)</option>
              <option value="CUSTOMER_VISIBLE">Zichtbaar voor klant</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="startDate" className="block text-small font-medium mb-1">
                Startdatum
              </label>
              <Input id="startDate" name="startDate" type="date" />
            </div>
            <div>
              <label htmlFor="plannedDeliveryDate" className="block text-small font-medium mb-1">
                Geplande oplevering
              </label>
              <Input id="plannedDeliveryDate" name="plannedDeliveryDate" type="date" />
            </div>
          </div>
          <div>
            <label htmlFor="description" className="block text-small font-medium mb-1">
              Omschrijving
            </label>
            <Textarea id="description" name="description" rows={4} maxLength={5000} />
          </div>
          <Button type="submit">Concept opslaan</Button>
        </form>
      )}
    </div>
  );
}
