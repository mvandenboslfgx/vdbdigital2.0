# Project Management Operator Guide

1. Ensure Auth & Portal Foundation is applied and verified.
2. Apply project management migration **locally only**.
3. Run `npm run db:verify-project-management` → `RESULT: PASS`.
4. Create ACTIVE organization → create project (default internal).
5. Add milestones/actions; share deliverables when ready.
6. Set visibility to klantzichtbaar before expecting portal visibility.
7. Production apply is a **separate deployment gate** (not part of this round).

## Legacy customers

Checkout `customers` table is **not** used for project tenancy. See mapping notes in `PROJECT_MANAGEMENT_ARCHITECTURE.md` / audit: organizations remain SoT. Do not dual-link projects.
