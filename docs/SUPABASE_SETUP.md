# Supabase Setup

## Route A — Supabase Cloud (aanbevolen)

### 1. Project aanmaken

1. Ga naar [supabase.com](https://supabase.com) → **New project**
2. Noteer **Project URL** en **API keys** (Settings → API)

### 2. Environment (PowerShell)

```powershell
Set-Location c:\Users\XXX\vdbdigital2.0
Copy-Item .env.example .env.local
# Bewerk .env.local en vul in:
# NEXT_PUBLIC_SUPABASE_URL=
# SUPABASE_SECRET_KEY=
# SUPABASE_SERVICE_ROLE_KEY=       # legacy/deprecated
```

### 3. Migrations uitvoeren

**Optie A — SQL Editor (Dashboard):**

1. Supabase Dashboard → **SQL Editor**
2. Voer uit: `supabase/migrations/20260714000000_initial_schema.sql`
3. Daarna: `supabase/migrations/20260714100000_phase2_rls_webhooks.sql`
4. Daarna: `supabase/migrations/20260714230000_phase3_product_rls_concept.sql`

**Optie B — Supabase CLI (indien geïnstalleerd):**

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase migration list
```

### 4. Seed & verify

```powershell
npm run env:validate   # Alleen configured/missing/invalid — geen waarden
npm run db:seed
npm run db:verify
npm run db:test-rls    # Live RLS-tests (anon client)
```

### 5. Owner bootstrap

Zie [ADMIN_BOOTSTRAP.md](./ADMIN_BOOTSTRAP.md)

---

## Route B — Supabase Local Development

Vereist: Docker Desktop + Supabase CLI

```powershell
npx supabase init
npx supabase start
npx supabase db reset
npm run db:seed
```

Studio: http://localhost:54323

Reset:

```powershell
npx supabase db reset
```

---

## RLS

Zie [RLS_MATRIX.md](./RLS_MATRIX.md). Server-side mutaties via service role; publishable/anon key nooit voor writes.

## Auth-sessies (SSR)

Sessies worden ververst via `src/lib/database/middleware.ts` en `src/middleware.ts` (Supabase SSR-patroon). Client helpers staan in `src/lib/database/client.ts` (browser) en `src/lib/database/server.ts` (Server Components / actions).

## MFA

Verplicht voor OWNER/ADMIN vóór productie — configureer in Supabase Dashboard → Authentication → MFA.
