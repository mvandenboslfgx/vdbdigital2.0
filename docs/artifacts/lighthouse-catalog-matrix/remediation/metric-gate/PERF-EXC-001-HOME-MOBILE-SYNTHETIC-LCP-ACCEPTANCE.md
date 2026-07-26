# PERF-EXC-001 — HOME/MOBILE SYNTHETIC LCP ACCEPTANCE

**Date:** 2026-07-26  
**Owner authorization:** OWNER DECISION PERF-EXC-001 — FORMAL SYNTHETIC HOME/MOBILE LCP EXCEPTION  
**Nature:** Documentation and governance only — not a technical performance PASS.

---

## 1. Owner decision

Further technical optimization rounds for this deviation **stop**.

Accepted exception (strictly bounded):

```text
PERF-EXC-001 — HOME/MOBILE LIGHTHOUSE SIMULATED LCP
```

This exception is **not**:

- a technical PASS of `PERF-GATE-001`;
- a budget, baseline, validator, runner, throttling, or audit-profile change;
- an authorization to claim catalog UX & performance PASS;
- an authorization to activate checkout, payments, or public price verification.

---

## 2. Exact scope

| Dimension | Bound |
| --- | --- |
| Route | `/` (home) only |
| Profile | `mobile` only |
| Metric | Lighthouse **simulated** LCP only |
| Method | Current frozen local measurement methodology |
| End state | End state fixed on **26 July 2026** |

Out of scope: desktop, other routes, observed LCP, CLS, TBT, TTFB, accessibility, SEO, best practices, script transfer, catalog/pricing/checkout.

---

## 3. Measured values (PERF-GATE-001C qualify, rebuild attempt)

Formal / internal bars (unchanged):

| Bar | Value |
| --- | ---: |
| Formal simulated-LCP median | ≤3500 ms |
| Internal qualify median | ≤3300 ms |
| Per-run max | ≤3800 ms |

Last measured (five independent home/mobile qualify runs on the structural rebuild candidate):

| Measure | Value |
| --- | ---: |
| Simulated-LCP median | **3860 ms** |
| Simulated-LCP maximum | **3965 ms** |
| Observed LCP (every run) | **≤741 ms** |
| Style/layout median | **469.1 ms** (below baseline **531.7 ms**) |
| TTFB maximum | **49 ms** |
| CLS / TBT / A11y / Best Practices / SEO / other relevant checks | **green** |

DOM during rebuild attempt (then reverted):

| Metric | Before | After attempt |
| --- | ---: | ---: |
| CasePreview nodes | 85 | 74 |
| Home nodes | 537 | 526 |

**Finding:** simulated LCP **worsened** despite structural DOM reduction. The CasePreview rebuild was therefore **fully reverted**. Native lazy `<img>` remains. No new 36-run matrix was executed. Earlier matrix results and evidence sets remain unmodified.

Primary evidence:

```text
docs/artifacts/lighthouse-catalog-matrix/remediation/metric-gate/home-case-preview-rebuild/CASEPREVIEW-STRUCTURAL-REBUILD-EVIDENCE.md
```

---

## 4. References — PERF-GATE-001B / PERF-GATE-001C

| Gate | Role | Outcome |
| --- | --- | --- |
| PERF-GATE-001 | Formal metric gate; sole remaining formal blocker was home/mobile simulated LCP | Technical FAIL retained |
| PERF-GATE-001B | Style/layout attribution; CasePreview causal; containment-only qualify failed (median ~3380 ms) and fully reverted | Incomplete / reverted |
| PERF-GATE-001C | Structural CasePreview rebuild; qualify failed (median 3860 / max 3965); rebuild fully reverted | Incomplete / reverted |

Related evidence (historical, not overwritten):

- `.../home-style-layout-remediation/HOME-STYLE-LAYOUT-REMEDIATION-EVIDENCE.md` (001B)
- `.../home-case-preview-rebuild/CASEPREVIEW-STRUCTURAL-REBUILD-EVIDENCE.md` (001C)
- `.../PERF-GATE-001-VALIDATION-EVIDENCE.md` (formal gate provenance)

Historical reports that still correctly state:

```text
CATALOG PRICE & UX CLOSURE INCOMPLETE — REMEDIATION REQUIRED
```

remain valid historical outcomes and must **not** be rewritten.

---

## 5. Why micro-optimization stops

1. Observed lab LCP remains excellent (≤741 ms).
2. Style/layout, TTFB, CLS, TBT, accessibility, SEO, and other relevant gates are green.
3. A real DOM reduction made **simulated** LCP worse — causal hotspot work did not transfer to the synthetic bar.
4. The original page/section state is fully restored after failed attempts.
5. Further local Lighthouse micro-optimization is disproportionate to the remaining synthetic gap and risks churn without a retainable PASS.

Owner choice: **accept this synthetic exception**; **do not redesign the homepage now**.

---

## 6. Technical gate status

```text
PERF-GATE-001 TECHNICAL PASS NOT CLAIMED
```

The performance gate remains **technically red** for home/mobile simulated LCP against the frozen formal bar. This document records an **owner exception**, not a green gate.

Budgets, baseline, gate runner, gate CLI, and matrix runner hashes remain frozen and unchanged (verified 2026-07-26):

| Artifact | SHA-256 |
| --- | --- |
| Budgets | `5e68e2f32341f2d0c92d66c76e991136eb2667f0b4df664eacf6d5f821196bbe` |
| Baseline | `3b027d46dc83f4097249c526f2819ab5c6cb822c8218d1ce63887ab8feb6da9d` |
| Gate runner | `ac2996427f10ecce5823c450a5472d3754ae0ffa0aca15ec6bd5e853d85111c7` |
| Gate CLI | `b6cc2d12b38a4a0e63e36fadd8ca2c3d00f30169fc3ff9f5fd7e54ce5ebeea47` |
| Matrix runner | `16782bf1f697f60dd883785265004ad130d86a5d75a440e3d2f57a028559d7fe` |

Measurement methodology was **not** altered for this acceptance.

---

## 7. Observed LCP

Observed LCP is **green**: every qualify run ≤741 ms (well under the 2000 ms observed ceiling used in qualification). The exception applies only to **Lighthouse simulated** LCP under the frozen local methodology.

---

## 8. Rebuild revert confirmation

The PERF-GATE-001C CasePreview structural rebuild is **fully reverted**. Application end state retains the pre-rebuild CasePreview markup with native lazy `<img>` from the earlier home-LCP pass. No second refactor, no matrix, no retainable candidate build.

---

## 9. Catalog truth & checkout

```text
CATALOG DATA & REQUEST UX VERIFIED — 468 SOURCE — 72 REQUEST-ONLY — 396 BLOCKED — 0 PUBLIC PRICE VERIFIED
```

| Fact | Meaning |
| --- | --- |
| 72 REQUEST-ONLY | Public products work via request / enquiry only |
| 0 PUBLIC_PRICE_VERIFIED | Consciously **not** presented as verified public pricing |
| 396 BLOCKED | Remain not publicly sellable |
| Checkout | Fail-closed; gate exit **2**; not activated |
| This exception | Does **not** enable checkout, payments, or public prices |

---

## 10. Allowed and forbidden status claims

### Allowed (owner-limited)

```text
PERF-EXC-001 DOCUMENTED — HOME/MOBILE SYNTHETIC LCP EXCEPTION ACCEPTED — TECHNICAL PASS NOT CLAIMED
CATALOG UX ACCEPTED WITH PERF-EXC-001 — 72 REQUEST-ONLY — PUBLIC PRICE VERIFICATION NOT CLAIMED
CATALOG DATA & REQUEST UX VERIFIED — 468 SOURCE — 72 REQUEST-ONLY — 396 BLOCKED — 0 PUBLIC PRICE VERIFIED
PERF-GATE-001 TECHNICAL PASS NOT CLAIMED
```

### Forbidden

```text
CATALOG UX & PERFORMANCE PASS — 72 REQUEST-ONLY — PUBLIC PRICE VERIFICATION NOT CLAIMED
CATALOG PRICE & UX CLOSURE PASS
PERF-GATE-001 PASS
```

---

## 11. Reopening criteria

Reopen `PERF-EXC-001` only when **at least one** of the following occurs:

1. Reliable production field measurement shows mobile p75 LCP above **2.5 s**;
2. Observed lab LCP exceeds **2.0 s** in three independent clean runs;
3. A visible CLS, interaction, or accessibility regression appears;
4. Homepage or CasePreview is substantively changed in content or structure;
5. Script transfer, DOM size, or style/layout demonstrably increases;
6. Lighthouse/Chrome methodology changes substantially and a new formally authorized baseline is run.

After production go-live, schedule a review once sufficient real mobile field data exists. This task does **not** implement new tracking and does **not** change consent behavior.

---

## 12. Governance confirmation (this task)

| Check | Result |
| --- | --- |
| Branch | `phase/shared-partner-backend` |
| HEAD | `a593e5d395fc7b90994c5cb2e8554cd241c48706` |
| Dirty worktree | Preserved; no reset/stash/bulk-restore |
| Application code | Unchanged by this task |
| Budgets / harness | Unchanged |
| New Lighthouse / matrix | Not run |
| Build / full test suite | Not run for this documentation task |
| Commit / push / PR / tag / deploy / remote | **None** |
| Staging / production apply | **None** |
| Checkout / price / catalog / backend / auth / Mobile / Partner | **None** |
| Port 3010 / prior audit ports | Free; no local audit server running |
| Own change from this task | This acceptance document only |

---

## 13. End status

```text
PERF-EXC-001 DOCUMENTED — HOME/MOBILE SYNTHETIC LCP EXCEPTION ACCEPTED — TECHNICAL PASS NOT CLAIMED
CATALOG UX ACCEPTED WITH PERF-EXC-001 — 72 REQUEST-ONLY — PUBLIC PRICE VERIFICATION NOT CLAIMED
CATALOG DATA & REQUEST UX VERIFIED — 468 SOURCE — 72 REQUEST-ONLY — 396 BLOCKED — 0 PUBLIC PRICE VERIFIED
```
