import type { Locale } from "@/i18n/config";

/**
 * JURIDISCHE REVIEW AANBEVOLEN
 * Internal documentary marker — not rendered on public pages.
 */

export type LegalPageKey = "privacy" | "cookies" | "terms" | "refund";

export type LegalBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "companyBlock" }
  | { type: "dpo" };

export type LegalPageData = {
  metaTitle: string;
  metaDescription: string;
  title: string;
  blocks: LegalBlock[];
};

type LegalCatalog = Record<LegalPageKey, LegalPageData>;

const legalEn: LegalCatalog = {
  privacy: {
    metaTitle: "Privacy policy",
    metaDescription: "Privacy policy of VDB Digital — how we process personal data.",
    title: "Privacy policy",
    blocks: [
      {
        type: "paragraph",
        text: "{legalName} values the protection of personal data. In this privacy policy we explain what data we process, why, and what rights you have.",
      },
      { type: "heading", text: "Data controller" },
      { type: "companyBlock" },
      { type: "dpo" },
      { type: "heading", text: "What data we process" },
      {
        type: "paragraph",
        text: "We process data you provide through contact forms, quote requests, orders (when direct online checkout is available) or other communication, such as name, email address, company name, phone number, message content and (for orders) billing details.",
      },
      { type: "heading", text: "Purposes and legal bases" },
      {
        type: "list",
        items: [
          "Responding to contact, quote and support requests (legitimate interest / performance of contract)",
          "Processing orders and payments (performance of contract)",
          "Sending transactional emails about orders (performance of contract)",
          "Security, fraud prevention and audit logging (legitimate interest)",
          "Optional analytics or marketing cookies only with consent",
        ],
      },
      { type: "heading", text: "Retention period" },
      {
        type: "paragraph",
        text: "Data is not kept longer than necessary for the purpose for which it was collected, unless a legal retention obligation applies (for example tax records).",
      },
      { type: "heading", text: "Sharing with third parties" },
      {
        type: "paragraph",
        text: "We only share data with processors necessary for our services (such as hosting, email and payment providers), under appropriate processor agreements. We do not sell personal data.",
      },
      { type: "heading", text: "Your rights" },
      {
        type: "paragraph",
        text: "You have the right to access, rectification, erasure, restriction of processing, data portability and objection. Contact us at {privacyContact}. You may also lodge a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens).",
      },
    ],
  },
  cookies: {
    metaTitle: "Cookie policy",
    metaDescription:
      "Cookie policy of VDB Digital — which cookies we use and how to manage your preferences.",
    title: "Cookie policy",
    blocks: [
      {
        type: "paragraph",
        text: "This website uses cookies to make the site work and — only with your consent — for functional, analytics and marketing purposes.",
      },
      { type: "heading", text: "Necessary cookies" },
      {
        type: "paragraph",
        text: "Required for security, session management and cookie preferences. When you use shop features, session cookies may also store cart state. These cookies are always placed.",
      },
      { type: "heading", text: "Functional cookies" },
      {
        type: "paragraph",
        text: "Optional enhancements that are not required for basic browsing. We do not currently load third-party live-chat widgets. Any future functional cookies are only placed after consent.",
      },
      { type: "heading", text: "Analytics cookies" },
      {
        type: "paragraph",
        text: "Help us understand how the website is used. Only loaded after consent. We aim to minimise personally identifiable data.",
      },
      { type: "heading", text: "Marketing cookies" },
      {
        type: "paragraph",
        text: "Only loaded after consent. Marketing pixels are not activated by default without explicit configuration and consent.",
      },
      { type: "heading", text: "Changing your preferences" },
      {
        type: "paragraph",
        text: "You can reopen cookie preferences at any time via the Cookie preferences link in the footer, or by clearing cookies in your browser and revisiting the site.",
      },
    ],
  },
  terms: {
    metaTitle: "Terms and conditions",
    metaDescription: "Terms and conditions of VDB Digital for services and digital products.",
    title: "Terms and conditions",
    blocks: [
      {
        type: "paragraph",
        text: "These terms and conditions apply to all services and products offered by {legalName} through the website, shop or custom agreements.",
      },
      { type: "heading", text: "Company details" },
      { type: "companyBlock" },
      { type: "heading", text: "Scope of these terms" },
      {
        type: "paragraph",
        text: "These terms primarily cover business-to-business (B2B) services and digital products. Where mandatory consumer law applies to a consumer (B2C) purchase, those statutory rights prevail over conflicting clauses.",
      },
      { type: "heading", text: "Complaints" },
      {
        type: "paragraph",
        text: "Complaints about services or products can be sent to {contactEmail}. We aim to acknowledge complaints within five business days and resolve them within a reasonable period. Escalation to the competent Dutch court remains available where required by law.",
      },
      { type: "heading", text: "Offer and agreement" },
      {
        type: "paragraph",
        text: "Quotes and shop offers are non-binding until acceptance and payment (shop) or until written confirmation of the agreement (custom work). Obvious errors in price or description do not bind us.",
      },
      { type: "heading", text: "Orders and payment" },
      {
        type: "paragraph",
        text: "At the time of publication, direct online checkout on this website may be disabled. In that case, products and packages are shown for information and quote request only; a binding agreement is formed after written confirmation (quote or project agreement) and according to the agreed payment schedule. When direct online checkout is enabled, shop orders are processed after successful payment via Mollie. Prices are shown inclusive or exclusive of VAT as indicated on the product page. Subscriptions are invoiced periodically according to the selected billing frequency.",
      },
      { type: "heading", text: "Delivery" },
      {
        type: "paragraph",
        text: "Delivery times are indicative and confirmed per product or project. Digital services begin after payment or according to the agreed schedule.",
      },
      { type: "heading", text: "Intellectual property" },
      {
        type: "paragraph",
        text: "Design, code and documentation remain the property of VDB Digital or licensors, unless otherwise agreed in writing. Clients receive a right of use for the intended purpose.",
      },
      { type: "heading", text: "Liability" },
      {
        type: "paragraph",
        text: "Our liability is limited to the amount paid for the relevant assignment or order, to the extent permitted by mandatory law. Indirect damage is excluded where legally permitted.",
      },
      { type: "heading", text: "Applicable law" },
      {
        type: "paragraph",
        text: "These terms are governed by Dutch law. Disputes are submitted to the competent court in the Netherlands, without prejudice to mandatory consumer protection.",
      },
    ],
  },
  refund: {
    metaTitle: "Refund policy",
    metaDescription:
      "Refund and cancellation policy of VDB Digital for digital products and projects.",
    title: "Refund policy",
    blocks: [
      {
        type: "paragraph",
        text: "Because we primarily deliver digital services and custom work, refunds depend on the product type and project progress.",
      },
      { type: "heading", text: "Digital products" },
      {
        type: "paragraph",
        text: "One-off digital products (templates, installations) cannot be returned after delivery, unless there is a technical defect we cannot resolve within a reasonable timeframe.",
      },
      { type: "heading", text: "Custom projects" },
      {
        type: "paragraph",
        text: "For custom work, the agreed payment schedule applies. Work already delivered or performed is not refunded. Deposits for work not yet started may be refunded by mutual agreement.",
      },
      { type: "heading", text: "Subscriptions" },
      {
        type: "paragraph",
        text: "Monthly or annual subscriptions can be cancelled at the end of the current period. Refunds for a period already started are not possible, unless we are structurally unable to deliver the service.",
      },
      { type: "heading", text: "Submitting a request" },
      {
        type: "paragraph",
        text: "Send a refund request to {supportEmail} with your order reference, purchase date and explanation. We respond as quickly as possible on business days.",
      },
    ],
  },
};

const legalNl: LegalCatalog = {
  privacy: {
    metaTitle: "Privacyverklaring",
    metaDescription:
      "Privacyverklaring van VDB Digital — hoe wij persoonsgegevens verwerken.",
    title: "Privacyverklaring",
    blocks: [
      {
        type: "paragraph",
        text: "{legalName} hecht waarde aan de bescherming van persoonsgegevens. In deze privacyverklaring leggen wij uit welke gegevens wij verwerken, waarom, en welke rechten u heeft.",
      },
      { type: "heading", text: "Verwerkingsverantwoordelijke" },
      { type: "companyBlock" },
      { type: "dpo" },
      { type: "heading", text: "Welke gegevens wij verwerken" },
      {
        type: "paragraph",
        text: "Wij verwerken gegevens die u via contactformulieren, offerteaanvragen, bestellingen (wanneer directe online checkout beschikbaar is) of overige communicatie aanlevert, zoals naam, e-mailadres, bedrijfsnaam, telefoonnummer, inhoud van berichten en (bij bestellingen) factuurgegevens.",
      },
      { type: "heading", text: "Doeleinden en grondslagen" },
      {
        type: "list",
        items: [
          "Beantwoorden van contact-, offerte- en supportverzoeken (gerechtvaardigd belang / uitvoering van de overeenkomst)",
          "Verwerken van bestellingen en betalingen (uitvoering van de overeenkomst)",
          "Verzenden van transactionele e-mails over bestellingen (uitvoering van de overeenkomst)",
          "Beveiliging, fraudepreventie en auditlogging (gerechtvaardigd belang)",
          "Optionele analytics- of marketingcookies alleen met toestemming",
        ],
      },
      { type: "heading", text: "Bewaartermijn" },
      {
        type: "paragraph",
        text: "Gegevens worden niet langer bewaard dan nodig is voor het doel waarvoor zij zijn verzameld, tenzij een wettelijke bewaarplicht geldt (bijvoorbeeld fiscale administratie).",
      },
      { type: "heading", text: "Delen met derden" },
      {
        type: "paragraph",
        text: "Wij delen gegevens alleen met verwerkers die nodig zijn voor onze dienstverlening (zoals hosting, e-mail en betaalproviders), onder passende verwerkersovereenkomsten. Wij verkopen geen persoonsgegevens.",
      },
      { type: "heading", text: "Uw rechten" },
      {
        type: "paragraph",
        text: "U heeft het recht op inzage, rectificatie, verwijdering, beperking van verwerking, dataportabiliteit en bezwaar. Neem contact op via {privacyContact}. U kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens.",
      },
    ],
  },
  cookies: {
    metaTitle: "Cookiebeleid",
    metaDescription:
      "Cookiebeleid van VDB Digital — welke cookies wij gebruiken en hoe u uw voorkeuren beheert.",
    title: "Cookiebeleid",
    blocks: [
      {
        type: "paragraph",
        text: "Deze website gebruikt cookies om de site te laten functioneren en — alleen met uw toestemming — voor functionele, analytische en marketingdoeleinden.",
      },
      { type: "heading", text: "Noodzakelijke cookies" },
      {
        type: "paragraph",
        text: "Vereist voor beveiliging, sessiebeheer en cookievoorkeuren. Wanneer u shopfuncties gebruikt, kunnen sessiecookies ook winkelwagengegevens bewaren. Deze cookies worden altijd geplaatst.",
      },
      { type: "heading", text: "Functionele cookies" },
      {
        type: "paragraph",
        text: "Optionele verbeteringen die niet nodig zijn voor basisnavigatie. Wij laden momenteel geen livechat-widgets van derden. Toekomstige functionele cookies worden alleen geplaatst na toestemming.",
      },
      { type: "heading", text: "Analytische cookies" },
      {
        type: "paragraph",
        text: "Helpen ons te begrijpen hoe de website wordt gebruikt. Alleen geladen na toestemming. Wij streven ernaar persoonlijk identificeerbare gegevens te minimaliseren.",
      },
      { type: "heading", text: "Marketingcookies" },
      {
        type: "paragraph",
        text: "Alleen geladen na toestemming. Marketingpixels worden standaard niet geactiveerd zonder expliciete configuratie en toestemming.",
      },
      { type: "heading", text: "Voorkeuren wijzigen" },
      {
        type: "paragraph",
        text: "U kunt cookievoorkeuren op elk moment opnieuw openen via de link Cookievoorkeuren in de footer, of door cookies in uw browser te wissen en de site opnieuw te bezoeken.",
      },
    ],
  },
  terms: {
    metaTitle: "Algemene voorwaarden",
    metaDescription:
      "Algemene voorwaarden van VDB Digital voor diensten en digitale producten.",
    title: "Algemene voorwaarden",
    blocks: [
      {
        type: "paragraph",
        text: "Deze algemene voorwaarden zijn van toepassing op alle diensten en producten die {legalName} aanbiedt via de website, webshop of maatwerkovereenkomsten.",
      },
      { type: "heading", text: "Bedrijfsgegevens" },
      { type: "companyBlock" },
      { type: "heading", text: "Reikwijdte van deze voorwaarden" },
      {
        type: "paragraph",
        text: "Deze voorwaarden betreffen primair business-to-business (B2B) diensten en digitale producten. Waar dwingend consumentenrecht van toepassing is op een consumenten (B2C) aankoop, prevaleren die wettelijke rechten boven tegenstrijdige bepalingen.",
      },
      { type: "heading", text: "Klachten" },
      {
        type: "paragraph",
        text: "Klachten over diensten of producten kunt u sturen naar {contactEmail}. Wij streven ernaar klachten binnen vijf werkdagen te bevestigen en binnen een redelijke termijn op te lossen. Escalatie naar de bevoegde Nederlandse rechter blijft beschikbaar waar de wet dat vereist.",
      },
      { type: "heading", text: "Offerte en overeenkomst" },
      {
        type: "paragraph",
        text: "Offertes en shopaanbiedingen zijn vrijblijvend totdat acceptatie en betaling (shop) of schriftelijke bevestiging van de overeenkomst (maatwerk) heeft plaatsgevonden. Kennelijke fouten in prijs of omschrijving binden ons niet.",
      },
      { type: "heading", text: "Bestellingen en betaling" },
      {
        type: "paragraph",
        text: "Op het moment van publicatie kan directe online checkout op deze website zijn uitgeschakeld. In dat geval worden producten en pakketten ter informatie en offerteaanvraag getoond; een bindende overeenkomst komt tot stand na schriftelijke bevestiging (offerte of projectovereenkomst) en volgens het afgesproken betalingsschema. Wanneer directe online checkout is ingeschakeld, worden shopbestellingen verwerkt na succesvolle betaling via Mollie. Prijzen worden getoond inclusief of exclusief btw zoals aangegeven op de productpagina. Abonnementen worden periodiek gefactureerd volgens de gekozen facturatiefrequentie.",
      },
      { type: "heading", text: "Levering" },
      {
        type: "paragraph",
        text: "Levertijden zijn indicatief en worden per product of project bevestigd. Digitale diensten starten na betaling of volgens het afgesproken schema.",
      },
      { type: "heading", text: "Intellectueel eigendom" },
      {
        type: "paragraph",
        text: "Ontwerp, code en documentatie blijven eigendom van VDB Digital of licentiegevers, tenzij schriftelijk anders overeengekomen. Opdrachtgevers ontvangen een gebruiksrecht voor het beoogde doel.",
      },
      { type: "heading", text: "Aansprakelijkheid" },
      {
        type: "paragraph",
        text: "Onze aansprakelijkheid is beperkt tot het bedrag dat voor de betreffende opdracht of bestelling is betaald, voor zover dwingend recht dat toelaat. Indirecte schade is uitgesloten waar wettelijk toegestaan.",
      },
      { type: "heading", text: "Toepasselijk recht" },
      {
        type: "paragraph",
        text: "Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in Nederland, onverminderd dwingende consumentenbescherming.",
      },
    ],
  },
  refund: {
    metaTitle: "Refundbeleid",
    metaDescription:
      "Refund- en annuleringsbeleid van VDB Digital voor digitale producten en projecten.",
    title: "Refundbeleid",
    blocks: [
      {
        type: "paragraph",
        text: "Omdat wij primair digitale diensten en maatwerk leveren, hangen refunds af van het producttype en de voortgang van het project.",
      },
      { type: "heading", text: "Digitale producten" },
      {
        type: "paragraph",
        text: "Eenmalige digitale producten (templates, installaties) kunnen na levering niet worden geretourneerd, tenzij er een technisch defect is dat wij binnen een redelijke termijn niet kunnen oplossen.",
      },
      { type: "heading", text: "Maatwerkprojecten" },
      {
        type: "paragraph",
        text: "Voor maatwerk geldt het afgesproken betalingsschema. Reeds geleverd of uitgevoerd werk wordt niet gerestitueerd. Aanbetalingen voor nog niet gestart werk kunnen in onderling overleg worden terugbetaald.",
      },
      { type: "heading", text: "Abonnementen" },
      {
        type: "paragraph",
        text: "Maandelijkse of jaarlijkse abonnementen kunnen worden opgezegd aan het einde van de lopende periode. Restitutie voor een reeds gestarte periode is niet mogelijk, tenzij wij structureel niet in staat zijn de dienst te leveren.",
      },
      { type: "heading", text: "Verzoek indienen" },
      {
        type: "paragraph",
        text: "Stuur een refundverzoek naar {supportEmail} met uw orderreferentie, aankoopdatum en toelichting. Wij reageren zo snel mogelijk op werkdagen.",
      },
    ],
  },
};

const catalogs: Record<Locale, LegalCatalog> = {
  en: legalEn,
  nl: legalNl,
};

export type LegalTemplateContext = {
  legalName: string;
  contactEmail: string;
  supportEmail: string;
  privacyContact: string;
};

function interpolate(text: string, ctx: LegalTemplateContext): string {
  return text
    .replaceAll("{legalName}", ctx.legalName)
    .replaceAll("{contactEmail}", ctx.contactEmail)
    .replaceAll("{supportEmail}", ctx.supportEmail)
    .replaceAll("{privacyContact}", ctx.privacyContact);
}

function localizeBlocks(
  blocks: LegalBlock[],
  ctx: LegalTemplateContext,
): LegalBlock[] {
  return blocks.map((block) => {
    if (block.type === "paragraph") {
      return { ...block, text: interpolate(block.text, ctx) };
    }
    if (block.type === "heading") {
      return { ...block, text: interpolate(block.text, ctx) };
    }
    if (block.type === "list") {
      return { ...block, items: block.items.map((item) => interpolate(item, ctx)) };
    }
    return block;
  });
}

export function getLegalContent(
  page: LegalPageKey,
  locale: Locale,
  ctx: LegalTemplateContext,
): LegalPageData {
  const raw = catalogs[locale][page];
  return {
    ...raw,
    blocks: localizeBlocks(raw.blocks, ctx),
  };
}
