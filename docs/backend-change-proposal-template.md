# Backend Change Proposal Template

**Canonical owner:** VDB Digital 2.0 (`CANONICAL_BACKEND_OWNER`)  
**Clients:** Mobile (`MOBILE_CLIENT`), Partner Portal (`PARTNER_CLIENT`)

Use this template in the **requesting** repository (or a ticket linked from it).  
Do **not** apply the change remotely from the client repo. The definitive migration lands in VDB Digital 2.0 after approval.

Copy into: `docs/proposals/BCP-YYYYMMDD-short-title.md` (client repo) or open an issue with the same sections.

---

## Proposal header

| Field | Value |
|-------|--------|
| **proposal-id** | `BCP-YYYYMMDD-###` |
| **requesting repository** | `MOBILE_CLIENT` / `PARTNER_CLIENT` |
| **author** | |
| **date** | |
| **current contractVersion** | `vdb-backend-contract@0.1.0` |
| **current schemaVersion** | `2026.07.22.freeze` |
| **desired contractVersion** | e.g. `vdb-backend-contract@0.2.0` |
| **desired schemaVersion** | e.g. `2026.MM.DD.<slug>` |
| **priority** | P0 / P1 / P2 / P3 |
| **blocks staging scenario #** | (if any) |

---

## 1. Business reason

What user/business problem does this solve? Why must it be shared backend (not client-only state)?

---

## 2. Schema change

- New/altered tables, columns, indexes, constraints, enums  
- Suggested SQL sketch (non-authoritative)  
- Data backfill needs  

---

## 3. RLS impact

- Policies added/changed  
- Roles affected (`customer`, `partner_pending`, `partner`, `staff`, `admin`, `owner`)  
- Tenant isolation rules  

---

## 4. Storage impact

- Buckets, object path conventions, MIME/size limits  
- Signed URL requirements  

---

## 5. Auth impact

- New roles/claims  
- Invite/onboarding flows  
- Session/JWT assumptions  

---

## 6. Financial impact

- Payments, commissions, payouts, refunds, adjustments, ledger  
- Confirm: **no client-side authority** to approve money movement  
- Single-source-of-truth implications  

---

## 7. Compatibility

- Breaking vs additive  
- Required client upgrades (Website / Mobile / Partner)  
- Feature-flag needs  

---

## 8. Migration risk

- Lock time, rewrites, irreversible enums  
- Production apply considerations  

---

## 9. Rollback strategy

- Forward-fix only? Restore from backup?  
- Explicit: `migration repair` is **not** schema rollback  

---

## 10. Tests

- Local contract tests in owner repo  
- Staging cross-repo scenarios impacted  
- Negative RLS tests  

---

## 11. Acceptance criteria

Checklist the backend owner must meet before bumping the published contract.

---

## 12. Approvals

| Role | Name | Date | Decision |
|------|------|------|----------|
| Requesting repo lead | | | |
| Backend owner (VDB Digital 2.0) | | | APPROVED / REJECTED / NEEDS CHANGES |

---

## Owner execution (VDB Digital 2.0 only)

After APPROVED:

1. Add migration under `supabase/migrations/`  
2. `npx supabase db reset` locally (`project_id=vdbdigital2`)  
3. Run relevant `db:verify-*` / unit tests  
4. Update `docs/backend-contract.md` versions  
5. Apply to **staging** when authorized  
6. Clients bump pin — no independent remote push from clients  
7. Production only with separate production authorization  

**Remote actions from client repos remain forbidden.**
