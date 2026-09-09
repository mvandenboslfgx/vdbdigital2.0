import { Building2, Rocket, UserRound } from "lucide-react";
import { Container } from "@/components/ui/container";
import { getDictionary } from "@/i18n/get-dictionary";
import { siteConfig } from "@/config/site";
import { getDeliveredProjectCount } from "@/config/commercial/cases";

/**
 * Slim trust bar under the hero. Every item is either sourced from real,
 * always-current data (case catalog, env-configured KvK) or a claim that's
 * true by construction (single-founder studio) — nothing invented.
 */
export async function TrustStripSection() {
  const { t } = await getDictionary();
  const kvk = siteConfig.company.kvk;
  const projectCount = getDeliveredProjectCount();

  if (projectCount === 0 && !kvk) return null;

  const items = [
    kvk
      ? { icon: Building2, label: t("home.trustKvk", { number: kvk }) }
      : null,
    projectCount > 0
      ? {
          icon: Rocket,
          label: t(
            projectCount === 1
              ? "home.trustProjectsSingular"
              : "home.trustProjectsPlural",
            { count: projectCount },
          ),
        }
      : null,
    { icon: UserRound, label: t("home.trustFounder") },
  ].filter((item): item is { icon: typeof Building2; label: string } =>
    Boolean(item),
  );

  return (
    <div className="border-y border-border/60 bg-surface-elevated/30 py-4">
      <Container>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:justify-between">
          {items.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2 text-small text-muted"
            >
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}
