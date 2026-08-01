# Decision note B — IDENTITY-GATE (READ-ONLY proposal)

**Status:** OPEN — geen optie geïmplementeerd in Fase 1.  
**Vaste v1-beslissing:** geen externe IDV-provider, geen camera/document/selfie/liveness.

## Context

Checklist vereist `identity_verification_status = 'VERIFIED'` → `IDENTITY_NOT_VERIFIED`.
Kolommen blijven bestaan. Fase 1 corrigeert alleen UI/docs: “administratieve partnercontrole”,
geen automatische ID-check. Activation semantiek ongewijzigd → gate blijft blokkeren zonder
fixture/attestation.

## Opties

### B1 — Herinterpreteren als handmatige Partnercontrole
- **Wat:** behoud kolom/gate; productie-staff-attestation zet VERIFIED na adminreview van
  account-/bedrijfs-/overeenkomstmetadata (geen ID-document).
- **Pro:** minimale schemawijziging; audit trail; sluit aan op bestaande enum.
- **Con:** naam `identity_*` blijft misleidend zonder docs/API-hernoeming; vereist nieuwe RPC
  (niet fixture).
- **Risico:** operators denken dat IDV is gedaan — mitigeren met reason codes + UI-copy.

### B2 — Vervangen door profile/admin approval
- **Wat:** identity-gate uit checklist; `staff_approved_at` + profile completeness + agreement
  volstaan voor “controle gedaan”.
- **Pro:** eenvoudiger v1-model; minder dubbele statussen.
- **Con:** contractwijziging; verliest apart slot voor latere risicogestuurde IDV.
- **Risico:** approval wordt overbelast als enige compliance-signaal.

### B3 — Voorlopig behouden maar activation blokkeren
- **Wat:** status quo na Fase 1 copy-fix: gate blijft, geen productieve writer, geen public
  activation zonder aparte beslissing.
- **Pro:** fail-closed; geen contractbreuk nu.
- **Con:** geen pad naar ACTIVE voor nieuwe Partners in prod zonder fixtures (verboden).
- **Risico:** productstilstand tot B1 of B2 is gekozen.

## Aanbeveling (niet geïmplementeerd)

~~Kortetermijn operationeel: **B3** …~~

**BESLOTEN 2026-08-01: B1 gekozen.**  
Fase 2 implementeert `staff_attest_partner_admin_review` (administratieve partnercontrole).
Zie `PHASE2_B1_PRECHECK.md` en migration `20260801120000_staff_attest_partner_admin_review_rc7.sql`.

Fase 1 implementeerde **geen** van deze opties in RPC/checklist.
Fase 2 implementeert **B1** alleen (identity-gate semantiek + staff attestation).
