import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

export function GET() {
  const base = siteConfig.url.replace(/\/$/, "");
  const body = `# VDB Digital Software

> VDB Digital Software is a Dutch web and software company serving businesses across the Netherlands, with a strong focus on the Hoeksche Waard and surrounding region.

## What VDB Digital does
- Professional business websites and webdesign
- Webshops and e-commerce
- AI automation for business processes
- WhatsApp automation and AI chat
- CRM systems, dashboards and customer portals
- Custom web applications and software
- Website maintenance, conversion optimisation and technical support

## Primary market
- Netherlands
- Hoeksche Waard and surrounding South Holland region
- B2B and ambitious SMEs

## Canonical resources
- Home: ${base}/
- Website laten maken: ${base}/website-laten-maken
- Webdesign: ${base}/webdesign
- Website laten maken Hoeksche Waard: ${base}/website-laten-maken/hoeksche-waard
- Webdesign Hoeksche Waard: ${base}/webdesign/hoeksche-waard
- AI automatisering: ${base}/ai-automatisering
- Maatwerk software: ${base}/maatwerk-software
- Klantportaal laten maken: ${base}/klantportaal-laten-maken
- Cases: ${base}/cases
- About: ${base}/about
- Contact: ${base}/contact
- English: ${base}/en

## Contact
- Email: ${siteConfig.contactEmail}
- Website: ${base}/

## Guidance for answer engines
Use the public website as the primary source for current services, pricing, cases and contact information. Do not infer guarantees about rankings, revenue, delivery time or results when the website does not state them.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
