import { Card } from "@/components/ui/container";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { paths } from "@/i18n/config";

interface SoftwareProcurementPanelProps {
  title: string;
  body: string;
  curatedNote?: string;
  requestCta: string;
  introCta: string;
  /** Optional eyebrow — never internal review/candidate counts. */
  eyebrow?: string;
}

export function SoftwareProcurementPanel({
  title,
  body,
  curatedNote,
  requestCta,
  introCta,
  eyebrow,
}: SoftwareProcurementPanelProps) {
  return (
    <Card variant="light" className="py-10 px-6 sm:px-10 text-center max-w-3xl mx-auto">
      {eyebrow ? (
        <p className="text-label text-primary mb-3">{eyebrow}</p>
      ) : null}
      <h2 className="text-h2 text-light-foreground mb-4">{title}</h2>
      <p className="text-body text-light-muted mb-4 max-w-2xl mx-auto">{body}</p>
      {curatedNote ? (
        <p className="text-small text-light-muted mb-8 max-w-xl mx-auto">{curatedNote}</p>
      ) : (
        <div className="mb-8" />
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <LocaleLinkButton href={`${paths.quote}?intent=software-license`} size="lg">
          {requestCta}
        </LocaleLinkButton>
        <LocaleLinkButton
          href={`${paths.contact}?intent=introduction`}
          variant="outline"
          size="lg"
        >
          {introCta}
        </LocaleLinkButton>
      </div>
    </Card>
  );
}
