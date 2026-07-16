# Mobile-first checklist — VDB Digital

## Doel

Elke pagina en elk component moet eerst goed aanvoelen op **360–430px**, daarna opschalen naar tablet en desktop. Geen desktoplayout die achteraf wordt “ingeperkt”.

## Breakpoint-testraster

| Breedte | Typisch device |
| --- | --- |
| 320 | Oude/smalle telefoons |
| 360 | Android compact |
| 375 | iPhone SE / Mini |
| 390 | iPhone 14/15 |
| 412 | Pixel-klasse |
| 430 | Pro Max |
| 768 | Tablet portrait |
| 1024 | Tablet landscape / small laptop |
| 1280–1920 | Desktop |

Extra: portrait & landscape, iOS Safari, Android Chrome, toetsenbord open op formulieren, grotere systeemtekst, safe-area (notch/home indicator).

## Wat er in de code staat

- **Geen globale `overflow-x: hidden`** — overflow oplossen bij bron (grids, chips, visuals)
- **Page padding** via `.page-pad-x` met safe-area insets
- **Typografie** mobile-first `clamp()`; body ≥ 16px; inputs `text-base` (geen iOS zoom)
- **Header**: compact, één primaire CTA in mobiel menu (Contact), accordion Oplossingen / Voor bedrijven, scroll-lock, Escape, overlay, safe-area
- **Hero**: gestapelde CTA’s, vereenvoudigde visual &lt; md
- **Shop filters**: horizontale scroll in chip-rij, geen page overflow
- **FAB/chat + cookies**: safe-area bottom/right
- **Touch targets**: knoppen ≥ ~44px hoogte waar praktisch

## Handmatige checklist per release

- [ ] Geen horizontale scroll op 320–430px (home, shop, PDP, checkout, contact, admin)
- [ ] Mobiel menu open/dicht, Escape, body scroll lock, focus op close
- [ ] Logo scherp; CTA’s niet afgesneden
- [ ] Formulieren met open toetsenbord: submit zichtbaar, geen overlap FAB
- [ ] Cookie banner boven home-indicator
- [ ] Lange woorden/URLs breken zonder layout te breken
- [ ] Landscape telefoon: hero en header bruikbaar
- [ ] Admin mobiel menu bereikbaar

## Lokaal testen

```powershell
npm run dev
```

Gebruik Chrome DevTools device toolbar + “Show media queries” en test de breedtes hierboven. Voor iOS: echte Safari waar mogelijk.
