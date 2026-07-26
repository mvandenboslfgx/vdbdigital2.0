import { CompanyLegalBlock } from "@/components/sections/company-legal-block";
import { siteConfig } from "@/config/site";
import { getLegalContent, type LegalPageKey } from "@/i18n/content/legal";
import { getLocale } from "@/i18n/get-dictionary";
import { LegalPageContent } from "@/components/sections/legal-page";

type LegalDocumentBodyProps = {
  page: LegalPageKey;
};

function renderParagraph(text: string, supportEmail: string) {
  if (!text.includes(supportEmail)) {
    return <p>{text}</p>;
  }

  const [before, after] = text.split(supportEmail);
  return (
    <p>
      {before}
      <a href={`mailto:${supportEmail}`} className="text-primary underline">
        {supportEmail}
      </a>
      {after}
    </p>
  );
}

export async function LegalDocumentBody({ page }: LegalDocumentBodyProps) {
  const locale = await getLocale();
  const content = getLegalContent(page, locale, {
    legalName: siteConfig.legalName,
    contactEmail: siteConfig.contactEmail,
    supportEmail: siteConfig.supportEmail,
    privacyContact: siteConfig.legal.privacyContact,
  });

  return (
    <LegalPageContent title={content.title}>
      {content.blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return (
              <h2 key={`${block.text}-${index}`} className="text-h3 text-light-foreground">
                {block.text}
              </h2>
            );
          case "paragraph":
            return (
              <div key={`${block.text}-${index}`}>
                {renderParagraph(block.text, siteConfig.supportEmail)}
              </div>
            );
          case "list":
            return (
              <ul key={`list-${index}`} className="list-disc pl-6 space-y-2">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case "companyBlock":
            return <CompanyLegalBlock key={`company-${index}`} locale={locale} />;
          case "dpo":
            return siteConfig.legal.dpo ? (
              <p key={`dpo-${index}`}>
                {locale === "nl"
                  ? `Functionaris gegevensbescherming: ${siteConfig.legal.dpo}`
                  : `Data protection officer: ${siteConfig.legal.dpo}`}
              </p>
            ) : null;
          default:
            return null;
        }
      })}
    </LegalPageContent>
  );
}
