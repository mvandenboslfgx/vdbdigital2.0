# VDB Digital — Findings Register (2026-07-21)

**Audit:** Forensic end-to-end (audit-only)  
**Git HEAD:** `1544d445d1d05c700b59360bdd4015afb0727bb8`  
**Tag:** `production-database-apply-ready`  
**Verdict:** `VDB DIGITAL FORENSIC AUDIT FAIL`  
**Machine-readable:** `docs/audits/VDB_DIGITAL_FINDINGS_REGISTER-2026-07-21.json`

## Counts

| Severity | Count |
|----------|------:|
| P0 | 0 |
| P1 | 4 |
| P2 | 12 |
| P3 | 7 |

## P0 — CRITICAL

None proven in this audit while `CHECKOUT_ENABLED=false` and production apply unauthorized.

## P1 — HIGH (production blockers for enablement / staff trust)

### P1-001 — Staff `view_assigned` without assignment filter
- **Evidence:** PROVEN (code)
- **Paths:** `src/server/repositories/admin-quotes.ts`, `admin-invoices.ts`
- **Contrast:** `admin-projects.ts` filters `project_manager_id`
- **Fix:** Enforce assignment/org filters; add tests

### P1-002 — Admin documents not org-scoped
- **Evidence:** PROVEN
- **Path:** `src/server/repositories/admin-documents.ts`
- **Fix:** Org/project scoped queries

### P1-003 — Invoice DEFINER RPCs + `GRANT … TO authenticated`
- **Evidence:** PROVEN (migrations)
- **Paths:** `20260719160000_invoices_financial_documents.sql`, `20260719170000_invoice_payment_reversal_integrity.sql`
- **Check:** only `is_staff_admin()` — bypasses app permission matrix
- **Fix:** service-role-only execute after `requirePermission`, or fine-grained RPC authz

### P1-004 — Mollie webhook token fail-open when unset
- **Evidence:** PROVEN
- **Paths:** `src/lib/payments/webhook-url.ts`, `src/app/api/webhooks/mollie/route.ts`
- **Mitigation today:** checkout fail-closed; still unsafe to enable payments
- **Fix:** require token in production (fail-closed)

## P2 — MEDIUM

| ID | Title |
|----|-------|
| P2-001 | Docs cite pre-freeze HEAD `b01d518` / mixed freeze wording |
| P2-002 | Manifest hash `c4cc9d…` → `948073dd…`; stale gitignored evidence |
| P2-003 | FINAL plan backup `210514` vs proven `222511` |
| P2-004 | Vitest: 1 timeout fail `commercial-price.test.ts` (433/434) |
| P2-005 | Playwright e2e failed: port 3000 occupied |
| P2-006 | Some `db:verify-*` hit `.env` remote while saying local |
| P2-007 | Deployment provenance: `origin/main`=`b01d518`; freeze local +2 |
| P2-008 | Sitemap incomplete vs solutions pages |
| P2-009 | Only marketing `error.tsx` |
| P2-010 | Auth callback uses `request.url` origin |
| P2-011 | npm audit moderate postcss via next (do not `audit fix --force`) |
| P2-012 | a11y / Lighthouse / mobile matrix UNPROVEN this run |

## P3 — LOW

P3-001 no web manifest · P3-002 CSP `unsafe-inline` · P3-003 duplicate solution URL variants · P3-004 portal deliverables/opleveringen · P3-005 middleware deprecation warning · P3-006 robots missing `/portal/` disallow · P3-007 locale cookie without Secure

## Recommended fix order

1. P1-001 / P1-002 — staff scope filters  
2. P1-003 — invoice RPC grants/authz  
3. P1-004 — webhook token fail-closed  
4. P2-007 — prove deployment SHA vs intended HEAD  
5. P2-001–003 — documentation consistency  
6. P2-004 / P2-005 — stabilize tests / free e2e port  
7. Remaining P2/P3  

**Do not** start production DB apply, checkout, or Mollie live until P1s are resolved and separately authorized.
