# Backup & Recovery

## Supabase

- Automatische backups via Supabase Pro plan
- Handmatige export: Dashboard → Database → Backups
- Point-in-time recovery afhankelijk van plan

## Aanbevolen

1. Dagelijkse database backups
2. Environment variables veilig opslaan (Vercel/env vault)
3. Migraties versioneren in git
4. Test recovery procedure periodiek

## Order data

Orders en betalingen staan in Supabase. Exporteer regelmatig voor administratie.
