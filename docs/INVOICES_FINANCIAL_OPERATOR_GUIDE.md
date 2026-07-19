# Invoices Financial Operator Guide

1. Create draft or convert accepted quote → draft
2. Edit lines → Markeer als gereed (READY)
3. Uitgeven → customer-visible OPEN + snapshot
4. Betaling registreren (partial/full) — never “Betaling verwerken”
5. Creditnota starten from issued invoice when needed

Customers see `/portal/facturen` only for issued/visible statuses. No pay button.

Local verify: `npm run db:verify-invoices-financial` → PASS.
