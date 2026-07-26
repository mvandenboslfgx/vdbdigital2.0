# VDB Digital — Legal Compliance Readiness Review

**Type:** Technical compliance readiness review (NOT lawyer approval)  
**Date:** 2026-07-24 (Europe/Amsterdam)  
**Repository:** `C:/Users/XXX/vdbdigital2.0`  
**Scope:** Public legal pages, i18n legal content, contact/quote flows, company identity config, request-only / checkout-off shop model  
**Mutations:** Local copy alignment only — no commit, push, deploy, or remote/staging/production changes

```
JURIDISCHE REVIEW AANBEVOLEN
```

> This document supports engineering and product readiness. It does not constitute legal advice. A qualified lawyer should review all consumer-facing terms, withdrawal rights, and B2C checkout flows before activation.

---

## 1. Executive summary

VDB Digital operates in a **request-only / checkout-off** mode (`CHECKOUT_ENABLED !== "true"`). Legal pages exist in **EN and NL** via `src/i18n/content/legal.ts`, with footer links and a `CompanyLegalBlock` fed from `siteConfig`. Quote forms require privacy + terms consent; contact forms do not.

**Safe copy fixes applied (2026-07-24):** aligned privacy, cookie, and terms text with the current checkout-off / quote-first model. **No checkout activation**, no new consumer-right waivers, no invented legal positions.

**Primary gaps before B2C online sales:** statutory **bedenktijd / herroepingsrecht** copy, **online cancellation button** (mandatory since 19 Jun 2026 for distance sales), digital-content withdrawal waiver process, and **KVK/VAT/address** publication when env vars are unset.

---

## 2. Operating model (evidence)

| Aspect | Evidence |
| --- | --- |
| Checkout | `src/config/features.ts` — `isDirectCheckoutEnabled()` true only when `CHECKOUT_ENABLED === "true"` |
| Checkout route | `src/app/(shop)/checkout/page.tsx` redirects to shop when flag off |
| Shop UX | Quote-only CTAs; `shop.emptyBody` states no direct purchase |
| Commercial gate | `src/config/commercial/pricing.ts` — B2C blocked until `APPROVED_FOR_B2C` / `APPROVED_FOR_BOTH` |
| Agreement path | Quote form + written confirmation; contact form for general enquiries |
| Legal marker | `src/i18n/content/legal.ts` line 4–6 — `JURIDISCHE REVIEW AANBEVOLEN` (internal, not rendered) |

---

## 3. Sources consulted

| Title | Organisation | URL | Access date |
| --- | --- | --- | --- |
| Bedenktijd bij verkoop | Ondernemersplein (RVO) | https://ondernemersplein.overheid.nl/wetten-en-regels/bedenktijd-bij-verkoop/ | 2026-07-24 |
| Online shops must have a cancellation button | Business.gov.nl (RVO) | https://business.gov.nl/amendments/online-shops-must-have-cancellation-button/ | 2026-07-24 |
| Recht op informatie | Autoriteit Persoonsgegevens | https://autoriteitpersoonsgegevens.nl/nl/zelf-doen/privacyrechten/recht-op-informatie | 2026-07-24 |
| One Stop Shop (OSS) | Belastingdienst | https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/btw_berekenen_aan_uw_klanten/btw_bij_dienstverlening/btw_bij_dienstverlening | 2026-07-24 |
| Consumer Rights Directive (2011/83/EU) as amended by Directive (EU) 2023/2673 | European Union | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011L0083 | 2026-07-24 |
| Mollie testing docs | Mollie | https://docs.mollie.com/overview/testing | 2026-07-24 |

---

## 4. Findings matrix

| ID | Onderwerp | Bron/eis | Huidige evidence | Risico | Fix | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LR-001 | Internal legal review marker | Internal policy | Comment `JURIDISCHE REVIEW AANBEVOLEN` in `src/i18n/content/legal.ts` | Low | None | **PASS — NO CHANGE** |
| LR-002 | Request-only / checkout-off model | Product policy; fail-closed feature flag | `CHECKOUT_ENABLED` default off; checkout page redirects; shop empty states route to quote | Low while checkout off | Terms/privacy copy aligned to quote-first model (2026-07-24) | **FIXED AND VERIFIED** |
| LR-003 | B2B/B2C scope clarity | Algemene voorwaarden best practice | Terms § “Scope” states B2B primary; mandatory consumer law prevails for B2C (EN+NL) | Medium if B2C sales start without lawyer review | None — adequate high-level disclaimer | **PASS — NO CHANGE** |
| LR-004 | Wettelijke bedenktijd (14 dagen) | Ondernemersplein bedenktijd; EU CRD Art. 9–16 | Not mentioned in terms or refund policy | **High** when B2C distance sales go live | Lawyer-drafted bedenktijd section + model withdrawal form link | **OPEN — LEGAL REVIEW REQUIRED** |
| LR-005 | Bedenktijd digitale inhoud / waiver | Ondernemersplein: 4-step consent before streaming/download | Refund policy: “cannot be returned after delivery” without CRD Art. 16 digital-content waiver process | **High** for B2C digital products | Do not broaden waiver in code; lawyer to draft compliant pre-purchase flow | **OPEN — LEGAL REVIEW REQUIRED** |
| LR-006 | Online cancellation button (19 Jun 2026) | Business.gov.nl; Directive (EU) 2023/2673 | No withdrawal/cancellation button in UI or account area | N/A while checkout off; **High** when B2C online contracts concluded | Implement two-step withdrawal function before enabling B2C checkout | **NOT APPLICABLE** (now) — reopen before B2C checkout |
| LR-007 | Subscriptions (monthly/yearly) | EU CRD; NL consumer rules | Terms + refund mention periodic billing/cancellation at period end; catalog has `MONTHLY`/`YEARLY` items | Medium — recurring B2C needs specific cancellation info | Lawyer review for subscription withdrawal, renewal notices, button scope | **OPEN — LEGAL REVIEW REQUIRED** |
| LR-008 | Privacy — informatieplicht (AVG Art. 13–14) | AP recht op informatie | Privacy pages EN+NL: controller, purposes, legal bases, rights, AP complaint | Medium — gaps remain | Lawyer to confirm completeness (EEA transfers, retention criteria, mandatory vs optional fields, processors list) | **OPEN — LEGAL REVIEW REQUIRED** |
| LR-009 | Cookie consent alignment | AVG + ePrivacy; AP cookie guidance | Banner: accept / reject / customize; footer “Cookie preferences”; policy lists categories | Low | Cookie policy no longer implies always-on cart when checkout off (2026-07-24) | **FIXED AND VERIFIED** |
| LR-010 | Company identity — KvK | Handelsregister / e-commerce transparency | `siteConfig.company.kvk` from `NEXT_PUBLIC_COMPANY_KVK`; omitted from footer/company block when empty | **High** for trust & legal identity if empty in production | Set env vars or publish registered details | **BLOCKED — BUSINESS INPUT REQUIRED** |
| LR-011 | Company identity — BTW/VAT | Belastingdienst | `NEXT_PUBLIC_COMPANY_VAT`; omitted when empty | **High** if trading B2C/B2B with VAT obligations | Provide verified VAT number | **BLOCKED — BUSINESS INPUT REQUIRED** |
| LR-012 | Company identity — address | Consumer information duties | `NEXT_PUBLIC_COMPANY_ADDRESS` / `_CITY`; footer shows country only when address missing | Medium | Provide registered business address | **BLOCKED — BUSINESS INPUT REQUIRED** |
| LR-013 | Phone / contact channels | ACM / customer service transparency | Default phone `06 286 00 727` in `siteConfig`; contact page shows email/phone | Low | None | **PASS — NO CHANGE** |
| LR-014 | NL/EN legal parity | Internal i18n policy | `legalEn` + `legalNl` mirror structure; footer legal links localized | Low | None | **PASS — NO CHANGE** |
| LR-015 | Quote flow — privacy/terms consent | AVG transparency at collection | `quote-form.tsx`: required checkboxes linking to `/privacy` and `/terms` | Low | None | **PASS — NO CHANGE** |
| LR-016 | Contact flow — privacy notice | AP informatieplicht at collection | `contact-form.tsx`: no privacy link or consent checkbox | Medium | Add privacy notice link or checkbox after legal review | **OPEN — LEGAL REVIEW REQUIRED** |
| LR-017 | OSS / cross-border B2C VAT | Belastingdienst OSS | No OSS or cross-border VAT disclosure in terms | Low while NL-only B2B/quote; Medium if EU B2C | Tax advisor + legal copy if selling digital services B2C in EU | **OPEN — LEGAL REVIEW REQUIRED** |
| LR-018 | Payment provider copy (Mollie) | Accurate representation | Terms reference Mollie when checkout enabled; checkout UI blocked; Mollie test docs not needed for live copy | Low | None while checkout off | **PASS — NO CHANGE** |
| LR-019 | Refund policy vs mandatory consumer rights | EU CRD; BW | Refund policy states no refund after delivery for digital products | **High** for B2C if applied without exceptions | Lawyer to reconcile with statutory rights; do not narrow in code without review | **OPEN — LEGAL REVIEW REQUIRED** |
| LR-020 | Legal last-updated date | Internal hygiene | `siteConfig.legal.lastUpdated` shown on all legal pages | Low | Updated to 2026-07-24 after copy fixes | **FIXED AND VERIFIED** |
| LR-021 | DPO disclosure | AVG Art. 37–38 | `siteConfig.legal.dpo` optional; block hidden when unset | Low for SME without DPO | Appoint DPO only if legally required | **PASS — NO CHANGE** |
| LR-022 | Functional cookie category | Cookie policy vs banner | Policy describes functional cookies; banner customize UI has no functional toggle (only analytics/marketing) | Low | Align UI with policy when functional cookies are introduced | **PASS — NO CHANGE** (no functional cookies loaded) |

---

## 5. Status summary

| Status | Count |
| --- | ---: |
| **FIXED AND VERIFIED** | 3 |
| **PASS — NO CHANGE** | 9 |
| **OPEN — LEGAL REVIEW REQUIRED** | 7 |
| **BLOCKED — BUSINESS INPUT REQUIRED** | 3 |
| **NOT APPLICABLE** | 1 |
| **Total findings** | **23** |

---

## 6. Pre-checkout activation checklist (for lawyers + business)

Before setting `CHECKOUT_ENABLED=true` for B2C:

1. Publish **KvK, VAT, and registered address** (LR-010–012).
2. Add lawyer-approved **bedenktijd / herroepingsrecht** sections and **model withdrawal form** (LR-004, LR-019).
3. Implement **online cancellation button** with two-step confirmation per Business.gov.nl / EU 2023/2673 (LR-006).
4. If selling **digital content** B2C: implement pre-purchase waiver flow per Ondernemersplein four steps (LR-005).
5. Review **subscription** cancellation and renewal copy (LR-007).
6. Confirm **privacy statement** completeness and contact-form notice (LR-008, LR-016).
7. Confirm **OSS/VAT** position if selling to EU consumers (LR-017).

---

## 7. Files changed in this review

| File | Change |
| --- | --- |
| `docs/VDB_DIGITAL_LEGAL_READINESS_REVIEW.md` | Created — this document |
| `src/i18n/content/legal.ts` | Privacy, cookies, terms EN+NL aligned to checkout-off / quote-first model |
| `src/config/site.ts` | `legal.lastUpdated` → `2026-07-24` |

---

## 8. Evidence snippets (reference)

**Checkout fail-closed:**

```11:13:src/config/features.ts
export function isDirectCheckoutEnabled(): boolean {
  return process.env.CHECKOUT_ENABLED === "true";
}
```

**B2B/B2C terms scope (EN):**

```120:124:src/i18n/content/legal.ts
      { type: "heading", text: "Scope of these terms" },
      {
        type: "paragraph",
        text: "These terms primarily cover business-to-business (B2B) services and digital products. Where mandatory consumer law applies to a consumer (B2C) purchase, those statutory rights prevail over conflicting clauses.",
      },
```

**Quote form consent:**

```427:451:src/components/forms/quote-form.tsx
            name="privacyConsent"
            ...
            <LocaleLink href={paths.privacy} ...>
              {t("legal.privacy")}
            ...
            name="termsConsent"
            ...
            <LocaleLink href={paths.terms} ...>
              {t("legal.terms")}
```

---

*End of review — JURIDISCHE REVIEW AANBEVOLEN*
