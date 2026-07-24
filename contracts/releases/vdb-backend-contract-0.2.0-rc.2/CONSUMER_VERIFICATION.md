# Consumer verification — 0.2.0-rc.2

1. Pin `VDB_BACKEND_CONTRACT=vdb-backend-contract@0.2.0-rc.2` and `VDB_SCHEMA_VERSION=2026.07.24.mobile-compat-rc2`.
2. Confirm partner tables/RPCs from rc.1 still exist (run `verify_partner_admin_contracts()`).
3. Run `select * from public.verify_mobile_compat_contracts();` — all `ok` true.
4. Confirm financial flags `mollie_checkout`, `digital_product_checkout`, `partner_payouts` are **false**.
5. Mobile: use `mobileClientTableMapping` / `mobileClientRpcMapping` — do not create parallel base tables.
6. Partners: keep using `partner_*` + partner RPCs; no breaking rename.
7. Do not enable Mollie or payouts without a separate owner decision.
