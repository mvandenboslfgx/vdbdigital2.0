import { siteConfig } from "@/config/site";

export function CompanyLegalBlock() {
  const { company, legal, contactEmail, supportEmail, name } = siteConfig;
  const tradeName =
    name !== company.legalName ? `Handelsnaam: ${name}` : null;
  const lines = [
    company.legalName,
    tradeName,
    company.address || null,
    [company.city, company.country].filter(Boolean).join(", ") || null,
    company.kvk ? `KvK: ${company.kvk}` : null,
    company.vat ? `BTW: ${company.vat}` : null,
    company.phone ? `Telefoon: ${company.phone}` : null,
    `Zakelijk e-mail: ${contactEmail}`,
    supportEmail ? `Support: ${supportEmail}` : null,
    `Privacy: ${legal.privacyContact}`,
  ].filter(Boolean) as string[];

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
