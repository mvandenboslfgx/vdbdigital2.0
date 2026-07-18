import { Card } from "@/components/ui/container";
import { LinkButton } from "@/components/ui/link-button";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <Card className="text-center py-10 px-6">
      <h2 className="text-h3 mb-2">{title}</h2>
      <p className="text-muted text-small max-w-md mx-auto mb-6">{description}</p>
      {actionHref && actionLabel ? (
        <LinkButton href={actionHref}>{actionLabel}</LinkButton>
      ) : null}
    </Card>
  );
}
