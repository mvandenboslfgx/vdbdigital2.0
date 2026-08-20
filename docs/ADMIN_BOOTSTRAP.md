# Admin Bootstrap

## Vereisten

- Supabase project met migrations uitgevoerd
- `.env.local` met `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `SUPABASE_SECRET_KEY`
- Gebruiker handmatig aangemaakt in Supabase Auth (geen self-registration als admin)

## MFA

Supabase TOTP MFA is standaard beschikbaar. Na eerste login:

1. Redirect naar `/admin/mfa/setup`
2. Scan QR-code en verifieer met 6-cijferige code
3. Daarna vereist elke sessie AAL2 via `/admin/mfa/verify`

Zonder geverifieerde MFA-factor blijft admin geblokkeerd.

## Stap 1 — Gebruiker aanmaken

1. Supabase Dashboard → **Authentication** → **Users**
2. **Add user** → e-mail + sterk wachtwoord (of magic link)
3. Noteer de **User UID**

## Stap 2 — OWNER bootstrap (PowerShell)

```powershell
Set-Location c:\Users\XXX\vdbdigital2.0

# Optie A: via user ID
$env:BOOTSTRAP_USER_ID = "00000000-0000-0000-0000-000000000000"
npm run db:bootstrap-owner

# Optie B: via e-mail (aanbevolen bootstrap / recovery owner)
$env:BOOTSTRAP_USER_EMAIL = "algemeen@vdbdigital.nl"
npm run db:bootstrap-owner
```

> **Productieregel:** `algemeen@vdbdigital.nl` is de vaste bootstrap/recovery OWNER.
> Andere accounts worden nooit automatisch ADMIN/OWNER. Staff-rollen (ADMIN/SUPPORT/CONTENT)
> worden alleen door OWNER toegekend via `/admin/users` (AAL2 + `roles.manage`).
> De bootstrap-owner mag niet via normale adminacties gedegradeerd of verwijderd worden.

## Stap 3 — Verifiëren

```powershell
npm run db:verify-owner
```

1. Log in via Supabase Auth (login UI volgt in latere fase)
2. Bezoek `/admin` — redirect naar login zonder sessie
3. Controleer `admin_roles` tabel: rol = `OWNER`

## Veiligheid

- Script weigert wanneer al een OWNER bestaat (tenzij `BOOTSTRAP_FORCE=1`)
- Geen hardcoded wachtwoorden of e-mails in code
- Geen secrets in console output
- Rolwijzigingen daarna uitsluitend via geautoriseerde server-acties + audit log

## SQL-alternatief

```sql
-- Vervang :user_id door Supabase Auth UID
INSERT INTO profiles (id, email) VALUES (:user_id, 'admin@voorbeeld.nl')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

INSERT INTO admin_roles (user_id, role) VALUES (:user_id, 'OWNER')
ON CONFLICT (user_id) DO UPDATE SET role = 'OWNER';
```
