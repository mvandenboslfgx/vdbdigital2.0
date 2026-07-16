# Mobile Screenshot QA

Artifacts: `test-results/screenshots/` (45 PNGs captured via `npm run test:e2e:screenshots`)

| Route | Viewport | EN | NL | Overflow | Collision | Content | Status |
|---|---|---|---|---|---|---|---|
| `/` homepage | 360×800 | OK | — | OK | OK | OK | PASS |
| `/` mobile menu | 360×800 | OK | — | OK | OK | OK | PASS |
| `/nl` homepage | 360×800 | — | OK | OK | OK | OK | PASS |
| `/quote` step 1 | 360×800 | OK | — | OK | OK* | OK | PASS |
| `/shop` | 360×800 | OK | — | OK | OK | OK | PASS |
| `/solutions` | 360×800 | OK | — | OK | OK | OK | PASS |
| `/solutions/websites` | 360×800 | OK | — | OK | OK | OK | PASS |
| `/solutions/webshops` | 360×800 | OK | — | OK | OK | OK | PASS |
| `/contact` | 360×800 | OK | — | OK | OK | OK | PASS |
| `/cases` | 360×800 | OK | — | OK | OK | OK | PASS |
| `/cases/demo-whatsapp-ai` | 360×800 | OK | — | OK | OK | OK | PASS |
| `/admin/login` | 360×800 | OK | n/a | OK | OK | OK | PASS |
| Core set | 390×844 | OK | sample | OK | OK | OK | PASS |
| Core set | 768×1024 | OK | sample | OK | OK | OK | PASS |
| Core set | 1440×900 | OK | sample | OK | OK | OK | PASS |

\* Cursor/Next.js issues badge may overlay page content in local screenshot runs — not a production UI element.

## Notes

- WhatsApp shows not-configured copy when number missing (expected without env)
- Founding bar not visible (campaign disabled — correct)
- Vermeulen not public (correct)
- Dual VAT package prices visible on homepage package cards in live UI

## Command

```bash
npm run test:e2e:screenshots
```
