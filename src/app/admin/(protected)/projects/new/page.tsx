import type { Metadata } from "next";
import Link from "next/link";
import { createProjectAction } from "@/server/actions/project-actions";
import { listAdminOrganizations } from "@/server/repositories/admin-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_STATUS_KEYS, PROJECT_TYPE_KEYS, labelFor } from "@/lib/portal/labels";
import { PROJECT_TYPES } from "@/lib/validation/projects";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.projects.newProject"), robots: { index: false } };
}

/** DB enum codes — values stay untranslated, labels come from the dictionary. */
const PRIORITY_CODES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const INITIAL_STATUS_CODES = ["DRAFT", "PLANNED"] as const;

export default async function AdminNewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ fout?: string }>;
}) {
  const { t, locale } = await getDictionary();
  const { fout } = await searchParams;
  const { organizations } = await listAdminOrganizations({
    pageSize: 100,
    status: "ACTIVE",
  });

  const activeOrgs = organizations.filter((o) => o.status === "ACTIVE");

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link
          href={withLocale("/admin/projects", locale)}
          className="text-small text-primary hover:underline"
        >
          ← {t("admin.projects")}
        </Link>
        <h1 className="text-h1 mt-2">{t("admin.page.projects.newProject")}</h1>
        <p className="text-muted text-small mt-1">
          {t("admin.page.projects.newSubtitle")}
        </p>
      </div>

      {fout ? (
        <p className="text-sm text-red-600" role="alert">
          {t("admin.page.projects.createFailed")}
        </p>
      ) : null}

      {activeOrgs.length === 0 ? (
        <p className="text-muted text-small">
          {t("admin.page.projects.noOrganizations")}
        </p>
      ) : (
        <form action={createProjectAction} className="space-y-4">
          <div>
            <label htmlFor="organizationId" className="block text-small font-medium mb-1">
              {t("admin.page.projects.form.organization")}
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
              {t("admin.page.projects.form.name")}
            </label>
            <Input id="name" name="name" required maxLength={200} />
          </div>
          <div>
            <label htmlFor="projectType" className="block text-small font-medium mb-1">
              {t("admin.page.projects.form.type")}
            </label>
            <select
              id="projectType"
              name="projectType"
              className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
              defaultValue="WEBSITE"
            >
              {PROJECT_TYPES.map((projectType) => (
                <option key={projectType} value={projectType}>
                  {labelFor(t, PROJECT_TYPE_KEYS, projectType)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="priority" className="block text-small font-medium mb-1">
              {t("admin.page.projects.form.priority")}
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue="NORMAL"
              className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
            >
              {PRIORITY_CODES.map((code) => (
                <option key={code} value={code}>
                  {t(`admin.page.projects.priority.${code}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-small font-medium mb-1">
              {t("admin.page.projects.form.initialStatus")}
            </label>
            <select
              id="status"
              name="status"
              defaultValue="DRAFT"
              className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
            >
              {INITIAL_STATUS_CODES.map((code) => (
                <option key={code} value={code}>
                  {labelFor(t, PROJECT_STATUS_KEYS, code)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="visibility" className="block text-small font-medium mb-1">
              {t("admin.page.projects.form.visibility")}
            </label>
            <select
              id="visibility"
              name="visibility"
              defaultValue="INTERNAL"
              className="w-full min-h-11 px-3 rounded-lg border border-border bg-background text-sm"
            >
              <option value="INTERNAL">
                {t("admin.page.projects.form.visibilityInternal")}
              </option>
              <option value="CUSTOMER_VISIBLE">
                {t("admin.page.projects.form.visibilityCustomer")}
              </option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="startDate" className="block text-small font-medium mb-1">
                {t("admin.page.projects.form.startDate")}
              </label>
              <Input id="startDate" name="startDate" type="date" />
            </div>
            <div>
              <label htmlFor="plannedDeliveryDate" className="block text-small font-medium mb-1">
                {t("admin.page.projects.form.plannedDelivery")}
              </label>
              <Input id="plannedDeliveryDate" name="plannedDeliveryDate" type="date" />
            </div>
          </div>
          <div>
            <label htmlFor="description" className="block text-small font-medium mb-1">
              {t("admin.page.projects.form.description")}
            </label>
            <Textarea id="description" name="description" rows={4} maxLength={5000} />
          </div>
          <Button type="submit">{t("admin.page.projects.form.submit")}</Button>
        </form>
      )}
    </div>
  );
}
