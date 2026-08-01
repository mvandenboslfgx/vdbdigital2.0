# Decision note A — AGE-GATE (READ-ONLY proposal)

**Status:** OPEN — geen optie geïmplementeerd in Fase 1.  
**Scope:** alleen vergelijking voor latere goedkeuring.  
**Constraint:** geen nieuwe 18+-eis, provider of juridische verplichting verzinnen.

## Context

`partner_activation_checklist` vereist vandaag `age_verification_status = 'VERIFIED'`
(niet verlopen) → code `AGE_NOT_VERIFIED`. Er bestaat geen productieve writer buiten
staging fixtures. L2 in `LEGAL_FISCAL_PROVIDER_DECISIONS.md` is OPEN.

## Opties

### A1 — Gate tijdelijk uitschakelen voor v1
- **Wat:** `AGE_NOT_VERIFIED` uit checklist halen (RPC/migration later).
- **Pro:** nieuwe Partners kunnen activeren zonder age-status; past bij “geen age-eis verzinnen”.
- **Con:** wijzigt activationcontract; vereist aparte contractrelease; grandfathering/tests.
- **Risico:** later opnieuw inschakelen is breaking voor partners die zonder age-slot ACTIVE werden.

### A2 — Handmatige 18+-attestation
- **Wat:** staff markeert age VERIFIED na administratieve bevestiging (geen camera/IDV).
- **Pro:** behoudt fail-closed slot; auditbaar.
- **Con:** introduceert alsnog een 18+-producteis tenzij juridisch goedgekeurd; vereist attestation-RPC.
- **Risico:** UI/docs moeten niet suggereren dat een ID-document is gecontroleerd.

### A3 — Leeftijd helemaal niet als producteis
- **Wat:** age-velden behouden voor compat, nooit als gate of UI-eis gebruiken.
- **Pro:** minste juridische aanname; velden blijven voor toekomst.
- **Con:** checklist moet alsnog A1-achtige de-scope; anders blijft activatie geblokkeerd.
- **Risico:** lage, mits documentatie expliciet “geen age-gate in v1” zegt.

## Aanbeveling (niet geïmplementeerd)

**A3 + checklist de-scope (A1-mechanisme)** als product kiest dat leeftijd geen v1-eis is;  
**of A2** alleen na expliciete juridische/productgoedkeuring van 18+.

Fase 1 wijzigt activation/checklist **niet**.
