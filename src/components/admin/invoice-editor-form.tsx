"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createInvoiceAction,
  updateInvoiceAction,
  type InvoiceActionState,
} from "@/server/actions/invoice-actions";
import { invoiceHeaderTotals, lineTotals } from "@/lib/commerce/invoice-money";

type ItemDraft = {
  title: string;
  description: string;
  itemType: "SERVICE" | "PRODUCT" | "ADDON" | "DISCOUNT" | "CUSTOM" | "CREDIT";
  quantity: number;
  unitLabel: string;
  unitPriceCents: number;
  discountCents: number;
  taxRateBasisPoints: number;
  sortOrder: number;
};

const emptyItem = (): ItemDraft => ({
  title: "",
  description: "",
  itemType: "SERVICE",
  quantity: 1,
  unitLabel: "stuk",
  unitPriceCents: 0,
  discountCents: 0,
  taxRateBasisPoints: 2100,
  sortOrder: 0,
});

function eurosToCents(value: string): number {
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function InvoiceEditorForm({
  mode,
  organizations,
  invoice,
  initialItems,
}: {
  mode: "create" | "edit";
  organizations: { id: string; label: string }[];
  invoice?: {
    id: string;
    version: number;
    organization_id: string;
    project_id: string | null;
    quote_id: string | null;
    invoice_type: string;
    title: string | null;
    description: string | null;
    issue_date: string | null;
    due_date: string | null;
    discount_cents: number;
    payment_instruction: string | null;
    external_accounting_reference: string | null;
  };
  initialItems?: ItemDraft[];
}) {
  const action = mode === "create" ? createInvoiceAction : updateInvoiceAction;
  const [state, formAction, pending] = useActionState<InvoiceActionState, FormData>(
    action,
    {},
  );
  const [items, setItems] = useState<ItemDraft[]>(
    initialItems?.length ? initialItems : [emptyItem()],
  );
  const [headerDiscountEuros, setHeaderDiscountEuros] = useState(
    centsToEuros(invoice?.discount_cents ?? 0),
  );

  const liveTotals = useMemo(() => {
    return invoiceHeaderTotals(
      items.map((i) => ({
        quantity: Math.abs(i.quantity),
        unitPriceCents: i.unitPriceCents,
        discountCents: i.discountCents,
        taxRateBasisPoints: i.taxRateBasisPoints,
      })),
      eurosToCents(headerDiscountEuros),
    );
  }, [items, headerDiscountEuros]);

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && invoice ? (
        <>
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <input type="hidden" name="expectedVersion" value={invoice.version} />
        </>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {mode === "create" ? (
          <div>
            <label className="block text-small font-medium mb-1" htmlFor="organizationId">
              Organisatie
            </label>
            <select
              id="organizationId"
              name="organizationId"
              required
              className="w-full min-h-11 rounded-lg border border-border px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Kies organisatie
              </option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="organizationId" value={invoice?.organization_id} />
        )}
        <div>
          <label className="block text-small font-medium mb-1" htmlFor="invoiceType">
            Type
          </label>
          <select
            id="invoiceType"
            name="invoiceType"
            className="w-full min-h-11 rounded-lg border border-border px-3 text-sm"
            defaultValue={invoice?.invoice_type ?? "INVOICE"}
          >
            <option value="INVOICE">Factuur</option>
            <option value="CREDIT_NOTE">Creditnota</option>
            <option value="PROFORMA">Proforma</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-small font-medium mb-1" htmlFor="title">
            Titel
          </label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={invoice?.title ?? ""}
            maxLength={200}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-small font-medium mb-1" htmlFor="description">
            Omschrijving
          </label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={invoice?.description ?? ""}
            maxLength={5000}
          />
        </div>
        <div>
          <label className="block text-small font-medium mb-1" htmlFor="issueDate">
            Uitgiftedatum
          </label>
          <Input
            id="issueDate"
            name="issueDate"
            type="date"
            defaultValue={invoice?.issue_date?.slice(0, 10) ?? ""}
          />
        </div>
        <div>
          <label className="block text-small font-medium mb-1" htmlFor="dueDate">
            Vervaldatum
          </label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={invoice?.due_date?.slice(0, 10) ?? ""}
          />
        </div>
        <div>
          <label className="block text-small font-medium mb-1" htmlFor="projectId">
            Project-ID (optioneel)
          </label>
          <Input
            id="projectId"
            name="projectId"
            defaultValue={invoice?.project_id ?? ""}
            placeholder="UUID"
          />
        </div>
        <div>
          <label className="block text-small font-medium mb-1" htmlFor="quoteId">
            Offerte-ID (optioneel)
          </label>
          <Input
            id="quoteId"
            name="quoteId"
            defaultValue={invoice?.quote_id ?? ""}
            placeholder="UUID"
          />
        </div>
        <div className="md:col-span-2">
          <label
            className="block text-small font-medium mb-1"
            htmlFor="paymentInstruction"
          >
            Betaalinstructie (zichtbaar voor klant na uitgifte)
          </label>
          <Textarea
            id="paymentInstruction"
            name="paymentInstruction"
            rows={2}
            defaultValue={invoice?.payment_instruction ?? ""}
            maxLength={2000}
            placeholder="IBAN / referentie — geen online betaling"
          />
        </div>
        <div>
          <label
            className="block text-small font-medium mb-1"
            htmlFor="externalAccountingReference"
          >
            Externe boekhoudreferentie
          </label>
          <Input
            id="externalAccountingReference"
            name="externalAccountingReference"
            defaultValue={invoice?.external_accounting_reference ?? ""}
            maxLength={120}
          />
        </div>
        <div>
          <label className="block text-small font-medium mb-1" htmlFor="discountEuros">
            Kopkorting (EUR)
          </label>
          <Input
            id="discountEuros"
            value={headerDiscountEuros}
            onChange={(e) => setHeaderDiscountEuros(e.target.value)}
          />
          <input
            type="hidden"
            name="discountCents"
            value={eurosToCents(headerDiscountEuros)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3">Regels</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
          >
            Regel toevoegen
          </Button>
        </div>
        {items.map((item, index) => {
          const t = lineTotals({
            quantity: Math.abs(item.quantity),
            unitPriceCents: item.unitPriceCents,
            discountCents: item.discountCents,
            taxRateBasisPoints: item.taxRateBasisPoints,
          });
          return (
            <div
              key={index}
              className="rounded-xl border border-border p-4 grid gap-3 md:grid-cols-6"
            >
              <Input
                className="md:col-span-2"
                placeholder="Titel"
                value={item.title}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((row, i) =>
                      i === index ? { ...row, title: e.target.value } : row,
                    ),
                  )
                }
              />
              <Input
                placeholder="Aantal"
                type="number"
                step="0.001"
                value={item.quantity}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((row, i) =>
                      i === index
                        ? { ...row, quantity: Number(e.target.value) || 0 }
                        : row,
                    ),
                  )
                }
              />
              <Input
                placeholder="Prijs EUR"
                value={centsToEuros(item.unitPriceCents)}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((row, i) =>
                      i === index
                        ? { ...row, unitPriceCents: eurosToCents(e.target.value) }
                        : row,
                    ),
                  )
                }
              />
              <Input
                placeholder="BTW bp"
                type="number"
                value={item.taxRateBasisPoints}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((row, i) =>
                      i === index
                        ? {
                            ...row,
                            taxRateBasisPoints: Number(e.target.value) || 0,
                          }
                        : row,
                    ),
                  )
                }
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-small text-muted">
                  {centsToEuros(t.totalCents)} EUR
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setItems((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  Verwijder
                </Button>
              </div>
            </div>
          );
        })}
        <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />
      </div>

      <div className="rounded-xl border border-border p-4 text-small space-y-1">
        <p>Subtotaal (indicatief): {centsToEuros(liveTotals.subtotalCents)} EUR</p>
        <p>BTW (indicatief): {centsToEuros(liveTotals.taxCents)} EUR</p>
        <p className="font-medium">
          Totaal (indicatief): {centsToEuros(liveTotals.totalCents)} EUR
        </p>
        <p className="text-muted">
          Server herberekent bedragen. Geen Mollie / online betaling.
        </p>
      </div>

      {state.error ? (
        <p className="text-small text-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-small text-success" role="status">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan…" : mode === "create" ? "Concept maken" : "Opslaan"}
      </Button>
    </form>
  );
}
