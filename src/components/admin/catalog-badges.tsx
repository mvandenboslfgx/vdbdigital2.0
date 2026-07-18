import { Badge } from "@/components/ui/container";
import { cn } from "@/lib/utilities/cn";

const STATUS_NL: Record<string, string> = {
  DRAFT: "Concept",
  REVIEW: "In review",
  PUBLISHED: "Gepubliceerd",
  HIDDEN: "Verborgen",
  ARCHIVED: "Gearchiveerd",
};

const PRICE_MODE_NL: Record<string, string> = {
  FIXED: "Vaste prijs",
  STARTING_FROM: "Vanaf-prijs",
  QUOTE_ONLY: "Alleen offerte",
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_NL[status] ?? status;
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

export function PriceModeBadge({ mode }: { mode: string }) {
  return (
    <Badge className="border border-border">
      {PRICE_MODE_NL[mode] ?? mode}
      {mode === "QUOTE_ONLY" || mode === "STARTING_FROM" ? " · Alleen offerte" : ""}
    </Badge>
  );
}

export function EligibilityBadge({ sellable }: { sellable: boolean }) {
  return sellable ? (
    <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-800">
      Direct verkoopbaar
    </Badge>
  ) : (
    <Badge className="border border-rose-200 bg-rose-50 text-rose-800">
      Checkout geblokkeerd
    </Badge>
  );
}

export function AudienceBadges({
  b2b,
  b2c,
  b2bLegal,
  b2cLegal,
}: {
  b2b: boolean;
  b2c: boolean;
  b2bLegal: boolean;
  b2cLegal: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {b2b && (
        <Badge className={b2bLegal ? "border border-emerald-200" : "border border-amber-200"}>
          {b2bLegal ? "B2B toegestaan" : "B2B doelgroep"}
        </Badge>
      )}
      {b2c && (
        <Badge className={b2cLegal ? "border border-emerald-200" : "border border-amber-200"}>
          {b2cLegal ? "B2C toegestaan" : "B2C doelgroep"}
        </Badge>
      )}
    </div>
  );
}

export { STATUS_NL, PRICE_MODE_NL };
