import { siteConfig } from "@/config/site";

export function CompanyLegalBlock() {
  const { company, legal } = siteConfig;
  const lines = [
    company.legalName,
    company.address || null,
    [company.city, company.country].filter(Boolean).join(", ") || null,
    company.kvk ? `KvK: ${company.kvk}` : null,
    company.vat ? `BTW: ${company.vat}` : null,
    `E-mail: ${legal.privacyContact}`,
  ].filter(Boolean);

  return (
    <p>
      {lines.map((line) => (
        <span key={line}>
          {line}
          <br />
        </span>
      ))}
    </p>
  );
}
