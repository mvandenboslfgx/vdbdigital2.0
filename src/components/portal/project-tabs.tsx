import Link from "next/link";

export function PortalProjectTabShell({
  projectId,
  active,
  children,
}: {
  projectId: string;
  active:
    | "overview"
    | "milestones"
    | "deliverables"
    | "feedback"
    | "activity";
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PortalProjectTabs projectId={projectId} active={active} />
      {children}
    </div>
  );
}

const TABS = [
  { href: "overview", label: "Overzicht" },
  { href: "milestones", label: "Mijlpalen" },
  { href: "deliverables", label: "Opleveringen" },
  { href: "feedback", label: "Feedback" },
  { href: "activity", label: "Activiteit" },
] as const;

export function PortalProjectTabs({
  projectId,
  active,
}: {
  projectId: string;
  active: (typeof TABS)[number]["href"];
}) {
  return (
    <nav
      aria-label="Projectsecties"
      className="flex gap-1 overflow-x-auto border-b border-border pb-px -mx-1 px-1"
    >
      {TABS.map((tab) => {
        const href = `/portal/projecten/${projectId}/${tab.href}`;
        const isActive = active === tab.href;
        return (
          <Link
            key={tab.href}
            href={href}
            className={`shrink-0 min-h-11 px-3 inline-flex items-center text-sm rounded-t-lg border-b-2 ${
              isActive
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
