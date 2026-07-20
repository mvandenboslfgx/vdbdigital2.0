import { VisualFrame } from "@/components/visuals/visual-frame";
import { getDictionary } from "@/i18n/get-dictionary";

interface WebsitePreviewVisualProps {
  className?: string;
}

/** Illustrative website layout — no fake client or revenue data */
export async function WebsitePreviewVisual({ className }: WebsitePreviewVisualProps) {
  const { t } = await getDictionary();

  return (
    <VisualFrame title={t("home.visualTitle")} className={className}>
      <div className="space-y-3">
        <div className="h-8 rounded-md bg-primary/20" />
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 h-20 rounded-md bg-background border border-border" />
          <div className="h-20 rounded-md bg-background border border-border" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 flex-1 rounded-md bg-primary/30" />
          <div className="h-8 w-16 rounded-md border border-border bg-background" />
        </div>
        <ul className="space-y-1.5 text-xs text-muted">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t("home.visualPointStructure")}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t("home.visualPointMobile")}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t("home.visualPointCta")}
          </li>
        </ul>
      </div>
    </VisualFrame>
  );
}
