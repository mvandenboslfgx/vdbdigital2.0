import type { Locale } from "@/i18n/config";
import { siteConfig } from "@/config/site";

const labels = {
  en: {
    tradeName: "Trade name",
    kvk: "Chamber of Commerce",
    vat: "VAT",
    phone: "Phone",
    businessEmail: "Business email",
    support: "Support",
    privacy: "Privacy",
  },
  nl: {
    tradeName: "Handelsnaam",
    kvk: "KvK",
    vat: "BTW",
    phone: "Telefoon",
    businessEmail: "Zakelijk e-mail",
    support: "Support",
    privacy: "Privacy",
  },
} as const;

export function CompanyLegalBlock({ locale = "nl" }: { locale?: Locale }) {
  const copy = labels[locale];
  const { company, legal, contactEmail, supportEmail, name } = siteConfig;
  const tradeName =
    name !== company.legalName ? `${copy.tradeName}: ${name}` : null;
  const lines = [
    company.legalName,
    tradeName,
    company.address || null,
    [company.city, company.country].filter(Boolean).join(", ") || null,
    company.kvk ? `${copy.kvk}: ${company.kvk}` : null,
    company.vat ? `${copy.vat}: ${company.vat}` : null,
    company.phone ? `${copy.phone}: ${company.phone}` : null,
    `${copy.businessEmail}: ${contactEmail}`,
    supportEmail ? `${copy.support}: ${supportEmail}` : null,
    `${copy.privacy}: ${legal.privacyContact}`,
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
