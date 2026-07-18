export type ProductCopy = {
  name: string;
  shortDescription: string;
  fullDescription: string;
  categoryName: string;
  deliveryTime: string;
  includedItems: string[];
  excludedItems: string[];
  extensions: string[];
  requiredInput: string[];
  targetAudience: string;
  workflow: string;
  faqs: { question: string; answer: string; sortOrder: number }[];
  seoTitle: string;
  seoDescription: string;
};

export const productsNl: Record<string, ProductCopy> = {
  "starter-website": {
    name: "Starter Website",
    shortDescription:
      "Een professionele website voor bedrijven die snel online willen met een solide basis.",
    fullDescription:
      "De Starter Website is ideaal als je een betrouwbare online aanwezigheid nodig hebt, zonder onnodige complexiteit. We bouwen een conversiegerichte website met een duidelijke structuur, mobiele optimalisatie en een stevige technische basis.",
    categoryName: "Websites",
    deliveryTime: "2–3 weken",
    includedItems: [
      "Tot 5 pagina's",
      "Responsive design",
      "Contactformulier",
      "Basis-SEO",
      "SSL-certificaat",
    ],
    excludedItems: ["Webshop", "Maatwerkintegraties", "Copywriting"],
    extensions: ["Extra pagina's", "Blogmodule", "Meertalige opzet"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [
      {
        question: "Kan ik later uitbreiden?",
        answer:
          "Ja — de website is gebouwd om mee te groeien naar een groter platform of webshop.",
        sortOrder: 1,
      },
    ],
    seoTitle: "Starter Website | VDB Digital",
    seoDescription:
      "Een professionele website voor bedrijven die snel online willen met een solide basis.",
  },

  "business-website": {
    name: "Business Website",
    shortDescription:
      "Uitgebreide bedrijfswebsite met meer pagina's, integraties en conversie-optimalisatie.",
    fullDescription:
      "De Business Website is ontworpen voor groeiende bedrijven die meer nodig hebben dan een digitaal visitekaartje. Meer pagina's, geavanceerde formulieren, integraties en een sterke focus op conversie.",
    categoryName: "Websites",
    deliveryTime: "3–5 weken",
    includedItems: [
      "Tot 12 pagina's",
      "Geavanceerde formulieren",
      "Analytics-integratie",
      "Conversie-optimalisatie",
      "Training",
    ],
    excludedItems: ["Webshop", "Volledige copywriting"],
    extensions: ["CRM-integratie", "Lead nurturing", "A/B-testen"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "Business Website | VDB Digital",
    seoDescription:
      "Uitgebreide bedrijfswebsite met meer pagina's, integraties en conversie-optimalisatie.",
  },

  "premium-website": {
    name: "Premium Website",
    shortDescription:
      "Premium bedrijfswebsite met maatwerkdesign, geavanceerde functionaliteit en strategische begeleiding.",
    fullDescription:
      "Voor bedrijven die maximale online impact willen. Premium design, custom componenten, geavanceerde animaties en strategische begeleiding van concept tot lancering.",
    categoryName: "Websites",
    deliveryTime: "5–8 weken",
    includedItems: [
      "Maatwerkdesign",
      "Onbeperkt aantal pagina's",
      "Geavanceerde animaties",
      "Strategische sessies",
      "Premium support",
    ],
    excludedItems: ["Doorlopend advertentiebeheer"],
    extensions: ["Marketingautomatisering", "Personalisatie"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "Premium Website | VDB Digital",
    seoDescription:
      "Premium bedrijfswebsite met maatwerkdesign, geavanceerde functionaliteit en strategische begeleiding.",
  },

  "conversiegerichte-landingspagina": {
    name: "Conversiegerichte landingspagina",
    shortDescription:
      "Eén krachtige pagina gericht op leads, aanvragen of campagnes.",
    fullDescription:
      "Een gerichte landingspagina die bezoekers omzet in leads. Ideaal voor campagnes, productlanceringen of specifieke diensten.",
    categoryName: "Websites",
    deliveryTime: "1–2 weken",
    includedItems: [
      "Conversiegericht design",
      "Formulier of CTA-flow",
      "Mobiele optimalisatie",
      "Basis tracking",
    ],
    excludedItems: ["Meerdere pagina's", "CMS"],
    extensions: ["A/B-variant", "Advertentieplatform-integratie"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "Conversiegerichte landingspagina | VDB Digital",
    seoDescription:
      "Eén krachtige pagina gericht op leads, aanvragen of campagnes.",
  },

  "complete-webshop": {
    name: "Complete webshop",
    shortDescription:
      "Volledige webshop met productbeheer, betalingen en orderflow.",
    fullDescription:
      "Een professionele webshop die vertrouwen uitstraalt. Productcatalogus, winkelwagen, checkout, Mollie-betalingen en een beheeromgeving voor dagelijks gebruik.",
    categoryName: "Webshops",
    deliveryTime: "6–10 weken",
    includedItems: [
      "Productcatalogus",
      "Winkelwagen & checkout",
      "Mollie-integratie",
      "Orderbeheer",
      "Responsive design",
    ],
    excludedItems: ["ERP-voorraadsynchronisatie", "Marketplace-functionaliteit"],
    extensions: ["Abonnementen", "Groothandel", "ERP-integratie"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "Complete webshop | VDB Digital",
    seoDescription:
      "Volledige webshop met productbeheer, betalingen en orderflow.",
  },

  "website-redesign": {
    name: "Website redesign",
    shortDescription:
      "Moderniseer je bestaande website met betere UX, snelheid en conversie.",
    fullDescription:
      "We analyseren je huidige website, brengen verbeterpunten in kaart en leveren een redesign dat past bij jouw merk en doelen.",
    categoryName: "Websites",
    deliveryTime: "3–6 weken",
    includedItems: [
      "UX-analyse",
      "Nieuw design",
      "Technische migratie",
      "Prestatie-optimalisatie",
    ],
    excludedItems: ["Nieuwe functionaliteit buiten scope"],
    extensions: ["Extra pagina's", "Nieuwe integraties"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "Website redesign | VDB Digital",
    seoDescription:
      "Moderniseer je bestaande website met betere UX, snelheid en conversie.",
  },

  "whatsapp-ai-starter": {
    name: "WhatsApp AI Starter",
    shortDescription:
      "Geautomatiseerde WhatsApp-antwoorden voor FAQ's en leadcapture.",
    fullDescription:
      "Laat WhatsApp voor je werken. Automatische antwoorden op veelgestelde vragen, leadcapture buiten kantooruren en overdracht naar een teamlid wanneer nodig.",
    categoryName: "WhatsApp-oplossingen",
    deliveryTime: "1–2 weken",
    includedItems: [
      "WhatsApp Business-koppeling",
      "Basis AI-antwoorden",
      "FAQ-instelling",
      "Leadnotificaties",
    ],
    excludedItems: ["Complexe workflows", "CRM-integratie"],
    extensions: ["CRM-integratie", "Afspraakplanning"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "WhatsApp AI Starter | VDB Digital",
    seoDescription:
      "Geautomatiseerde WhatsApp-antwoorden voor FAQ's en leadcapture.",
  },

  "whatsapp-ai-business": {
    name: "WhatsApp AI Business",
    shortDescription:
      "Geavanceerde WhatsApp-automatisering met workflows, planning en opvolging.",
    fullDescription:
      "Volledige WhatsApp Business AI-oplossing met geavanceerde workflows, afspraakplanning, lead scoring en integratie met je bestaande systemen.",
    categoryName: "WhatsApp-oplossingen",
    deliveryTime: "2–4 weken",
    includedItems: [
      "Geavanceerde AI-workflows",
      "Afspraakplanning",
      "Lead scoring",
      "Rapportage",
      "Maandelijkse optimalisatie",
    ],
    excludedItems: ["Custom AI-training op eigen data"],
    extensions: ["Custom training", "Multichannel"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "WhatsApp AI Business | VDB Digital",
    seoDescription:
      "Geavanceerde WhatsApp-automatisering met workflows, planning en opvolging.",
  },

  "reviewflow-setup": {
    name: "Reviewflow-setup",
    shortDescription:
      "Geautomatiseerde review- en feedbackflows na afspraken of aankopen.",
    fullDescription:
      "Verzamel reviews op het juiste moment. Automatische uitnodigingen na afspraken, leveringen of dienstverlening — volledig geconfigureerd en getest.",
    categoryName: "Reviewflows",
    deliveryTime: "1–2 weken",
    includedItems: [
      "Flow-ontwerp",
      "E-mail/WhatsApp-triggers",
      "Reviewplatform-integratie",
      "Testen & overdracht",
    ],
    excludedItems: ["Review-advertentiebeheer"],
    extensions: ["Multi-locatie-opzet", "Dashboardrapportage"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "Reviewflow-setup | VDB Digital",
    seoDescription:
      "Geautomatiseerde review- en feedbackflows na afspraken of aankopen.",
  },

  "afsprakenautomatisering": {
    name: "Afsprakenautomatisering",
    shortDescription:
      "Plan, bevestig en herinner aan afspraken online — automatisch.",
    fullDescription:
      "Laat klanten online afspraken inplannen. Automatische bevestigingen, herinneringen en agendasynchronisatie.",
    categoryName: "AI & automatisering",
    deliveryTime: "2–3 weken",
    includedItems: [
      "Boekingssysteem",
      "Agenda-sync",
      "Automatische herinneringen",
      "Bevestigingsmails",
    ],
    excludedItems: ["Complexe resourceplanning"],
    extensions: ["WhatsApp-herinneringen", "Betaling bij boeking"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "Afsprakenautomatisering | VDB Digital",
    seoDescription:
      "Plan, bevestig en herinner aan afspraken online — automatisch.",
  },

  "maandelijks-websitebeheer": {
    name: "Maandelijks websitebeheer",
    shortDescription:
      "Doorlopend beheer, updates en kleine wijzigingen voor je website.",
    fullDescription:
      "Focus op je bedrijf — wij zorgen voor je website. Maandelijkse updates, beveiligingspatches, kleine contentwijzigingen en prestatiemonitoring.",
    categoryName: "Onderhoud",
    deliveryTime: "Direct actief na overeenkomst",
    includedItems: [
      "Maandelijkse updates",
      "Beveiligingsmonitoring",
      "Kleine contentwijzigingen",
      "Backupcontroles",
      "Maandrapport",
    ],
    excludedItems: ["Grote redesigns", "Nieuwe features"],
    extensions: ["Extra wijzigingsuren", "Priority support"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "Maandelijks websitebeheer | VDB Digital",
    seoDescription:
      "Doorlopend beheer, updates en kleine wijzigingen voor je website.",
  },

  "technisch-onderhoud": {
    name: "Technisch onderhoud",
    shortDescription:
      "Technisch onderhoud, monitoring en incidentafhandeling voor bestaande systemen.",
    fullDescription:
      "Proactief technisch onderhoud voor websites, webshops en integraties. Monitoring, patches, incidentafhandeling en technische optimalisatie.",
    categoryName: "Onderhoud",
    deliveryTime: "Direct actief na overeenkomst",
    includedItems: [
      "Uptime-monitoring",
      "Beveiligingspatches",
      "Prestatiecontroles",
      "Incidentafhandeling",
    ],
    excludedItems: ["Feature-ontwikkeling"],
    extensions: ["SLA-upgrade", "24/7-monitoring"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "Technisch onderhoud | VDB Digital",
    seoDescription:
      "Technisch onderhoud, monitoring en incidentafhandeling voor bestaande systemen.",
  },

  "conversie-audit": {
    name: "Conversie-audit",
    shortDescription:
      "Diepgaande analyse van je website of webshop met concrete aanbevelingen.",
    fullDescription:
      "We analyseren je website of webshop op conversie, UX, snelheid en technische kwaliteit. Je ontvangt een rapport met geprioriteerde verbeterpunten.",
    categoryName: "Support",
    deliveryTime: "1–2 weken",
    includedItems: [
      "UX-analyse",
      "Conversie-analyse",
      "Technische scan",
      "Prioriteitenlijst",
      "Presentatie",
    ],
    excludedItems: ["Implementatie van verbeteringen"],
    extensions: ["Implementatiepakket", "Vervolgsessie"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "Conversie-audit | VDB Digital",
    seoDescription:
      "Diepgaande analyse van je website of webshop met concrete aanbevelingen.",
  },

  "supporturen-bundel": {
    name: "Supporturen-bundel",
    shortDescription:
      "Flexibele bundel supporturen voor wijzigingen, hulp en optimalisatie.",
    fullDescription:
      "Een bundel supporturen die je inzet wanneer je ze nodig hebt. Voor contentwijzigingen, technische hulp, kleine aanpassingen of advies.",
    categoryName: "Support",
    deliveryTime: "Direct beschikbaar",
    includedItems: [
      "10 supporturen",
      "6 maanden geldig",
      "Prioriteit boven ad-hocverzoeken",
      "Ticketsysteem",
    ],
    excludedItems: ["Nieuwe feature-ontwikkeling"],
    extensions: ["Extra urenbundel"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "Supporturen-bundel | VDB Digital",
    seoDescription:
      "Flexibele bundel supporturen voor wijzigingen, hulp en optimalisatie.",
  },

  "maatwerk-digitalisering": {
    name: "Maatwerk digitalisering",
    shortDescription:
      "Volledig maatwerk digitaliseringsoplossing voor unieke bedrijfsprocessen.",
    fullDescription:
      "Wanneer standaardoplossingen niet volstaan, bouwen we maatwerk. Van interne portalen tot complexe integraties — volledig afgestemd op jouw processen.",
    categoryName: "Maatwerk",
    deliveryTime: "In overleg",
    includedItems: [
      "Intake & analyse",
      "Technisch ontwerp",
      "Bouw",
      "Testen & overdracht",
      "Documentatie",
    ],
    excludedItems: ["Scope buiten overeenkomst"],
    extensions: ["Doorlopend onderhoud", "Training"],
    requiredInput: ["Bedrijfsnaam", "Doelgroep", "Gewenste functionaliteit"],
    targetAudience: "MKB-bedrijven die professioneel online willen groeien.",
    workflow: "Intake → ontwerp → bouw → oplevering → nazorg.",
    faqs: [],
    seoTitle: "Maatwerk digitalisering | VDB Digital",
    seoDescription:
      "Volledig maatwerk digitaliseringsoplossing voor unieke bedrijfsprocessen.",
  },
};
