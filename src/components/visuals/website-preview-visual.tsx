import { VisualFrame } from "@/components/visuals/visual-frame";
import { getDictionary } from "@/i18n/get-dictionary";

interface WebsitePreviewVisualProps {
  className?: string;
}

/** Illustrative product flow — site, enquiry CTA, follow-up. No fake metrics. */
export async function WebsitePreviewVisual({ className }: WebsitePreviewVisualProps) {
  const { t } = await getDictionary();

  return (
    <VisualFrame title={t("home.visualTitle")} className={className}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 rounded-md border border-border/80 bg-background/80 px-2.5 py-2">
          <span className="text-nowrap-safe text-[11px] font-medium text-foreground">
            {t("home.visualSiteLabel")}
          </span>
          <span className="text-nowrap-safe rounded bg-primary/25 px-2 py-0.5 text-[10px] font-medium text-primary">
            {t("home.statusConversion")}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 space-y-2 rounded-md border border-border bg-background p-2.5">
            <div className="h-2 w-3/4 rounded-sm bg-muted/40" />
            <div className="h-2 w-1/2 rounded-sm bg-muted/25" />
            <div className="mt-3 inline-flex rounded-md bg-primary px-2.5 py-1.5 text-[10px] font-medium text-primary-fg">
              {t("home.visualPointCta")}
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-md border border-border bg-background p-2">
            <span className="text-[10px] text-muted">{t("home.visualFormLabel")}</span>
            <div className="space-y-1.5">
              <div className="h-1.5 rounded-sm bg-muted/30" />
              <div className="h-1.5 rounded-sm bg-muted/30" />
              <div className="h-5 rounded-sm bg-primary/35" />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border bg-background px-2.5 py-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-nowrap-safe text-[11px] font-medium text-foreground">
              {t("home.visualAutomationLabel")}
            </span>
            <span className="text-nowrap-safe text-[10px] text-success">
              {t("home.statusAvailable")}
            </span>
          </div>
          <div className="flex gap-1.5">
            <div className="h-1.5 flex-1 rounded-full bg-primary/50" />
            <div className="h-1.5 flex-1 rounded-full bg-primary/30" />
            <div className="h-1.5 flex-1 rounded-full bg-border" />
          </div>
          <p className="mt-2 text-[10px] text-muted">{t("home.visualPointFollowup")}</p>
        </div>

        <ul className="space-y-1.5 text-xs text-muted">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
            {t("home.visualPointStructure")}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
            {t("home.visualPointMobile")}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
            {t("home.websitesStores")}
          </li>
        </ul>
      </div>
    </VisualFrame>
  );
}
