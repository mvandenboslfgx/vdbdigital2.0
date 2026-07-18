# Catalog admin storage preparation

**Status:** documented + SQL migration filed — **not applied**.

## Bucket

| Setting | Value |
|---------|--------|
| Name / id | `product-media` |
| Public | **No** (private) |
| Max object size | 5 MiB (`5242880`) |
| Allowed MIME | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |

## Path structure

```text
products/{product_id}/{timestamp}-{safe-name}.{ext}
```

- `product_id` = UUID
- `safe-name` = lowercased, `[a-z0-9._-]` only
- Extension derived from **server-validated MIME**, not client filename alone

## Rights

| Actor | Upload | Read | Delete |
|-------|--------|------|--------|
| anon | No | No | No |
| authenticated (browser) | No | No | No |
| CONTENT (via server action + `products.manage_media`) | Yes (service role) | Yes (signed URL) | Yes |
| ADMIN / OWNER | Yes (service role) | Yes | Yes |
| service_role key in browser | **Forbidden** | — | — |

All mutations go through Next.js server actions with `requirePermission` — never direct Storage from the client with elevated keys.

## URL generation

- Prefer short-lived **signed URLs** for admin preview
- Do not store base64 in Postgres
- Public shop may later use a CDN path only for explicitly published primary images (separate gate)

## Cache headers

- Private objects: no long-lived public cache
- Signed URL TTL: short (e.g. 60–300s) for admin previews

## Orphan cleanup

- DB row in `product_media` is source of truth for references
- Operator job (later): list bucket prefixes without matching `product_media.storage_path` and quarantine
- On product hard-delete: cascade DB rows; schedule object removal

## Migration file

`supabase/migrations/20260716230000_catalog_admin_storage.sql`

## Security checklist

- [x] service_role not shipped to client
- [x] MIME + size validated server-side (`mediaUploadMetaSchema`)
- [x] Extension not trusted alone
- [x] Client roles denied on `product-media` bucket
- [ ] Bucket created on dry-run / prod only after catalog migration gate
