"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createProductAction,
  updateProductAction,
  publishProductAction,
  updateLegalApprovalAction,
  archiveProductAction,
  restoreProductAction,
  duplicateProductAction,
  deleteProductAction,
  type CatalogActionState,
} from "@/server/actions/catalog-actions";
import { billingWarningNl } from "@/lib/commerce/catalog-admin-eligibility";
import { LEGACY_TAWK_ADMIN_STATUS_LABEL } from "@/lib/commerce/tawk-legacy-blocklist";
import type { BillingType, PriceMode, Product } from "@/types";
import type { PublicationCheckItem } from "@/lib/commerce/publication-checklist";

type CategoryOption = { id: string; name: string };

interface Props {
  mode: "create" | "edit";
  product?: Product;
  categories: CategoryOption[];
  checklist?: PublicationCheckItem[];
  canPublish: boolean;
  canChangePrice: boolean;
  canLegal: boolean;
  canArchive: boolean;
  blockReasons: string[];
  legacyRemoved?: boolean;
}

const initialState: CatalogActionState = {};

function linesToArray(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function ProductEditorForm({
  mode,
  product,
  categories,
  checklist = [],
  canPublish,
  canChangePrice,
  canLegal,
  canArchive,
  blockReasons,
  legacyRemoved = false,
}: Props) {
  const router = useRouter();
  const [createState, createAction, createPending] = useActionState(
    createProductAction,
    initialState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateProductAction,
    initialState,
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishProductAction,
    initialState,
  );
  const [legalState, legalAction, legalPending] = useActionState(
    updateLegalApprovalAction,
    initialState,
  );

  const state = mode === "create" ? createState : updateState;
  const pending = createPending || updatePending || publishPending || legalPending;

  const [priceMode, setPriceMode] = useState<PriceMode>(
    product?.priceMode ??
      (product?.fromPriceCents != null
        ? "STARTING_FROM"
        : product?.priceCents != null
          ? "FIXED"
          : "QUOTE_ONLY"),
  );
  const [billingType, setBillingType] = useState<BillingType>(
    product?.billingType ?? "ONE_TIME",
  );
  const [dirty, setDirty] = useState(false);

  const billingWarn = useMemo(() => billingWarningNl(billingType), [billingType]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (createState.success && createState.productId) {
      router.push(`/admin/products/${createState.productId}`);
    } else if (updateState.success) {
      router.refresh();
    }
  }, [createState.success, createState.productId, updateState.success, router]);

  function buildPayload(form: HTMLFormElement) {
    const fd = new FormData(form);
    const euros = String(fd.get("amountEuros") ?? "").trim();
    const fromEuros = String(fd.get("fromAmountEuros") ?? "").trim();
    const toCents = (v: string) => {
      if (!v) return null;
      const normalized = v.replace(",", ".");
      if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
      const [w, f = ""] = normalized.split(".");
      return Number.parseInt(w, 10) * 100 + Number.parseInt((f + "00").slice(0, 2), 10);
    };

    return {
      id: product?.id,
      expectedVersion: product?.version ?? 1,
      name: String(fd.get("name") ?? ""),
      slug: String(fd.get("slug") ?? ""),
      internalSku: String(fd.get("internalSku") ?? "") || null,
      shortDescription: String(fd.get("shortDescription") ?? ""),
      fullDescription: String(fd.get("fullDescription") ?? ""),
      categoryId: String(fd.get("categoryId") ?? "") || null,
      badge: String(fd.get("badge") ?? "") || null,
      tags: String(fd.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      sortOrder: Number(fd.get("sortOrder") ?? 0),
      featured: fd.get("featured") === "on",
      deliveryTime: String(fd.get("deliveryTime") ?? ""),
      includedItems: linesToArray(String(fd.get("includedItems") ?? "")),
      excludedItems: linesToArray(String(fd.get("excludedItems") ?? "")),
      extensions: linesToArray(String(fd.get("extensions") ?? "")),
      benefits: linesToArray(String(fd.get("benefits") ?? "")),
      targetAudience: String(fd.get("targetAudience") ?? ""),
      workflow: String(fd.get("workflow") ?? ""),
      requiredInput: linesToArray(String(fd.get("requiredInput") ?? "")),
      ctaLabel: String(fd.get("ctaLabel") ?? "") || null,
      quoteCtaLabel: String(fd.get("quoteCtaLabel") ?? "") || null,
      warnings: String(fd.get("warnings") ?? "") || null,
      seoTitle: String(fd.get("seoTitle") ?? ""),
      seoDescription: String(fd.get("seoDescription") ?? ""),
      audienceB2b: fd.get("audienceB2b") === "on",
      audienceB2c: fd.get("audienceB2c") === "on",
      translations: [
        {
          locale: "nl" as const,
          name: String(fd.get("nl_name") ?? ""),
          shortDescription: String(fd.get("nl_shortDescription") ?? ""),
          fullDescription: String(fd.get("nl_fullDescription") ?? ""),
          benefits: linesToArray(String(fd.get("nl_benefits") ?? "")),
          includedItems: linesToArray(String(fd.get("nl_includedItems") ?? "")),
          excludedItems: linesToArray(String(fd.get("nl_excludedItems") ?? "")),
          ctaLabel: String(fd.get("nl_ctaLabel") ?? "") || null,
          quoteCtaLabel: String(fd.get("nl_quoteCtaLabel") ?? "") || null,
          seoTitle: String(fd.get("nl_seoTitle") ?? "") || null,
          seoDescription: String(fd.get("nl_seoDescription") ?? "") || null,
        },
        {
          locale: "en" as const,
          name: String(fd.get("en_name") ?? ""),
          shortDescription: String(fd.get("en_shortDescription") ?? ""),
          fullDescription: String(fd.get("en_fullDescription") ?? ""),
          benefits: linesToArray(String(fd.get("en_benefits") ?? "")),
          includedItems: linesToArray(String(fd.get("en_includedItems") ?? "")),
          excludedItems: linesToArray(String(fd.get("en_excludedItems") ?? "")),
          ctaLabel: String(fd.get("en_ctaLabel") ?? "") || null,
          quoteCtaLabel: String(fd.get("en_quoteCtaLabel") ?? "") || null,
          seoTitle: String(fd.get("en_seoTitle") ?? "") || null,
          seoDescription: String(fd.get("en_seoDescription") ?? "") || null,
        },
      ],
      pricing: {
        priceMode,
        billingType,
        priceCents: priceMode === "FIXED" ? toCents(euros) : null,
        fromPriceCents: priceMode === "STARTING_FROM" ? toCents(fromEuros) : null,
        compareAtCents: toCents(String(fd.get("compareAtEuros") ?? "")),
        currency: "EUR" as const,
        vatPercent: Number(fd.get("vatPercent") ?? 21),
        priceIncludesVat: fd.get("priceIncludesVat") === "on",
        priceLabel: String(fd.get("priceLabel") ?? "") || null,
        costCents: canChangePrice ? toCents(String(fd.get("costEuros") ?? "")) : null,
      },
    };
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = buildPayload(form);
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    setDirty(false);
    if (mode === "create") createAction(fd);
    else updateAction(fd);
  }

  const nl = product?.translations?.find((t) => t.locale === "nl");
  const en = product?.translations?.find((t) => t.locale === "en");

  const centsToEuros = (cents: number | null | undefined) =>
    cents === null || cents === undefined ? "" : (cents / 100).toFixed(2);

  return (
    <div className="space-y-8" onChange={() => setDirty(true)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-small text-muted mb-1">
            <Link href="/admin/products" className="hover:text-foreground">
              Producten
            </Link>{" "}
            / {mode === "create" ? "Nieuw" : "Bewerken"}
          </p>
          <h1 className="text-h1">
            {mode === "create" ? "Product aanmaken" : product?.name}
          </h1>
        </div>
        {product && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/products/${product.id}/preview`}
              className="inline-flex items-center min-h-11 px-4 rounded-lg border border-border text-sm"
            >
              Preview
            </Link>
            <form
              action={async (formData) => {
                await duplicateProductAction({}, formData);
              }}
            >
              <input type="hidden" name="id" value={product.id} />
              <Button type="submit" variant="outline" disabled={legacyRemoved}>
                Dupliceren
              </Button>
            </form>
          </div>
        )}
      </div>

      {legacyRemoved && (
        <div
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-small text-rose-950"
          role="status"
        >
          <p className="font-medium">{LEGACY_TAWK_ADMIN_STATUS_LABEL}</p>
          <p className="mt-1 text-muted">
            Geen publiceren, herstellen of juridische goedkeuring. Alleen veilige verwijdering is
            toegestaan.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-small text-amber-950">
        Directe checkout is momenteel algemeen uitgeschakeld. Juridische goedkeuring wordt nooit
        automatisch gezet door alleen B2B/B2C te kiezen.
      </div>

      {(state.error || publishState.error || legalState.error) && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-small text-rose-900" role="alert">
          {state.error || publishState.error || legalState.error}
        </div>
      )}
      {(state.success || publishState.success || legalState.success) && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-small text-emerald-900">
          Opgeslagen.
          {(publishState.warnings ?? state.warnings)?.map((w) => (
            <p key={w} className="mt-1">
              {w}
            </p>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold font-display">Algemene gegevens</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="name" label="Productnaam" required defaultValue={product?.name} />
            <Input name="slug" label="Slug" required defaultValue={product?.slug} hint="Alleen a-z, 0-9 en koppeltekens" />
            <Input name="internalSku" label="Interne SKU" defaultValue={product?.internalSku ?? ""} />
            <label className="space-y-1.5 text-small font-medium">
              Categorie
              <select
                name="categoryId"
                defaultValue={product?.categoryId ?? ""}
                className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
              >
                <option value="">Geen categorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <Input name="badge" label="Badge" defaultValue={product?.badge ?? ""} />
            <Input name="tags" label="Tags (komma-gescheiden)" defaultValue={(product?.tags ?? []).join(", ")} />
            <Input name="sortOrder" label="Sorteerpositie" type="number" defaultValue={product?.sortOrder ?? 0} />
            <label className="flex items-center gap-2 text-small mt-8">
              <input type="checkbox" name="featured" defaultChecked={product?.featured} />
              Uitgelicht op marketing
            </label>
          </div>
          <Textarea
            name="shortDescription"
            label="Korte omschrijving"
            required
            rows={3}
            defaultValue={product?.shortDescription}
          />
          <Textarea
            name="fullDescription"
            label="Volledige omschrijving"
            required
            rows={8}
            defaultValue={product?.fullDescription}
          />
          <p className="text-small text-muted -mt-2">
            Toegestaan: koppen, lijsten, vet, cursief en veilige links
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold font-display">Prijsinstellingen</h2>
          {!canChangePrice && (
            <p className="text-small text-muted">
              U mag content bewerken, maar geen prijzen wijzigen.
            </p>
          )}
          <fieldset disabled={!canChangePrice && mode === "edit"} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-small font-medium">
              Prijstype
              <select
                value={priceMode}
                onChange={(e) => setPriceMode(e.target.value as PriceMode)}
                className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
              >
                <option value="FIXED">FIXED — vaste prijs</option>
                <option value="STARTING_FROM">STARTING_FROM — vanaf-prijs (offerte)</option>
                <option value="QUOTE_ONLY">QUOTE_ONLY — alleen offerte</option>
              </select>
            </label>
            <label className="space-y-1.5 text-small font-medium">
              Billingmodel
              <select
                value={billingType}
                onChange={(e) => setBillingType(e.target.value as BillingType)}
                className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
              >
                <option value="ONE_TIME">ONE_TIME — eenmalig</option>
                <option value="MONTHLY">MONTHLY — maandelijks</option>
                <option value="YEARLY">YEARLY — jaarlijks</option>
                <option value="QUOTE_ONLY">QUOTE_ONLY</option>
                <option value="FREE">FREE</option>
              </select>
            </label>
            {priceMode === "FIXED" && (
              <Input
                name="amountEuros"
                label="Bedrag (EUR)"
                defaultValue={centsToEuros(product?.priceCents)}
                hint="Wordt opgeslagen als gehele centen"
              />
            )}
            {priceMode === "STARTING_FROM" && (
              <Input
                name="fromAmountEuros"
                label="Vanaf-bedrag (EUR)"
                defaultValue={centsToEuros(product?.fromPriceCents)}
              />
            )}
            <Input
              name="compareAtEuros"
              label="Oude prijs (optioneel, EUR)"
              defaultValue={centsToEuros(product?.compareAtCents)}
            />
            <Input name="vatPercent" label="BTW %" type="number" defaultValue={product?.vatPercent ?? 21} />
            <Input name="priceLabel" label="Prijslabel" defaultValue={product?.priceLabel ?? ""} />
            {canChangePrice && (
              <Input
                name="costEuros"
                label="Interne kostprijs (EUR)"
                defaultValue={centsToEuros(product?.costCents)}
              />
            )}
            <label className="flex items-center gap-2 text-small mt-8">
              <input
                type="checkbox"
                name="priceIncludesVat"
                defaultChecked={product?.priceIncludesVat}
              />
              Prijs inclusief btw
            </label>
          </fieldset>
          {billingWarn && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-small text-amber-950">
              {billingWarn}
            </div>
          )}
          {priceMode !== "FIXED" && (
            <p className="text-small text-muted">
              Alleen FIXED kan ooit direct checkout-eligible zijn. Dit product blijft offertegericht.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold font-display">Klanttype (commercieel)</h2>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-small">
              <input type="checkbox" name="audienceB2b" defaultChecked={product?.audienceB2b ?? true} />
              B2B
            </label>
            <label className="flex items-center gap-2 text-small">
              <input type="checkbox" name="audienceB2c" defaultChecked={product?.audienceB2c ?? false} />
              B2C
            </label>
          </div>
          <p className="text-small text-muted">
            Dit is alleen de doelgroep. Juridische publicatiegoedkeuring staat apart en wordt niet
            automatisch gezet.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold font-display">Productcontent</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Textarea name="benefits" label="Belangrijkste voordelen (één per regel)" rows={5} defaultValue={(product?.benefits ?? []).join("\n")} />
            <Textarea name="includedItems" label="Inbegrepen" rows={5} defaultValue={(product?.includedItems ?? []).join("\n")} />
            <Textarea name="excludedItems" label="Niet inbegrepen" rows={5} defaultValue={(product?.excludedItems ?? []).join("\n")} />
            <Textarea name="extensions" label="Uitbreidingen / add-on hints" rows={5} defaultValue={(product?.extensions ?? []).join("\n")} />
            <Textarea name="targetAudience" label="Doelgroep" rows={3} defaultValue={product?.targetAudience ?? ""} />
            <Textarea name="workflow" label="Werkwijze" rows={3} defaultValue={product?.workflow ?? ""} />
            <Input name="deliveryTime" label="Levertijd" defaultValue={product?.deliveryTime ?? ""} />
            <Textarea name="requiredInput" label="Vereisten van de klant (één per regel)" rows={3} defaultValue={(product?.requiredInput ?? []).join("\n")} />
            <Input name="ctaLabel" label="Call-to-action" defaultValue={product?.ctaLabel ?? ""} />
            <Input name="quoteCtaLabel" label="Offerte-call-to-action" defaultValue={product?.quoteCtaLabel ?? ""} />
            <Textarea name="warnings" label="Waarschuwingen / voorwaarden" rows={3} defaultValue={product?.warnings ?? ""} />
            <Input name="seoTitle" label="SEO-titel (standaard/EN)" defaultValue={product?.seoTitle ?? ""} />
            <Textarea name="seoDescription" label="Metaomschrijving (standaard/EN)" rows={3} defaultValue={product?.seoDescription ?? ""} />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold font-display">Meertaligheid</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="font-medium">Nederlands</h3>
              {!nl?.name && mode === "edit" && (
                <p className="text-small text-amber-800">Nederlandse vertaling ontbreekt of is incompleet.</p>
              )}
              <Input name="nl_name" label="Naam NL" defaultValue={nl?.name ?? ""} />
              <Textarea name="nl_shortDescription" label="Korte omschrijving NL" rows={2} defaultValue={nl?.shortDescription ?? ""} />
              <Textarea name="nl_fullDescription" label="Lange omschrijving NL" rows={4} defaultValue={nl?.fullDescription ?? ""} />
              <Textarea name="nl_benefits" label="Voordelen NL" rows={3} defaultValue={(nl?.benefits ?? []).join("\n")} />
              <Textarea name="nl_includedItems" label="Kenmerken NL" rows={3} defaultValue={(nl?.includedItems ?? []).join("\n")} />
              <Textarea name="nl_excludedItems" label="Niet inbegrepen NL" rows={2} defaultValue={(nl?.excludedItems ?? []).join("\n")} />
              <Input name="nl_ctaLabel" label="CTA NL" defaultValue={nl?.ctaLabel ?? ""} />
              <Input name="nl_quoteCtaLabel" label="Offerte-CTA NL" defaultValue={nl?.quoteCtaLabel ?? ""} />
              <Input name="nl_seoTitle" label="SEO-titel NL" defaultValue={nl?.seoTitle ?? ""} />
              <Textarea name="nl_seoDescription" label="Meta NL" rows={2} defaultValue={nl?.seoDescription ?? ""} />
            </div>
            <div className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="font-medium">Engels</h3>
              {!en?.name && mode === "edit" && (
                <p className="text-small text-amber-800">Engelse vertaling ontbreekt of is incompleet.</p>
              )}
              <Input name="en_name" label="Name EN" defaultValue={en?.name ?? product?.name ?? ""} />
              <Textarea name="en_shortDescription" label="Short description EN" rows={2} defaultValue={en?.shortDescription ?? product?.shortDescription ?? ""} />
              <Textarea name="en_fullDescription" label="Full description EN" rows={4} defaultValue={en?.fullDescription ?? product?.fullDescription ?? ""} />
              <Textarea name="en_benefits" label="Benefits EN" rows={3} defaultValue={(en?.benefits ?? product?.benefits ?? []).join("\n")} />
              <Textarea name="en_includedItems" label="Included EN" rows={3} defaultValue={(en?.includedItems ?? product?.includedItems ?? []).join("\n")} />
              <Textarea name="en_excludedItems" label="Excluded EN" rows={2} defaultValue={(en?.excludedItems ?? product?.excludedItems ?? []).join("\n")} />
              <Input name="en_ctaLabel" label="CTA EN" defaultValue={en?.ctaLabel ?? product?.ctaLabel ?? ""} />
              <Input name="en_quoteCtaLabel" label="Quote CTA EN" defaultValue={en?.quoteCtaLabel ?? product?.quoteCtaLabel ?? ""} />
              <Input name="en_seoTitle" label="SEO title EN" defaultValue={en?.seoTitle ?? product?.seoTitle ?? ""} />
              <Textarea name="en_seoDescription" label="Meta EN" rows={2} defaultValue={en?.seoDescription ?? product?.seoDescription ?? ""} />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 sticky bottom-0 bg-background/95 backdrop-blur py-4 border-t border-border">
          <Button type="submit" disabled={pending}>
            {mode === "create" ? "Concept opslaan" : "Wijzigingen opslaan"}
          </Button>
          <Link href="/admin/products" className="inline-flex items-center min-h-11 px-4 rounded-lg border border-border text-sm">
            Annuleren
          </Link>
        </div>
      </form>

      {mode === "edit" && product && (
        <>
          <section className="space-y-4 rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold font-display">Publicatieworkflow</h2>
            <ul className="space-y-2 text-small">
              {checklist.map((item) => (
                <li
                  key={`${item.code}-${item.message}`}
                  className={
                    item.severity === "error"
                      ? "text-rose-800"
                      : item.severity === "warning"
                        ? "text-amber-900"
                        : "text-muted"
                  }
                >
                  [{item.severity}] {item.message}
                </li>
              ))}
            </ul>
            <div className="rounded-lg bg-surface-elevated px-3 py-2 text-small">
              <p className="font-medium mb-1">Checkout eligibility (server-side)</p>
              <ul className="space-y-1 text-muted">
                {blockReasons.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
            {canPublish && !legacyRemoved && (
              <div className="flex flex-wrap gap-2">
                {(["DRAFT", "REVIEW", "PUBLISHED", "HIDDEN"] as const).map((status) => (
                  <form
                    key={status}
                    action={(fd) => {
                      fd.set(
                        "payload",
                        JSON.stringify({
                          id: product.id,
                          expectedVersion: product.version ?? 1,
                          targetStatus: status,
                        }),
                      );
                      publishAction(fd);
                    }}
                  >
                    <Button type="submit" variant="outline" size="sm" disabled={publishPending}>
                      Zet op {status}
                    </Button>
                  </form>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold font-display">Juridische goedkeuring</h2>
            {legacyRemoved ? (
              <p className="text-small text-muted">
                {LEGACY_TAWK_ADMIN_STATUS_LABEL}. Juridische goedkeuring is geblokkeerd.
              </p>
            ) : !canLegal ? (
              <p className="text-small text-muted">
                Alleen een rol met elevated permission mag juridische goedkeuring wijzigen.
              </p>
            ) : (
              <form
                className="grid gap-3 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const fd = new FormData(form);
                  const payload = {
                    id: product.id,
                    expectedVersion: product.version ?? 1,
                    legalStatus: String(fd.get("legalStatus")),
                    priceStatus: String(fd.get("priceStatus")),
                    publicationReady: fd.get("publicationReady") === "on",
                    legalTermsVersion: String(fd.get("legalTermsVersion") ?? "") || null,
                    legalInternalNote: String(fd.get("legalInternalNote") ?? "") || null,
                  };
                  const out = new FormData();
                  out.set("payload", JSON.stringify(payload));
                  legalAction(out);
                }}
              >
                <label className="space-y-1.5 text-small font-medium">
                  Legal status
                  <select
                    name="legalStatus"
                    defaultValue={product.legalStatus ?? "NOT_REVIEWED"}
                    className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
                  >
                    <option value="NOT_REVIEWED">NOT_REVIEWED</option>
                    <option value="INTERNAL_REVIEW">INTERNAL_REVIEW</option>
                    <option value="LEGAL_REVIEW_REQUIRED">LEGAL_REVIEW_REQUIRED</option>
                    <option value="APPROVED_FOR_B2B">APPROVED_FOR_B2B</option>
                    <option value="APPROVED_FOR_B2C">APPROVED_FOR_B2C</option>
                    <option value="APPROVED_FOR_BOTH">APPROVED_FOR_BOTH</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-small font-medium">
                  Prijsstatus
                  <select
                    name="priceStatus"
                    defaultValue={product.priceStatus ?? "DRAFT"}
                    className="w-full min-h-11 rounded-lg border border-border bg-surface px-3"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="INTERNAL_REVIEW">INTERNAL_REVIEW</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </label>
                <Input
                  name="legalTermsVersion"
                  label="Versie van voorwaarden"
                  defaultValue={product.legalTermsVersion ?? ""}
                />
                <label className="flex items-center gap-2 text-small mt-8">
                  <input
                    type="checkbox"
                    name="publicationReady"
                    defaultChecked={product.publicationReady ?? false}
                  />
                  Publicatieklaar (commercieel)
                </label>
                <div className="md:col-span-2">
                  <Textarea
                    name="legalInternalNote"
                    label="Interne notitie"
                    rows={3}
                    defaultValue={product.legalInternalNote ?? ""}
                  />
                </div>
                <p className="text-small text-muted md:col-span-2">
                  Goedgekeurd door: {product.legalApprovedBy ?? "—"} ·{" "}
                  {product.legalApprovedAt
                    ? new Date(product.legalApprovedAt).toLocaleString("nl-NL")
                    : "—"}
                </p>
                <Button type="submit" disabled={legalPending}>
                  Juridische status opslaan
                </Button>
              </form>
            )}
          </section>

          {canArchive && (
            <section className="flex flex-wrap gap-2">
              {product.status !== "ARCHIVED" && !legacyRemoved ? (
                <form
                  action={async (formData) => {
                    await archiveProductAction({}, formData);
                  }}
                >
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="expectedVersion" value={product.version ?? 1} />
                  <Button type="submit" variant="outline">
                    Archiveren
                  </Button>
                </form>
              ) : null}
              {product.status === "ARCHIVED" && !legacyRemoved ? (
                <form
                  action={async (formData) => {
                    await restoreProductAction({}, formData);
                  }}
                >
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="expectedVersion" value={product.version ?? 1} />
                  <Button type="submit" variant="outline">
                    Herstellen uit archief
                  </Button>
                </form>
              ) : null}
              <form
                action={async (formData) => {
                  await deleteProductAction({}, formData);
                }}
                onSubmit={(e) => {
                  if (
                    !window.confirm(
                      "Product definitief verwijderen? Dit kan alleen zonder gekoppelde orders.",
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={product.id} />
                <Button type="submit" variant="danger">
                  Veilig verwijderen
                </Button>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
}
