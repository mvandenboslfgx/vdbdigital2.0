# tawk.to Setup — VDB Digital

Property: **Vdbdigital** · https://vdbdigital.com

## Environment variables

Voeg toe aan `.env.local`:

```env
NEXT_PUBLIC_TAWK_PROPERTY_ID=69ae11eeddd7fc1c3485300b
NEXT_PUBLIC_TAWK_WIDGET_ID=<widget-id-uit-dashboard>
TAWK_API_SECRET=<javascript-api-key>
```

| Variabele | Waarde | Waar te vinden |
|-----------|--------|----------------|
| `NEXT_PUBLIC_TAWK_PROPERTY_ID` | `69ae11eeddd7fc1c3485300b` | Admin → Overview |
| `NEXT_PUBLIC_TAWK_WIDGET_ID` | *nog invullen* | Admin → Chat Widget → Widget Status |
| `TAWK_API_SECRET` | JavaScript API Key | Admin → Overview → JavaScript API |

> **Widget ID ontbreekt op Overview.** Ga naar **Administration → Chat Widget** en kopieer de Widget ID onder *Widget Status*, of uit de Direct Chat Link: `https://tawk.to/chat/{propertyId}/{widgetId}`.

## Secure Mode

Secure Mode staat momenteel **uit** in het dashboard. Wanneer je het inschakelt:

1. Zet Secure Mode aan in tawk.to
2. Gebruik `POST /api/tawk/hash` met `{ "email": "..." }` voor de bezoeker-hash
3. De API key (`TAWK_API_SECRET`) blijft uitsluitend server-side

## Gedrag in de app

- Laadt **niet** in `/admin`
- Alleen na **functionele** cookietoestemming
- Lazy loading via custom chatknop (geen layout shift)
- Fallback naar WhatsApp zonder consent of zonder configuratie
- Geen gevoelige data in URL-parameters

## Testen lokaal

```powershell
# Na invullen Widget ID in .env.local:
npm run dev
```

1. Open http://localhost:3000
2. Accepteer cookies (functioneel)
3. Klik op de chatknop rechtsonder
4. Controleer in tawk.to dashboard of bezoekers binnenkomen

## CSP

Toegestane domeinen staan in `docs/CSP_ALLOWLIST.md`:

- `https://embed.tawk.to`
- `wss://*.tawk.to`
