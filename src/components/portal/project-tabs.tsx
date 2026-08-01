import Link from "next/link";
import { getDictionary } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";

export async function PortalProjectTabShell({
  projectId,
  active,
  children,
}: {
  projectId: string;
  active: ProjectTabId;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PortalProjectTabs projectId={projectId} active={active} />
      {children}
    </div>
  );
}

/** Segment doubles as the dictionary key under `portal.projectDetail.tabs`. */
const TAB_IDS = [
  "overview",
  "milestones",
  "deliverables",
  "documents",
  "feedback",
  "activity",
] as const;

export type ProjectTabId = (typeof TAB_IDS)[number];

export async function PortalProjectTabs({
  projectId,
  active,
}: {
  projectId: string;
  active: ProjectTabId;
}) {
  const { t, locale } = await getDictionary();

  return (
    <nav
      aria-label={t("portal.projectDetail.tabsAria")}
      className="flex gap-1 overflow-x-auto border-b border-border pb-px -mx-1 px-1"
    >
      {TAB_IDS.map((tab) => {
        const href = withLocale(`/portal/projecten/${projectId}/${tab}`, locale);
        const isActive = active === tab;
        return (
          <Link
            key={tab}
            href={href}
            className={`shrink-0 min-h-11 px-3 inline-flex items-center text-sm rounded-t-lg border-b-2 ${
              isActive
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted hover:text-foreground"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {t(`portal.projectDetail.tabs.${tab}`)}
          </Link>
        );
      })}
    </nav>
  );
}
