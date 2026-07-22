# Staging CI Gates (Design)

**Status:** PLAN — not implemented in this phase

---

## Canonical backend (VDB Digital 2.0)

| Gate | Required |
|------|----------|
| Migration lint / ordering | yes |
| Clean local `db reset` | yes |
| Contract / RPC verifiers | yes |
| RLS / Storage smoke | yes |
| Financial integrity (existing) | yes |
| Contract artefact generate + checksum | yes |
| Staging migration dry-run | yes (when staging exists) |
| Staging apply | **manual approval only** |

## Mobile

| Gate | Required |
|------|----------|
| Typecheck / unit | yes |
| Contract drift vs pin | yes — fail-closed on staging builds |
| No-secret bundle scan | yes |
| Staging smoke | after connect |
| Device 20/20 | **after** scenarios 1–10 green |

## Partner

| Gate | Required |
|------|----------|
| Typecheck / integration | yes |
| No client financial authority | yes |
| Contract drift | yes |
| Staging smoke | after connect |

No deployment workflows are created in this preflight.
