# Staging Readiness Checklist

**Do not create the staging project until this checklist is reviewed and gaps accepted or closed.**

## Pre-create (this preflight)

- [x] Three freeze HEADs recorded  
- [x] Port matrix isolated (543/544/545)  
- [x] Contract `0.1.0` / schemaVersion `2026.07.22.freeze`  
- [x] Clean local migration chain PASS (27 / 6 buckets)  
- [x] Security + env + account + scenario plans written  
- [x] Backend gap register written  
- [ ] Owner review of **partner gaps** (blocking scenarios 4–6, 8–9)  
- [ ] Explicit written authorization for project creation  

## Post-create (future)

- [ ] Project name contains Staging; ref ≠ production  
- [ ] Secrets separated; Mobile has no service-role  
- [ ] Migrations applied; verifiers PASS  
- [ ] Auth URLs staging-only  
- [ ] Accounts + fixtures loaded  
- [ ] All three clients connected  
- [ ] Scenarios 1–3, 7, 10 PASS (customer path)  
- [ ] Scenarios 4–6, 8–9 PASS **after** partner migrations  
- [ ] Negative RLS PASS  
- [ ] Evidence frozen; secret-scan 0  
- [ ] Staging readiness verdict issued  

## Explicit non-authorization

This checklist does **not** authorize production apply, checkout enablement, Mollie live, or Git push.
