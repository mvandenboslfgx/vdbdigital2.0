# Decision note C — PAYOUT / BANK (READ-ONLY proposal)

**Status:** OPEN — niets geïmplementeerd; live payouts blijven **uit**.  
**Constraint:** geen bankverificatieprovider, Mollie-payout of IBAN-schema in Fase 1.

## Context

`payout_profile_status = 'APPROVED'` is vereist voor activatie én drijft `payout_eligible`.
Er zijn geen IBAN/bankkolommen op `partner_profiles` in het huidige Owner-contract.
Criteria voor APPROVED (L5) zijn OPEN.

## Minimale gegevens later (voorstel — niet bouwen)

| Gegeven | Doel | Opmerking |
|---------|------|-----------|
| IBAN | Uitbetalingsrekening | Opslag versleuteld/gemaskeerd; nooit in logs |
| Rekeninghouder | Matching met partner/bedrijfsnaam | OPEN of matching verplicht is |
| `payout_profile_status` | NOT_STARTED → PENDING_REVIEW → APPROVED / REJECTED | Bestaand enum hergebruiken |
| Adminreview | Staff + AAL2 zet status + reason code | Geen vrije PII-tekst |
| `payout_eligible` | Alleen true bij APPROVED (+ bestaande activationregels) | Feature flag `partner_payouts` blijft false tot aparte gate |

## Wat Fase 1 niet doet

- Geen IBAN-velden, UI, of migrations
- Geen payout enablement
- Geen Mollie
- Geen wijziging aan `payout_eligible` of checklist

## Aanbeveling (niet geïmplementeerd)

Later: minimale metadata + adminreview op bestaand `payout_profile_status`; payout
execution achter aparte releasegate. Eligibility hard-deny tot beide groen zijn.
