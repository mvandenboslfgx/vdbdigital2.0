import type { TranslateFn } from "@/i18n/create-t";

/**
 * Copy for the administrative payment reversal control. Resolved on the server
 * and passed in as a `labels` prop, same as the other admin editors. The
 * disclaimer and the confirm-dialog wording are compliance copy: reversal only
 * touches the administrative record and never calls a payment provider.
 */
export interface PaymentReversalLabels {
  open: string;
  disclaimer: string;
  confirmTitle: string;
  /** `{number}`, `{amount}`, `{currency}` and `{date}` substituted client-side. */
  confirmInvoice: string;
  confirmAmount: string;
  confirmDate: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  busy: string;
  confirmSubmit: string;
  cancel: string;
}

export function buildPaymentReversalLabels(t: TranslateFn): PaymentReversalLabels {
  return {
    open: t("admin.paymentReversal.open"),
    disclaimer: t("admin.paymentReversal.disclaimer"),
    confirmTitle: t("admin.paymentReversal.confirmTitle"),
    confirmInvoice: t("admin.paymentReversal.confirmInvoice"),
    confirmAmount: t("admin.paymentReversal.confirmAmount"),
    confirmDate: t("admin.paymentReversal.confirmDate"),
    reasonLabel: t("admin.paymentReversal.reasonLabel"),
    reasonPlaceholder: t("admin.paymentReversal.reasonPlaceholder"),
    busy: t("admin.paymentReversal.busy"),
    confirmSubmit: t("admin.paymentReversal.confirmSubmit"),
    cancel: t("admin.common.cancel"),
  };
}
