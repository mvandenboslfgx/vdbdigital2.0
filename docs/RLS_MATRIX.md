# RLS Matrix

Gebaseerd op migrations `20260714000000_initial_schema.sql`, `20260714100000_phase2_rls_webhooks.sql` en `20260714230000_phase3_product_rls_concept.sql`.

Legenda: ✅ = toegestaan via policy | ❌ = geblokkeerd (deny default) | 🔧 = uitsluitend service role (server)

| Tabel | Publiek lezen | Eigen data lezen | Support | Content | Admin | Owner |
| ----- | ------------: | ---------------: | ------: | ------: | ----: | ----: |
| products | ✅ published, niet-concept | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| categories | ✅ | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| case_studies | ✅ published | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| profiles | ❌ | ✅ own (auth.uid) | 🔧 | 🔧 | 🔧 | 🔧 |
| admin_roles | ❌ | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| orders | ❌ | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| order_items | ❌ | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| payments | ❌ | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| leads | ❌ | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| quote_requests | ❌ | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| contact_submissions | ❌ | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| audit_logs | ❌ | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| webhook_events | ❌ | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| site_settings | ❌ | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| carts / cart_items | ❌ | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |
| customers | ❌ | ❌ | 🔧 | 🔧 | 🔧 | 🔧 |

## Notities

- **Admin/Support/Content/Owner kolommen:** mutaties via server-side service role na RBAC-check in `src/lib/auth/admin.ts`.
- **Geen client-side rol-escalatie:** `admin_roles` heeft geen INSERT policy voor anon/authenticated.
- **Conceptproducten:** `is_concept = true` wordt nooit via anon/publishable client getoond (Phase 3 policy).
