# Auth & Portal — Roles and Permissions

## Staff (`AdminRole`)

| Role | Scope |
|------|--------|
| OWNER | Full internal rights incl. roles.manage, legal_approve, settings.manage (AAL2) |
| ADMIN | Operational management; cannot grant OWNER; no legal approval |
| CONTENT | Catalog/content; no customers/orgs by default |
| SUPPORT | Customer/support visibility within permissions |

Permissions live in `src/lib/auth/permissions.ts` (deny-by-default). Sensitive permissions require AAL2.

## Customer (`customer_org_role`)

| Role | portal.access | profile.edit | quotes.respond | support | billing.view |
|------|---------------|--------------|----------------|---------|--------------|
| VIEW_ONLY | ✓ | ✓ | | | ✓ |
| BILLING | ✓ | ✓ | ✓ | | ✓ |
| MEMBER | ✓ | ✓ | ✓ | ✓ | |
| PRIMARY | ✓ | ✓ | ✓ | ✓ | ✓ |

Enforced in `src/lib/auth/customer-permissions.ts` + portal server actions.

## CUSTOMER is not an AdminRole

Portal access is membership-based, not via `admin_roles`.
