import { Badge } from "@/components/ui/container";
import { cn } from "@/lib/utilities/cn";
import type { CatalogBadgeLabels } from "@/lib/admin/catalog-badge-labels";

export function StatusBadge({
  status,
  labels,
}: {
  status: string;
  labels: CatalogBadgeLabels;
}) {
  const label = labels.productStatus[status] ?? status;
  const tone =
    status === "PUBLISHED"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : status === "ARCHIVED" || status === "HIDDEN"
        ? "bg-slate-100 text-slate-700 border-slate-200"
        : status === "REVIEW"
          ? "bg-amber-50 text-amber-900 border-amber-200"
          : "bg-sky-50 text-sky-900 border-sky-200";
  return <Badge className={cn("border", tone)}>{label}</Badge>;
}

export function PriceModeBadge({
  mode,
  labels,
}: {
  mode: string;
  labels: CatalogBadgeLabels;
}) {
  return (
    <Badge className="border border-border">
      {labels.priceMode[mode] ?? mode}
      {mode === "QUOTE_ONLY" || mode === "STARTING_FROM"
        ? ` · ${labels.quoteOnlySuffix}`
        : ""}
    </Badge>
  );
}

export function EligibilityBadge({
  sellable,
  labels,
}: {
  sellable: boolean;
  labels: CatalogBadgeLabels;
}) {
  return sellable ? (
    <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-800">
      {labels.directlySellable}
    </Badge>
  ) : (
    <Badge className="border border-rose-200 bg-rose-50 text-rose-800">
      {labels.checkoutBlocked}
    </Badge>
  );
}

export function AudienceBadges({
  b2b,
  b2c,
  b2bLegal,
  b2cLegal,
  labels,
}: {
  b2b: boolean;
  b2c: boolean;
  b2bLegal: boolean;
  b2cLegal: boolean;
  labels: CatalogBadgeLabels;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {b2b && (
        <Badge className={b2bLegal ? "border border-emerald-200" : "border border-amber-200"}>
          {b2bLegal ? labels.b2bAllowed : labels.b2bAudience}
        </Badge>
      )}
      {b2c && (
        <Badge className={b2cLegal ? "border border-emerald-200" : "border border-amber-200"}>
          {b2cLegal ? labels.b2cAllowed : labels.b2cAudience}
        </Badge>
      )}
    </div>
  );
}
