import type { SolutionPageSections } from "@/components/sections/solution-page";

export interface SeoLandingContent extends SolutionPageSections {
  metaTitle: string;
  metaDescription: string;
}

export interface SeoLocalContent extends SeoLandingContent {
  locationLabel: string;
  regionContext: string;
}

export type SeoLandingPageKey =
  | "websiteLatenMaken"
  | "webdesign"
  | "webshopLatenMaken"
  | "aiAutomatisering"
  | "aiChatbot"
  | "whatsappAutomatisering"
  | "maatwerkSoftware"
  | "klantportaalLatenMaken";

function related(
  items: Array<{ href: string; label: string }>,
): Array<{ href: string; label: string }> {
  return items;
}

export const seoLandingPages: Record<SeoLandingPageKey, SeoLandingContent> = {
  websiteLatenMaken: {
    metaTitle: "Website laten maken voor bedrijven | VDB Digital",
    metaDescription:
      "Professionele website laten maken voor jouw bedrijf? VDB Digital bouwt snelle, conversiegerichte websites voor mkb — van bouw en installatie tot dienstverlening.",
    title: "Professionele website laten maken voor jouw bedrijf",
    description:
      "Wij bouwen bedrijfswebsites die vertrouwen wekken, snel laden en bezoekers naar een duidelijke aanvraag leiden. Geen template met jouw logo erop — maar een site die past bij hoe jij werkt.",
    problem: {
      title: "Een verouderde site kost aanvragen",
      body: "Veel ondernemers verliezen leads omdat hun website traag is, onduidelijk communiceert of niet mobiel werkt. Potentiële klanten klikken door voordat ze contact opnemen.",
    },
    builds: {
      title: "Wat wij voor je bouwen",
      body: "Een maatwerk bedrijfswebsite met heldere structuur, contact- of offerteformulieren, technische SEO-basis en een fundament dat je later kunt uitbreiden met webshop, chatbot of automatisering.",
    },
    benefits: [
      "Professionele uitstraling die past bij jouw vakmanschap",
      "Meer aanvragen door duidelijke call-to-actions",
      "Snelle, mobiel-first pagina's voor echte bezoekers",
      "Technische basis klaar voor groei en automatisering",
    ],
    features: [
      "Responsive design voor telefoon, tablet en desktop",
      "Conversiegerichte pagina-opbouw en navigatie",
      "Contact- en offerteformulieren met server-side validatie",
      "Technische SEO: titels, structuur, meta en sitemap-klaar",
      "Performancegerichte implementatie (Core Web Vitals)",
      "Toegankelijkheid volgens WCAG 2.2 AA-uitgangspunten",
    ],
    process: [
      "Kennismaking en scope-afstemming",
      "Structuur, wireframes en visuele richting",
      "Bouw, contentplaatsing en formulieren",
      "Test, livegang en korte overdracht",
    ],
    integrations: [
      "Analytics met cookie-toestemming",
      "E-mailnotificaties bij formulieraanvragen",
      "WhatsApp of livechat als instappunt",
      "Koppeling met CRM waar relevant",
    ],
    security: [
      "Server-side formuliervalidatie",
      "HTTPS en beveiligingsheaders",
      "Privacybewuste cookie- en consent-setup",
      "Geen gevoelige data in client-side code",
    ],
    whoFor: [
      "Bouwbedrijven, installateurs en elektriciens",
      "Telecom- en dienstverlenende mkb-bedrijven",
      "Ondernemers die een serieuze eerste indruk willen",
      "Bedrijven die later webshop of automatisering plannen",
    ],
    included: [
      "Afgesproken pagina's en componenten",
      "Responsive implementatie en formulieren",
      "Basis SEO-setup en toegankelijkheidscheck",
      "Livegang-ondersteuning en gebruikersnotities",
    ],
    notIncluded: [
      "Doorlopend contentbeheer tenzij apart afgesproken",
      "Betaalde advertenties of SEO-campagnes",
      "Gegarandeerde rankings of omzetresultaten",
    ],
    extensions: [
      "Webshop of boekingssysteem",
      "AI-chatbot of WhatsApp-automatisering",
      "Websiteonderhoud en technische support",
      "Conversie-optimalisatie",
    ],
    faq: [
      {
        q: "Wat kost een website laten maken?",
        a: "Dat hangt af van scope, aantal pagina's en functionaliteit. Na een korte kennismaking ontvang je een helder voorstel met vaste prijs — geen verrassingen achteraf.",
      },
      {
        q: "Hoe lang duurt het bouwen van een bedrijfswebsite?",
        a: "Een standaard bedrijfswebsite leveren wij doorgaans binnen enkele weken op, afhankelijk van content en feedbacksnelheid. Complexere projecten plannen we realistisch in.",
      },
      {
        q: "Gebruiken jullie WordPress of templates?",
        a: "Nee. Wij bouwen maatwerk websites met moderne techniek — geen standaard thema met jouw logo. Dat geeft betere performance en meer controle.",
      },
      {
        q: "Kan ik later een webshop of chatbot toevoegen?",
        a: "Ja. We bouwen met uitbreidbaarheid in gedachten, zodat je later e-commerce, automatisering of messaging kunt toevoegen zonder opnieuw te beginnen.",
      },
    ],
    related: related([
      { href: "/webdesign", label: "Webdesign bureau" },
      { href: "/webshop-laten-maken", label: "Webshop laten maken" },
      { href: "/ai-automatisering", label: "AI automatisering" },
      { href: "/cases/vermeulen-bouwservice", label: "Case: bouwbedrijf" },
    ]),
  },

  webdesign: {
    metaTitle: "Webdesign bureau voor bedrijven | VDB Digital",
    metaDescription:
      "Webdesign bureau voor mkb-bedrijven. VDB Digital ontwerpt premium bedrijfswebsites die vertrouwen wekken, snel laden en bezoekers omzetten in aanvragen.",
    title: "Webdesign dat jouw bedrijf serieus neerzet",
    description:
      "Als webdesign bureau bouwen wij geen generieke templates. Wij ontwerpen en ontwikkelen websites met sterke typografie, heldere structuur en subtiele interacties — passend bij jouw merk en doelgroep.",
    problem: {
      title: "Goedkoop webdesign kost vertrouwen",
      body: "Stock templates, overvolle pagina's en inconsistente styling laten zien dat je niet investeert in je online presentatie. Serieuze kopers merken dat — en twijfelen.",
    },
    builds: {
      title: "Premium webdesign, gebouwd om te converteren",
      body: "Van visuele richting tot responsive implementatie: wij leveren een samenhangend design dat op alle apparaten werkt en bezoekers naar contact, offerte of afspraak leidt.",
    },
    benefits: [
      "Onderscheidend design zonder schreeuwerige SEO-look",
      "Consistente merkbeleving op elke pagina",
      "Betere conversie door doordachte UX-keuzes",
      "Technisch solide fundament onder het design",
    ],
    features: [
      "Visuele richting en typografie op maat",
      "Mobiel-first responsive layouts",
      "Componentenbibliotheek voor schaalbaarheid",
      "Animaties en interacties die de ervaring versterken",
      "Toegankelijke kleurcontrasten en focusstates",
      "Design-to-build workflow zonder tussenkomst van derden",
    ],
    process: [
      "Inventarisatie merk, doelgroep en concurrentie",
      "Wireframes en visueel concept",
      "Design review en feedbackronde",
      "Implementatie, QA en livegang",
    ],
    integrations: [],
    security: [],
    whoFor: [
      "Bedrijven die een premium online uitstraling willen",
      "Ondernemers die hun template-site willen vervangen",
      "Mkb dat design en techniek uit één hand zoekt",
    ],
    included: [
      "Visueel concept voor kernpagina's",
      "Responsive implementatie",
      "Design QA op meerdere schermformaten",
    ],
    notIncluded: [
      "Logo- of huisstijlontwerp tenzij apart afgesproken",
      "Stockfotografie of copywriting op grote schaal",
      "Onbeperkte revisierondes na akkoord",
    ],
    extensions: [
      "Website laten maken (volledig traject)",
      "Conversie-optimalisatie",
      "Branding en contentproductie via partners",
    ],
    faq: [
      {
        q: "Wat is het verschil tussen webdesign en website laten maken?",
        a: "Webdesign focust op visuele richting, UX en uitstraling. Website laten maken omvat het volledige traject inclusief bouw, formulieren, SEO-basis en livegang. Bij VDB Digital leveren wij beide.",
      },
      {
        q: "Leveren jullie ook alleen design zonder bouw?",
        a: "Onze kracht zit in design én implementatie. Zo blijft het eindresultaat trouw aan het ontwerp en technisch haalbaar.",
      },
    ],
    related: related([
      { href: "/website-laten-maken", label: "Website laten maken" },
      { href: "/webshop-laten-maken", label: "Webshop laten maken" },
      { href: "/cases/grill-gasten", label: "Case: horeca" },
    ]),
  },

  webshopLatenMaken: {
    metaTitle: "Webshop laten maken | VDB Digital",
    metaDescription:
      "Webshop laten maken voor jouw bedrijf? VDB Digital bouwt snelle, betrouwbare online winkels met Mollie-betalingen, voorraadbeheer en conversiegerichte checkout.",
    title: "Webshop laten maken die verkoopt",
    description:
      "Wij bouwen webshops die klanten vertrouwen geven — van productpresentatie tot checkout. Met Mollie-betalingen, duidelijke navigatie en een technische basis die meegroeit met je assortiment.",
    problem: {
      title: "Een trage of onduidelijke webshop kost omzet",
      body: "Complexe checkout, trage pagina's en onbetrouwbare betalingen laten klanten afhaken. Elke extra stap in het koopproces kost conversie.",
    },
    builds: {
      title: "Wat wij opleveren",
      body: "Een volledige webshop met productcatalogus, winkelwagen, Mollie-checkout, orderbevestigingen en een admin-omgeving om producten en bestellingen te beheren.",
    },
    benefits: [
      "Betrouwbare betalingen via Mollie (iDEAL, creditcard, etc.)",
      "Snelle productpagina's die mobiel goed werken",
      "Overzichtelijk orderbeheer voor jouw team",
      "Uitbreidbaar naar automatisering en klantportaal",
    ],
    features: [
      "Productcatalogus met categorieën en filters",
      "Winkelwagen en checkout-flow",
      "Mollie-betalingen (iDEAL, creditcard, Bancontact)",
      "Orderbevestigingen per e-mail",
      "Voorraad- en prijsbeheer",
      "Technische SEO voor productpagina's",
    ],
    process: [
      "Assortiment, doelgroep en logistiek bespreken",
      "Shopstructuur en checkout ontwerpen",
      "Bouwen, producten invoeren en testen",
      "Livegang en betalingskoppeling activeren",
    ],
    integrations: ["Mollie", "E-mailnotificaties", "Analytics met consent"],
    security: [
      "Server-side prijsvalidatie",
      "Veilige betalingsflow via Mollie",
      "HTTPS en beveiligingsheaders",
    ],
    whoFor: [
      "Retailers die online willen verkopen",
      "Bedrijven met een fysiek assortiment dat digitaal wil",
      "Ondernemers die een professionele checkout willen",
    ],
    included: [
      "Shop met afgesproken functionaliteit",
      "Mollie-koppeling en testtransacties",
      "Admin voor producten en orders",
    ],
    notIncluded: [
      "Logistiek en verzendpartners",
      "Productfotografie en copywriting op grote schaal",
      "Marketplace-integraties tenzij afgesproken",
    ],
    extensions: [
      "WhatsApp ordernotificaties",
      "Klantportaal voor herhaalaankopen",
      "AI-productaanbevelingen",
    ],
    faq: [
      {
        q: "Welke betaalmethoden ondersteunen jullie?",
        a: "Via Mollie ondersteunen wij iDEAL, creditcard, Bancontact en andere methoden die Mollie aanbiedt voor jouw situatie.",
      },
      {
        q: "Kan ik mijn webshop later uitbreiden?",
        a: "Ja. We bouwen modulair, zodat je later automatisering, klantportaal of extra betaalmethoden kunt toevoegen.",
      },
    ],
    related: related([
      { href: "/website-laten-maken", label: "Website laten maken" },
      { href: "/maatwerk-software", label: "Maatwerk software" },
    ]),
  },

  aiAutomatisering: {
    metaTitle: "AI automatisering voor bedrijven | VDB Digital",
    metaDescription:
      "AI automatisering voor mkb: minder handmatig werk, snellere opvolging en slimmere processen. VDB Digital bouwt praktische AI-workflows voor Nederlandse bedrijven.",
    title: "AI automatisering die echt tijd bespaart",
    description:
      "Geen futuristische demo's — maar praktische AI-workflows die repetitieve taken overnemen: aanvraagopvolging, afspraakplanning, e-mailrouting en dataverwerking.",
    problem: {
      title: "Handmatig werk remt groei",
      body: "Veel mkb-bedrijven besteden uren aan hetzelfde: leads beantwoorden, afspraken inplannen, offertes opvolgen. Dat kost tijd die beter aan klantwerk besteed kan worden.",
    },
    builds: {
      title: "Praktische AI-workflows",
      body: "Wij ontwerpen en bouwen automatiseringen die aansluiten op jouw bestaande processen — van formulier-trigger tot CRM-update, met menselijke controle waar dat nodig is.",
    },
    benefits: [
      "Minder handmatig werk bij aanvragen en opvolging",
      "Snellere reactietijd naar klanten",
      "Consistentere procesafhandeling",
      "Schaalbaar zonder extra personeel",
    ],
    features: [
      "Workflow-automatisering op triggers (formulier, e-mail, webhook)",
      "AI-gestuurde classificatie en routing",
      "Afspraak- en kalenderintegratie",
      "Notificaties via e-mail of WhatsApp",
      "Dashboard voor monitoring en overrides",
      "Integratie met bestaande tools waar mogelijk",
    ],
    process: [
      "Procesinventarisatie: wat kost nu tijd?",
      "Workflow-ontwerp en prioritering",
      "Bouwen, testen en finetunen",
      "Livegang met monitoring en documentatie",
    ],
    integrations: [
      "E-mail en kalender",
      "WhatsApp Business API",
      "Formulieren en CRM",
      "Webhooks en API's",
    ],
    security: [
      "Geen klantdata naar onnodige derden",
      "Menselijke goedkeuring bij gevoelige acties",
      "Logging en audittrail",
    ],
    whoFor: [
      "Bedrijven met veel herhaalbare administratie",
      "Teams die sneller willen reageren op leads",
      "Ondernemers die willen schalen zonder extra FTE",
    ],
    included: [
      "Workflow-ontwerp en implementatie",
      "Testen en documentatie",
      "Korte training voor jouw team",
    ],
    notIncluded: [
      "Volledige ERP-vervanging",
      "Gegarandeerde kostenbesparing zonder meting",
    ],
    extensions: [
      "AI-chatbot voor website",
      "WhatsApp-automatisering",
      "Klantportaal met geautomatiseerde statusupdates",
    ],
    faq: [
      {
        q: "Is AI automatisering geschikt voor kleine bedrijven?",
        a: "Ja, juist mkb-bedrijven profiteren van automatisering omdat elke uurbesparing direct merkbaar is. We starten klein en breiden uit waar het waarde oplevert.",
      },
      {
        q: "Vervangt dit mijn medewerkers?",
        a: "Nee. Automatisering neemt repetitief werk over, zodat jouw team zich kan richten op klantcontact en vakwerk.",
      },
    ],
    related: related([
      { href: "/ai-chatbot", label: "AI chatbot voor bedrijven" },
      { href: "/whatsapp-automatisering", label: "WhatsApp automatisering" },
      { href: "/maatwerk-software", label: "Maatwerk software" },
    ]),
  },

  aiChatbot: {
    metaTitle: "AI chatbot voor bedrijven | VDB Digital",
    metaDescription:
      "AI chatbot voor bedrijven: 24/7 vragen beantwoorden, leads kwalificeren en doorverbinden naar jouw team. VDB Digital bouwt chatbots die passen bij jouw bedrijf.",
    title: "AI chatbot die klanten én jouw team helpt",
    description:
      "Een AI-chatbot op je website beantwoordt veelgestelde vragen, verzamelt aanvraaggegevens en schakelt door naar een medewerker wanneer dat nodig is — zonder eindeloze wachtrijen.",
    problem: {
      title: "Klanten willen snel antwoord",
      body: "Bezoekers stellen vragen buiten kantooruren, via je website of socials. Zonder snelle reactie klikken ze door naar een concurrent die wél bereikbaar lijkt.",
    },
    builds: {
      title: "Chatbot op maat van jouw bedrijf",
      body: "Wij trainen de chatbot op jouw diensten, veelgestelde vragen en tone of voice. Met duidelijke escalatie naar WhatsApp, e-mail of livechat wanneer een mens nodig is.",
    },
    benefits: [
      "24/7 beschikbaarheid voor standaardvragen",
      "Meer gekwalificeerde leads via gestructureerde gesprekken",
      "Minder druk op telefoon en e-mail",
      "Consistente antwoorden op veelgestelde vragen",
    ],
    features: [
      "Website-chatwidget met merkstyling",
      "Kennisbank op basis van jouw content",
      "Lead capture en formulierintegratie",
      "Escalatie naar menselijke medewerker",
      "Gesprekslogging en analytics",
      "Meertalig indien gewenst",
    ],
    process: [
      "Inventarisatie veelgestelde vragen en doelen",
      "Kennisbank en conversatiestromen opzetten",
      "Integratie op website en testen",
      "Livegang met monitoring en bijsturing",
    ],
    integrations: ["Website", "WhatsApp", "E-mail", "CRM / formulieren"],
    security: [
      "Geen medische of juridische adviezen zonder disclaimer",
      "Privacybewuste dataopslag",
      "Menselijke review bij gevoelige onderwerpen",
    ],
    whoFor: [
      "Dienstverleners met veel standaardvragen",
      "Bedrijven die buiten kantooruren bereikbaar willen zijn",
      "Teams die leads willen kwalificeren vóór opvolging",
    ],
    included: [
      "Chatbot-setup en kennisbank",
      "Website-integratie",
      "Eerste maand monitoring en finetuning",
    ],
    notIncluded: [
      "Volledige klantenservice-vervanging",
      "Medische, juridische of financiële adviezen",
    ],
    extensions: [
      "WhatsApp AI-koppeling",
      "AI automatisering voor opvolging",
      "Livechat met menselijke agenten",
    ],
    faq: [
      {
        q: "Wat kan een AI-chatbot voor mijn bedrijf doen?",
        a: "Veelgestelde vragen beantwoorden, openingstijden en diensten uitleggen, aanvragen verzamelen, afspraken voorstellen en doorverbinden naar jouw team bij complexe vragen.",
      },
      {
        q: "Klinkt de chatbot als een robot?",
        a: "We stemmen tone of voice af op jouw merk — professioneel, vriendelijk en to-the-point. Geen overdreven AI-hype, wel nuttige antwoorden.",
      },
    ],
    related: related([
      { href: "/ai-automatisering", label: "AI automatisering" },
      { href: "/whatsapp-automatisering", label: "WhatsApp automatisering" },
      { href: "/website-laten-maken", label: "Website laten maken" },
    ]),
  },

  whatsappAutomatisering: {
    metaTitle: "WhatsApp automatisering voor bedrijven | VDB Digital",
    metaDescription:
      "WhatsApp automatisering voor mkb: snellere reacties, gestructureerde gesprekken en AI-ondersteuning. VDB Digital koppelt WhatsApp Business aan jouw processen.",
    title: "WhatsApp automatisering die opvolging versnelt",
    description:
      "Klanten appen — dat is duidelijk. Wij koppelen WhatsApp Business aan slimme automatisering: welkomstberichten, FAQ-antwoorden, lead capture en doorverbinden naar jouw team.",
    problem: {
      title: "WhatsApp zonder structuur wordt chaos",
      body: "Berichten stapelen zich op, medewerkers reageren dubbel of te laat, en belangrijke aanvragen raken kwijt in groepschats. Dat kost klanten en tijd.",
    },
    builds: {
      title: "WhatsApp Business AI met menselijke overdracht",
      body: "Automatische antwoorden op veelgestelde vragen, gestructureerde intake van aanvragen en naadloze overdracht naar een medewerker wanneer het gesprek dat vereist.",
    },
    benefits: [
      "Snellere eerste reactie op WhatsApp-berichten",
      "Gestroomlijnde intake van aanvragen en afspraken",
      "Minder gemiste berichten en dubbele opvolging",
      "Professionele uitstraling via WhatsApp Business",
    ],
    features: [
      "WhatsApp Business API-koppeling",
      "AI-gestuurde antwoorden op FAQ's",
      "Lead capture en CRM-koppeling",
      "Menselijke overdracht met context",
      "Buiten-kantooruren auto-reply",
      "Gesprekslogging en rapportage",
    ],
    process: [
      "WhatsApp Business-account en API-setup",
      "Conversatiestromen en FAQ's definiëren",
      "Integratie met website en CRM",
      "Testen, livegang en teamtraining",
    ],
    integrations: ["WhatsApp Business API", "Website chatwidget", "CRM", "Kalender"],
    security: [
      "End-to-end encryptie via WhatsApp",
      "Geen gevoelige data in auto-replies",
      "Toestemming en privacy conform AVG",
    ],
    whoFor: [
      "Bedrijven waar klanten veel via WhatsApp contact opnemen",
      "Teams die WhatsApp willen professionaliseren",
      "Ondernemers die 24/7 bereikbaar willen lijken",
    ],
    included: [
      "API-setup en conversatiestromen",
      "Integratie op website",
      "Documentatie en training",
    ],
    notIncluded: [
      "WhatsApp-abonnementskosten (Meta)",
      "Massa-marketing via WhatsApp zonder opt-in",
    ],
    extensions: [
      "AI-chatbot op website",
      "Volledige AI automatisering",
      "Reviewflows na afronding opdracht",
    ],
    faq: [
      {
        q: "WhatsApp automatiseren: hoe werkt dat?",
        a: "Via de WhatsApp Business API sturen we automatische antwoorden op triggers (bijv. buiten kantooruren), leiden we gesprekken via menu's en schakelen we door naar een medewerker bij complexe vragen.",
      },
      {
        q: "Is dit hetzelfde als WhatsApp Business op mijn telefoon?",
        a: "We bouwen op WhatsApp Business API — dat biedt meer schaalbaarheid, teamtoegang en integratiemogelijkheden dan de standaard app.",
      },
    ],
    related: related([
      { href: "/ai-chatbot", label: "AI chatbot" },
      { href: "/ai-automatisering", label: "AI automatisering" },
      { href: "/cases/whatsapp-automatisering", label: "Case: WhatsApp automatisering" },
    ]),
  },

  maatwerkSoftware: {
    metaTitle: "Maatwerk software voor bedrijven | VDB Digital",
    metaDescription:
      "Maatwerk software en bedrijfssoftware op maat. VDB Digital bouwt portalen, dashboards en interne tools die aansluiten op jouw werkwijze — geen generieke SaaS.",
    title: "Maatwerk software die past bij jouw bedrijf",
    description:
      "Standaard software dwingt jou om je processen aan te passen. Wij bouwen bedrijfssoftware die meebeweegt met hoe jij werkt — van interne dashboards tot klantportalen.",
    problem: {
      title: "Generieke tools passen niet altijd",
      body: "Excel-sheets, losse apps en workarounds stapelen zich op. Je team werkt dubbel, data staat verspreid en niemand heeft één overzicht van klanten, projecten of orders.",
    },
    builds: {
      title: "Software op maat van jouw processen",
      body: "Wij ontwerpen en bouwen webapplicaties, portalen en dashboards die precies doen wat jij nodig hebt — met beveiligde toegang, rollen en integraties waar relevant.",
    },
    benefits: [
      "Eén systeem in plaats van losse tools",
      "Processen die écht aansluiten op jouw werkwijze",
      "Schaalbaar en uitbreidbaar naarmate je groeit",
      "Volledige controle over data en functionaliteit",
    ],
    features: [
      "Webapplicaties en interne dashboards",
      "Klant- en partnerportalen",
      "Rolgebaseerde toegang en beveiliging",
      "API-integraties met bestaande systemen",
      "Rapportages en exportfuncties",
      "Mobiel-vriendelijke interfaces",
    ],
    process: [
      "Procesanalyse en requirements",
      "Architectuur en prototype",
      "Iteratieve bouw met feedback",
      "Testen, oplevering en documentatie",
    ],
    integrations: ["Mollie", "E-mail", "Webhooks", "Externe API's"],
    security: [
      "Authenticatie en autorisatie",
      "Row-level security waar van toepassing",
      "Audit logging",
      "HTTPS en beveiligingsheaders",
    ],
    whoFor: [
      "Bedrijven die uit Excel en losse apps willen groeien",
      "Organisaties met unieke processen",
      "Ondernemers die een klantportaal of partnerportaal nodig hebben",
    ],
    included: [
      "Requirements en architectuur",
      "Ontwikkeling en testen",
      "Oplevering en technische documentatie",
    ],
    notIncluded: [
      "Doorlopend onderhoud tenzij retainer afgesproken",
      "Migratie van legacy systemen zonder aparte scope",
    ],
    extensions: [
      "Klantportaal laten maken",
      "AI automatisering op processen",
      "Mobiele app (indien gewenst)",
    ],
    faq: [
      {
        q: "Wat kost maatwerk software?",
        a: "Dat hangt af van complexiteit, integraties en aantal gebruikers. Na een discovery-sessie geven wij een heldere inschatting met vaste scope.",
      },
      {
        q: "Hoe verschilt maatwerk van standaard SaaS?",
        a: "Maatwerk is gebouwd voor jouw processen. SaaS vraagt dat jij je aanpast aan het product. Wij kiezen maatwerk wanneer unieke workflows of integraties nodig zijn.",
      },
    ],
    related: related([
      { href: "/klantportaal-laten-maken", label: "Klantportaal laten maken" },
      { href: "/ai-automatisering", label: "AI automatisering" },
      { href: "/cases/vdb-digital-platform", label: "Case: VDB Digital platform" },
    ]),
  },

  klantportaalLatenMaken: {
    metaTitle: "Klantportaal laten maken | VDB Digital",
    metaDescription:
      "Klantportaal laten maken voor jouw bedrijf? VDB Digital bouwt beveiligde portalen waar klanten offertes, facturen, projectstatus en documenten inzien.",
    title: "Klantportaal dat jouw klanten én team ontlast",
    description:
      "Een klantportaal geeft jouw klanten 24/7 inzicht in offertes, facturen, projectvoortgang en documenten — en vermindert telefoon en e-mail over statusvragen.",
    problem: {
      title: "Klanten willen inzicht, jij wilt minder statusvragen",
      body: "Offertes per e-mail, facturen als PDF-bijlage, projectupdates via WhatsApp — het werkt, maar het schaalt niet. Klanten vragen steeds opnieuw naar dezelfde informatie.",
    },
    builds: {
      title: "Beveiligd klantportaal op maat",
      body: "Wij bouwen een portaal waar klanten veilig inloggen, offertes accepteren, facturen bekijken, documenten downloaden en projectstatus volgen — gekoppeld aan jouw backend.",
    },
    benefits: [
      "Minder statusvragen via telefoon en e-mail",
      "Professionele klantbeleving",
      "Snellere offerte-acceptatie en betaling",
      "Centraal overzicht voor jou en je klant",
    ],
    features: [
      "Veilige login voor klanten",
      "Offertes bekijken en accepteren",
      "Facturen en betalingsstatus",
      "Documenten en opleveringen downloaden",
      "Projectvoortgang en milestones",
      "Berichten en supporttickets",
    ],
    process: [
      "Inventarisatie klantreizen en data",
      "UX-ontwerp en beveiligingsmodel",
      "Bouwen en integratie met backend",
      "Testen, oplevering en klanttraining",
    ],
    integrations: ["Mollie (betalingen)", "E-mailnotificaties", "Documentopslag"],
    security: [
      "Multi-factor authenticatie opties",
      "Row-level security per klant",
      "Versleutelde opslag en transport",
      "Audit logging",
    ],
    whoFor: [
      "Dienstverleners met terugkerende klanten",
      "Bouw- en installatiebedrijven met projecten",
      "Bureau's die offertes en opleveringen digitaal willen delen",
    ],
    included: [
      "Portaal met afgesproken modules",
      "Klantlogin en beveiliging",
      "Integratie met jouw data",
    ],
    notIncluded: [
      "Volledige ERP-vervanging",
      "Boekhoudsoftware tenzij integratie afgesproken",
    ],
    extensions: [
      "Partnerportaal voor onderaannemers",
      "AI automatisering voor statusupdates",
      "Mobiele app",
    ],
    faq: [
      {
        q: "Wanneer heeft een bedrijf een klantportaal nodig?",
        a: "Als je regelmatig offertes, facturen, documenten of projectupdates deelt met klanten — en statusvragen je team much tijd kosten.",
      },
      {
        q: "Kunnen klanten ook betalen via het portaal?",
        a: "Ja, via Mollie-koppeling kunnen klanten facturen direct online betalen.",
      },
    ],
    related: related([
      { href: "/maatwerk-software", label: "Maatwerk software" },
      { href: "/website-laten-maken", label: "Website laten maken" },
    ]),
  },
};

export function getSeoLandingContent(key: SeoLandingPageKey): SeoLandingContent {
  return seoLandingPages[key];
}

/** Local page content overlays — unique per location. */
export function getSeoLocalContent(
  parentKey: SeoLandingPageKey,
  location: "hoeksche-waard" | "rotterdam",
): SeoLocalContent {
  const base = seoLandingPages[parentKey];
  const isWebsite = parentKey === "websiteLatenMaken";

  const locations: Record<
    "hoeksche-waard" | "rotterdam",
    { label: string; context: string; metaSuffix: string }
  > = {
    "hoeksche-waard": {
      label: "Hoeksche Waard",
      context:
        "VDB Digital bedient ondernemers in de Hoeksche Waard en Zuid-Holland. Wij kennen de lokale markt van mkb-bedrijven, bouw, installatie en dienstverlening in de regio — zonder te doen alsof we een fysiek kantoor op elke hoek hebben.",
      metaSuffix: "Hoeksche Waard",
    },
    rotterdam: {
      label: "Rotterdam",
      context:
        "Rotterdam is een dynamische markt met veel ambitieuze mkb-bedrijven. VDB Digital helpt Rotterdamse ondernemers met professionele websites, webdesign en digitale systemen — met persoonlijke afstemming en heldere communicatie.",
      metaSuffix: "Rotterdam",
    },
  };

  const loc = locations[location];
  const serviceLabel = isWebsite ? "Website laten maken" : "Webdesign";

  return {
    ...base,
    locationLabel: loc.label,
    regionContext: loc.context,
    metaTitle: `${serviceLabel} ${loc.metaSuffix} | VDB Digital`,
    metaDescription: isWebsite
      ? `Website laten maken in ${loc.label}? VDB Digital bouwt professionele bedrijfswebsites voor ondernemers in ${loc.label} en omgeving — snel, conversiegericht en op maat.`
      : `Webdesign bureau in ${loc.label}? VDB Digital ontwerpt premium bedrijfswebsites voor mkb in ${loc.label} en regio — helder, mobiel-first en gericht op aanvragen.`,
    title: isWebsite
      ? `Professionele website laten maken in ${loc.label}`
      : `Webdesign voor bedrijven in ${loc.label}`,
    description: `${loc.context} ${base.description}`,
    faq: [
      ...(base.faq ?? []),
      {
        q: `Werken jullie met bedrijven in ${loc.label}?`,
        a: `Ja. Wij werken met ondernemers in ${loc.label} en omliggende regio's. Kennismaking en projectafstemming verlopen online en waar nodig op locatie — zonder fysiek kantoor in elke stad.`,
      },
    ],
    related: [
      ...(base.related ?? []),
      {
        href: isWebsite ? `/webdesign/${location}` : `/website-laten-maken/${location}`,
        label: isWebsite
          ? `Webdesign ${loc.label}`
          : `Website laten maken ${loc.label}`,
      },
    ],
  };
}
