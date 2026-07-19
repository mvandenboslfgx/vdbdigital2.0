import type { Metadata } from "next";
import { Card, Badge } from "@/components/ui/container";
import { caseCatalog, type CaseDefinition } from "@/config/commercial/cases";

export const metadata: Metadata = {
  title: "Manage cases",
  robots: { index: false },
};

function publicationBlockers(c: CaseDefinition): string[] {
  const blockers: string[] = [];
  if (c.status !== "PUBLISHED" && c.status !== "APPROVED") {
    blockers.push(`Status is ${c.status} (needs APPROVED or PUBLISHED)`);
  }
  if (!c.publicVisible) {
    blockers.push("publicVisible is false");
  }
  if (c.type === "real" && c.status !== "PUBLISHED") {
    blockers.push("Real client cases require PUBLISHED status");
  }
  if (
    (c.launchStatus === "COMING_SOON" ||
      c.launchStatus === "IN_DEVELOPMENT") &&
    c.liveLinkActive
  ) {
    blockers.push("COMING_SOON/IN_DEVELOPMENT cannot have liveLinkActive");
  }
  if (c.liveLinkActive) {
    if (c.launchStatus !== "LIVE") {
      blockers.push("liveLinkActive requires launchStatus LIVE");
    }
    if (!c.externalUrl?.startsWith("https://")) {
      blockers.push("LIVE live link requires valid HTTPS externalUrl");
    }
  }
  if (
    c.featured &&
    c.assetDir &&
    (c.launchStatus === "LIVE" ||
      c.launchStatus === "COMING_SOON" ||
      c.launchStatus === "IN_DEVELOPMENT")
  ) {
    // Screenshots expected under public/cases/{assetDir}/ — missing assets block polish, not catalog status.
  }
  const p = c.permissions;
  if (!p.permissionConfirmed) blockers.push("Missing: permissionConfirmed");
  if (!p.screenshotPermission) blockers.push("Missing: screenshotPermission");
  if (c.type === "real" && !p.logoPermission) blockers.push("Missing: logoPermission");
  if (c.type === "real" && !p.clientApprovalDate) {
    blockers.push("Missing: clientApprovalDate");
  }
  return blockers;
}

export default function AdminCasesPage() {
  return (
    <div>
      <h1 className="text-h1 mb-2">Cases</h1>
      <p className="text-muted mb-8 max-w-2xl">
        Catalog review view from{" "}
        <code className="text-small">caseCatalog</code>. Full database CRUD may
        come later — use this page to review status, permissions and publication
        blockers.
      </p>

      <div className="space-y-4">
        {caseCatalog.map((c) => {
          const blockers = publicationBlockers(c);
          return (
            <Card key={c.slug} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-h3">{c.slug}</h2>
                  <p className="text-small text-muted mt-1">
                    Sector: {c.sector} · i18n: {c.i18nKey}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{c.status}</Badge>
                  <Badge>{c.launchStatus}</Badge>
                  <Badge>{c.type}</Badge>
                  <Badge>{c.publicVisible ? "publicVisible" : "hidden"}</Badge>
                  <Badge>
                    {c.liveLinkActive ? "liveLinkActive" : "no live link"}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="text-small font-medium mb-2">Permissions</h3>
                <ul className="grid sm:grid-cols-2 gap-1 text-small text-muted">
                  <li>
                    permissionConfirmed:{" "}
                    {c.permissions.permissionConfirmed ? "yes" : "no"}
                  </li>
                  <li>
                    screenshotPermission:{" "}
                    {c.permissions.screenshotPermission ? "yes" : "no"}
                  </li>
                  <li>
                    logoPermission: {c.permissions.logoPermission ? "yes" : "no"}
                  </li>
                  <li>
                    testimonialPermission:{" "}
                    {c.permissions.testimonialPermission ? "yes" : "no"}
                  </li>
                  <li>
                    metricsVerified:{" "}
                    {c.permissions.metricsVerified ? "yes" : "no"}
                  </li>
                  <li>
                    clientApprovalDate:{" "}
                    {c.permissions.clientApprovalDate ?? "—"}
                  </li>
                </ul>
              </div>

              {blockers.length > 0 ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2">
                  <p className="text-small font-medium mb-1">
                    Publication blockers
                  </p>
                  <ul className="text-small text-muted space-y-0.5">
                    {blockers.map((b) => (
                      <li key={b}>• {b}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-small text-success">
                  No blockers from catalog rules.
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
