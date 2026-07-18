import Link from "next/link";

export function ProjectTabShell({
  projectId,
  active,
  children,
}: {
  projectId: string;
  active:
    | "overview"
    | "milestones"
    | "actions"
    | "deliverables"
    | "documents"
    | "feedback"
    | "activity"
    | "settings";
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <AdminProjectTabs projectId={projectId} active={active} />
      {children}
    </div>
  );
}

const TABS = [
  { href: "overview", label: "Overzicht" },
  { href: "milestones", label: "Mijlpalen" },
  { href: "actions", label: "Acties" },
  { href: "deliverables", label: "Opleveringen" },
  { href: "documents", label: "Documenten" },
  { href: "feedback", label: "Feedback" },
  { href: "activity", label: "Activiteit" },
  { href: "settings", label: "Instellingen" },
] as const;

export function AdminProjectTabs({
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
        const href = `/admin/projects/${projectId}/${tab.href}`;
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
