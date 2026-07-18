# Customer Portal Migration Evidence Template

Date: ____________________  
Operator: ____________________  

## Target confirmation

- [ ] Host is 127.0.0.1 or localhost  
- [ ] Local Supabase project_id: ____________________  
- [ ] Not linked / no production apply  
- [ ] CHECKOUT_ENABLED=false  
- [ ] P05_MIGRATION_APPLIED unset  

## Commands

```text
npx supabase status
npx supabase migration up
npm run db:verify-customer-portal
```

## Results

Verifier: PASS / FAIL  
Notes: ____________________  

## Confirmations

- [ ] No remote migration applied  
- [ ] No Mollie live payment  
- [ ] Geen externe livechatwidget toegevoegd  
