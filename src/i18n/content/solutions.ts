import type { Locale } from "../config";
import { paths } from "../config";

export type SolutionContent = {
  metaTitle: string;
  metaDescription: string;
  title: string;
  description: string;
  problem: { title: string; body: string };
  builds: { title: string; body: string };
  benefits: string[];
  features: string[];
  process: string[];
  integrations: string[];
  security: string[];
  whoFor: string[];
  included: string[];
  notIncluded: string[];
  extensions: string[];
  faq: Array<{ q: string; a: string }>;
  related: Array<{ href: string; label: string }>;
};

export type BilingualSolutionContent = Record<Locale, SolutionContent>;

export const solutionsContent = {
  overview: {
    en: {
      metaTitle: "Solutions",
      metaDescription:
        "Custom websites, online stores, AI automation, WhatsApp AI, live chat, review flows and ongoing support from VDB Digital Software.",
      title: "Digital solutions built around your business",
      description:
        "VDB Digital Software designs and delivers the systems your company actually uses day to day — from custom websites and stores to automation, messaging and maintenance.",
      problem: {
        title: "Scattered tools slow growth",
        body: "Many businesses juggle a website here, a chatbot there and manual follow-up everywhere else. That creates friction for customers and extra work for your team.",
      },
      builds: {
        title: "One partner, connected delivery",
        body: "We build and connect the pieces that matter: websites, commerce, AI-assisted workflows and support layers — with clear scope and room to extend later.",
      },
      benefits: [
        "A coherent stack instead of disconnected point tools",
        "Premium design with a solid technical foundation",
        "Server-side validation and privacy-aware setup as standard",
        "Room to add automation and messaging when you are ready",
      ],
      features: [
        "Custom websites and landing pages",
        "Online stores with Mollie payments",
        "AI automation and appointment flows",
        "WhatsApp Business AI with human handover",
        "Live chat and review invitation flows",
        "Maintenance, support and conversion improvements",
      ],
      process: [
        "Discovery and scope",
        "Design and build",
        "Launch and handover",
        "Optional ongoing care",
      ],
      integrations: [
        "Mollie",
        "WhatsApp Business API",
        "Live chat provider (your choice)",
        "Email and calendar tools where relevant",
      ],
      security: [
        "Server-side input and price validation where applicable",
        "Privacy-conscious cookie and consent wiring",
        "Least-privilege access for admin and integrations",
      ],
      whoFor: [
        "Growing SMEs that want one digital partner",
        "Teams ready to replace scattered DIY tools",
        "Businesses planning store, automation or messaging next",
      ],
      included: [
        "Clear proposal with scoped deliverables",
        "Implementation aligned to your selected solution(s)",
        "Documentation and handover notes",
      ],
      notIncluded: [
        "Paid advertising management",
        "Guaranteed search rankings or revenue outcomes",
        "Unlimited redesign or content production",
      ],
      extensions: [
        "Add a store, WhatsApp AI or automation later",
        "Maintenance and technical support retainers",
        "Conversion optimisation sprints",
      ],
      faq: [
        {
          q: "Can we start with one solution and expand?",
          a: "Yes. Most clients begin with a website or store, then add automation, messaging or maintenance once the foundation is live.",
        },
        {
          q: "Do you manage ads or SEO campaigns?",
          a: "No. We build conversion-ready experiences and technical SEO foundations, but we do not run paid ad accounts or guarantee rankings.",
        },
      ],
      related: [
        { href: paths.websites, label: "Custom websites" },
        { href: paths.webshops, label: "Online stores" },
        { href: paths.aiAutomation, label: "AI automation" },
        { href: paths.whatsappAi, label: "WhatsApp AI" },
        { href: paths.customSoftware, label: "Custom software" },
        { href: paths.websiteMaintenance, label: "Website maintenance" },
      ],
    },
    nl: {
      metaTitle: "Oplossingen",
      metaDescription:
        "Maatwerkwebsites, webshops, AI-automatisering, WhatsApp AI, livechat, reviewflows en doorlopende support van VDB Digital Software.",
      title: "Digitale oplossingen rond jouw bedrijf",
      description:
        "VDB Digital Software ontwerpt en levert de systemen die je dagelijks gebruikt — van maatwerkwebsites en webshops tot automatisering, messaging en onderhoud.",
      problem: {
        title: "Losse tools remmen groei",
        body: "Veel bedrijven combineren een website hier, een chatbot daar en handmatige opvolging overal. Dat levert wrijving op voor klanten en extra werk voor jouw team.",
      },
      builds: {
        title: "Eén partner, samenhangende oplevering",
        body: "Wij bouwen en koppelen wat ertoe doet: websites, commerce, AI-ondersteunde workflows en supportlagen — met heldere scope en ruimte om later uit te breiden.",
      },
      benefits: [
        "Een samenhangende stack in plaats van losse tools",
        "Premium design met een solide technische basis",
        "Server-side validatie en privacybewuste setup als standaard",
        "Ruimte voor automatisering en messaging wanneer jij er klaar voor bent",
      ],
      features: [
        "Maatwerkwebsites en landingspagina's",
        "Webshops met Mollie-betalingen",
        "AI-automatisering en afspraakenflows",
        "WhatsApp Business AI met menselijke overdracht",
        "Livechat en review-uitnodigingsflows",
        "Onderhoud, support en conversieverbeteringen",
      ],
      process: [
        "Discovery en scope",
        "Ontwerp en bouw",
        "Livegang en overdracht",
        "Optionele doorlopende zorg",
      ],
      integrations: [
        "Mollie",
        "WhatsApp Business API",
        "Live chat provider (your choice)",
        "E-mail- en kalendertools waar relevant",
      ],
      security: [
        "Server-side input- en prijsvalidatie waar van toepassing",
        "Privacybewuste cookie- en toestemmingskoppeling",
        "Least-privilege toegang voor admin en integraties",
      ],
      whoFor: [
        "Groeiende mkb-bedrijven die één digitale partner willen",
        "Teams die losse DIY-tools willen vervangen",
        "Bedrijven die webshop, automatisering of messaging plannen",
      ],
      included: [
        "Duidelijk voorstel met afgebakende deliverables",
        "Implementatie afgestemd op jouw gekozen oplossing(en)",
        "Documentatie en overdrachtsnotities",
      ],
      notIncluded: [
        "Beheer van betaalde advertenties",
        "Gegarandeerde zoekranglijsten of omzetresultaten",
        "Onbeperkte redesigns of contentproductie",
      ],
      extensions: [
        "Later een webshop, WhatsApp AI of automatisering toevoegen",
        "Onderhouds- en supportretainer",
        "Conversie-optimalisatie sprints",
      ],
      faq: [
        {
          q: "Kunnen we met één oplossing starten en later uitbreiden?",
          a: "Ja. De meeste klanten beginnen met een website of webshop en voegen daarna automatisering, messaging of onderhoud toe.",
        },
        {
          q: "Beheren jullie ads of SEO-campagnes?",
          a: "Nee. Wij bouwen conversiegerichte ervaringen en technische SEO-fundamenten, maar beheren geen ad-accounts en garanderen geen rankings.",
        },
      ],
      related: [
        { href: paths.websites, label: "Maatwerkwebsites" },
        { href: paths.webshops, label: "Webshops" },
        { href: paths.aiAutomation, label: "AI-automatisering" },
        { href: paths.whatsappAi, label: "WhatsApp AI" },
        { href: paths.customSoftware, label: "Maatwerksoftware" },
        { href: paths.websiteMaintenance, label: "Websiteonderhoud" },
      ],
    },
  },

  websites: {
    en: {
      metaTitle: "Custom Websites",
      metaDescription:
        "Custom business websites and landing pages that build trust, load fast and turn visitors into clear next steps.",
      title: "Custom websites",
      description:
        "We design and build websites that represent your brand with confidence — structured for clarity, accessibility and conversion, without a generic template look.",
      problem: {
        title: "A weak site costs trust before the first call",
        body: "Outdated templates, slow pages and vague calls to action make serious buyers hesitate. Your site should answer questions and make the next step obvious.",
      },
      builds: {
        title: "What we deliver",
        body: "A custom, responsive website with conversion-minded page structure, contact or quote forms, core technical SEO and a foundation you can extend into a store or automation later.",
      },
      benefits: [
        "A professional presence that matches how you operate offline",
        "Clearer enquiry paths through focused CTAs and forms",
        "Faster, accessible pages built for real devices",
        "A technical base ready for commerce or messaging add-ons",
      ],
      features: [
        "Responsive layouts for phone, tablet and desktop",
        "Conversion-focused information architecture",
        "Contact and quote forms with server-side validation",
        "Core on-page SEO foundations (titles, structure, meta)",
        "Performance-minded implementation",
        "WCAG 2.2 AA accessibility considerations",
      ],
      process: [
        "Discovery workshop and sitemap",
        "Visual direction and key page designs",
        "Build, content placement and form wiring",
        "QA, launch and short handover",
      ],
      integrations: [
        "Analytics with consent when you approve",
        "CRM or email notifications for form leads",
        "Optional live chat or WhatsApp entry points",
        "Hosting and domain setup coordination",
      ],
      security: [
        "Input validation and spam-resistant forms",
        "Secure transport (HTTPS) and sensible headers",
        "No secrets exposed in client code",
        "Privacy-aware cookie consent integration",
      ],
      whoFor: [
        "Service businesses that need a credible first impression",
        "Teams replacing a dated WordPress or DIY site",
        "Companies preparing a future store or lead automation",
      ],
      included: [
        "Agreed set of pages and components",
        "Responsive implementation and form setup",
        "Basic SEO setup and accessibility pass",
        "Launch support and usage notes",
      ],
      notIncluded: [
        "Ongoing content writing unless scoped",
        "Paid search or social ad management",
        "Guaranteed ranking or lead-volume promises",
        "Unlimited redesign rounds after sign-off",
      ],
      extensions: [
        "Online store or booking flows",
        "WhatsApp AI or live chat",
        "Website maintenance retainer",
        "Conversion optimisation sprint",
      ],
      faq: [
        {
          q: "Do you use off-the-shelf themes?",
          a: "No. We build custom layouts suited to your brand and offers — not a stock template with a logo swap.",
        },
        {
          q: "Will my site be ready for a store later?",
          a: "Yes. We keep architecture extendable so commerce, forms automation or messaging can be added without starting over.",
        },
        {
          q: "How do you handle SEO?",
          a: "We implement technical and on-page foundations. We do not promise rankings or run ongoing SEO campaigns unless separately scoped as content work.",
        },
      ],
      related: [
        { href: paths.webshops, label: "Online stores" },
        { href: paths.conversionOptimisation, label: "Conversion optimisation" },
        { href: paths.websiteMaintenance, label: "Website maintenance" },
        { href: paths.whatsappAi, label: "WhatsApp AI" },
      ],
    },
    nl: {
      metaTitle: "Maatwerkwebsites",
      metaDescription:
        "Maatwerk bedrijfswebsites en landingspagina's die vertrouwen wekken, snel laden en bezoekers naar een duidelijke vervolgstap leiden.",
      title: "Maatwerkwebsites",
      description:
        "Wij ontwerpen en bouwen websites die jouw merk stevig neerzetten — helder van structuur, toegankelijk en conversiegericht, zonder generieke template-look.",
      problem: {
        title: "Een zwakke site kost vertrouwen vóór het eerste gesprek",
        body: "Verouderde templates, trage pagina's en vage call-to-actions laten serieuze kopers twijfelen. Jouw site moet vragen beantwoorden en de volgende stap duidelijk maken.",
      },
      builds: {
        title: "Wat wij opleveren",
        body: "Een maatwerk, responsive website met conversiegerichte pagina-opbouw, contact- of offerteformulieren, technische SEO-basis en een fundament dat je later kunt uitbreiden naar webshop of automatisering.",
      },
      benefits: [
        "Een professionele uitstraling die past bij hoe je offline werkt",
        "Duidelijkere aanvraagpaden via gerichte CTA's en formulieren",
        "Snellere, toegankelijke pagina's voor echte apparaten",
        "Technische basis klaar voor commerce of messaging",
      ],
      features: [
        "Responsive layouts voor telefoon, tablet en desktop",
        "Conversiegerichte informatiearchitectuur",
        "Contact- en offerteformulieren met server-side validatie",
        "Basis on-page SEO (titels, structuur, meta)",
        "Performancegericht gebouwd",
        "Toegankelijkheid volgens WCAG 2.2 AA-uitgangspunten",
      ],
      process: [
        "Discovery en sitemap",
        "Visuele richting en kernpagina's",
        "Bouw, contentplaatsing en formulieren",
        "QA, livegang en korte overdracht",
      ],
      integrations: [
        "Analytics met toestemming wanneer jij dat wilt",
        "CRM of e-mailnotificaties voor leads",
        "Optionele livechat of WhatsApp-instappen",
        "Afstemming over hosting en domein",
      ],
      security: [
        "Inputvalidatie en spamresistente formulieren",
        "Veilig transport (HTTPS) en verstandige headers",
        "Geen secrets in clientcode",
        "Privacybewuste cookietoestemming",
      ],
      whoFor: [
        "Dienstverleners die een geloofwaardige eerste indruk nodig hebben",
        "Teams die een gedateerde WordPress- of DIY-site vervangen",
        "Bedrijven die later een webshop of leadautomatisering plannen",
      ],
      included: [
        "Afgesproken set pagina's en componenten",
        "Responsive implementatie en formulierinrichting",
        "Basis SEO-setup en toegankelijkheidspas",
        "Livegangsondersteuning en gebruikersnotities",
      ],
      notIncluded: [
        "Doorlopende contentproductie tenzij gescoped",
        "Beheer van betaalde search of social ads",
        "Gegarandeerde rankings of leadvolumes",
        "Onbeperkte redesignrondes na goedkeuring",
      ],
      extensions: [
        "Webshop of boekingsflows",
        "WhatsApp AI of livechat",
        "Websiteonderhoudsretainer",
        "Conversie-optimalisatie sprint",
      ],
      faq: [
        {
          q: "Werken jullie met kant-en-klare thema's?",
          a: "Nee. Wij bouwen maatwerk layouts die passen bij jouw merk en aanbod — geen standaardtemplate met logo-swap.",
        },
        {
          q: "Is mijn site later klaar voor een webshop?",
          a: "Ja. We houden de architectuur uitbreidbaar zodat commerce, formflows of messaging erbij kunnen zonder opnieuw te beginnen.",
        },
        {
          q: "Hoe gaan jullie om met SEO?",
          a: "Wij leggen technische en on-page fundamenten. We beloven geen rankings en runnen geen doorlopende SEO-campagnes tenzij apart als contentwerk gescoped.",
        },
      ],
      related: [
        { href: paths.webshops, label: "Webshops" },
        { href: paths.conversionOptimisation, label: "Conversie-optimalisatie" },
        { href: paths.websiteMaintenance, label: "Websiteonderhoud" },
        { href: paths.whatsappAi, label: "WhatsApp AI" },
      ],
    },
  },

  webshops: {
    en: {
      metaTitle: "Online Stores",
      metaDescription:
        "Professional online stores with catalogue, cart, Mollie Hosted Checkout and order flows — built for trust and day-to-day operations.",
      title: "Professional online stores",
      description:
        "Sell with a store that feels like your brand: product catalogue, cart, secure Mollie checkout and the admin essentials your team needs to run orders.",
      problem: {
        title: "Commerce bolted onto a brochure site rarely feels premium",
        body: "Buyers expect clear products, honest pricing, smooth checkout and dependable confirmations. Fragile plugins and unclear stock status create abandoned carts and support noise.",
      },
      builds: {
        title: "A store you can operate",
        body: "We implement catalogue structure, cart and checkout, Mollie Hosted Checkout so card details never touch your server, plus order notifications and a practical admin panel for daily management.",
      },
      benefits: [
        "Checkout that looks and feels like a brand experience",
        "Prices validated server-side before payment",
        "Payments via Mollie without storing card data on your stack",
        "A path to subscriptions or deeper integrations later",
      ],
      features: [
        "Product catalogue with categories and variants as scoped",
        "Shopping cart and checkout UX",
        "Mollie Hosted Checkout integration",
        "Order management and customer notifications",
        "Responsive storefront",
        "Admin panel for catalogue and orders",
      ],
      process: [
        "Product and checkout requirements mapping",
        "Store UX and brand-aligned design",
        "Build catalogue, cart, Mollie and notifications",
        "Test payments, go live and train your team",
      ],
      integrations: [
        "Mollie payment methods available on your account",
        "Transactional email for order updates",
        "Optional inventory or ERP hooks when scoped",
        "Analytics with consent",
      ],
      security: [
        "Server-side price and stock validation before charge",
        "No card data stored on your application server",
        "Signed payment webhook handling",
        "Role-aware admin access for store management",
      ],
      whoFor: [
        "Brands moving from marketplace-only sales",
        "Service businesses adding product lines",
        "Companies that outgrew lightweight DIY shop plugins",
      ],
      included: [
        "Scoped catalogue and checkout implementation",
        "Mollie Hosted Checkout wiring",
        "Order notification flows as agreed",
        "Admin handbook for day-to-day tasks",
      ],
      notIncluded: [
        "Product photography or copywriting unless scoped",
        "Marketplace listing management",
        "Paid advertising or influencer campaigns",
        "Guaranteed sales or conversion rates",
      ],
      extensions: [
        "Subscriptions or recurring billing patterns",
        "WhatsApp order updates or support",
        "Custom fulfilment or warehouse integrations",
        "Conversion optimisation on product and checkout pages",
      ],
      faq: [
        {
          q: "Why Mollie Hosted Checkout?",
          a: "It keeps sensitive payment data with Mollie and reduces your PCI scope while giving customers familiar Dutch and EU payment methods.",
        },
        {
          q: "Can prices be manipulated in the browser?",
          a: "No. Final amounts are recalculated and validated on the server before creating a payment.",
        },
        {
          q: "Do you handle shipping logistics?",
          a: "We can wire shipping options and labels into the flow when scoped. Physical logistics remain your operational responsibility unless separately contracted.",
        },
      ],
      related: [
        { href: paths.websites, label: "Custom websites" },
        { href: paths.aiAutomation, label: "AI automation" },
        { href: paths.technicalSupport, label: "Technical support" },
        { href: paths.conversionOptimisation, label: "Conversion optimisation" },
      ],
    },
    nl: {
      metaTitle: "Webshops",
      metaDescription:
        "Professionele webshops met catalogus, winkelwagen, Mollie Hosted Checkout en orderflows — gebouwd voor vertrouwen en dagelijkse operatie.",
      title: "Professionele webshops",
      description:
        "Verkoop met een webshop die aanvoelt als jouw merk: productcatalogus, winkelwagen, veilige Mollie-checkout en de admin-essentials die jouw team nodig heeft.",
      problem: {
        title: "Commerce op een brochurewebsite voelt zelden premium",
        body: "Kopers verwachten duidelijke producten, eerlijke prijzen, soepele checkout en betrouwbare bevestigingen. Fragiele plugins en onduidelijke voorraad leiden tot afgebroken checkouts en supportwerk.",
      },
      builds: {
        title: "Een webshop die je kunt runnen",
        body: "Wij richten catalogusstructuur, winkelwagen en checkout in, koppelen Mollie Hosted Checkout zodat kaartgegevens jouw server niet raken, plus ordernotificaties en een praktisch adminpaneel.",
      },
      benefits: [
        "Checkout die voelt als een merkerervaring",
        "Prijzen server-side gevalideerd vóór betaling",
        "Betalingen via Mollie zonder kaartgegevens op jouw stack",
        "Pad naar abonnementen of diepere integraties later",
      ],
      features: [
        "Productcatalogus met categorieën en varianten zoals gescoped",
        "Winkelwagen- en checkout-UX",
        "Mollie Hosted Checkout-integratie",
        "Orderbeheer en klantnotificaties",
        "Responsive storefront",
        "Adminpaneel voor catalogus en orders",
      ],
      process: [
        "Product- en checkout-eisen in kaart",
        "Store-UX en merkgericht ontwerp",
        "Bouw catalogus, cart, Mollie en notificaties",
        "Testbetalingen, livegang en teamtraining",
      ],
      integrations: [
        "Mollie-betaalmethoden op jouw account",
        "Transactionele e-mail voor orderupdates",
        "Optionele voorraad- of ERP-hooks indien gescoped",
        "Analytics met toestemming",
      ],
      security: [
        "Server-side prijs- en voorraadvalidatie vóór charge",
        "Geen kaartgegevens op jouw applicatieserver",
        "Ondertekende payment-webhook verwerking",
        "Rolbewuste admin-toegang voor winkelbeheer",
      ],
      whoFor: [
        "Merken die niet alleen via marketplaces willen verkopen",
        "Dienstverleners die productlijnen toevoegen",
        "Bedrijven die lichtgewicht DIY-shopplugins ontgroeien",
      ],
      included: [
        "Gescopte catalogus- en checkoutimplementatie",
        "Mollie Hosted Checkout-koppeling",
        "Ordernotificatiefows zoals afgesproken",
        "Adminhandleiding voor dagelijkse taken",
      ],
      notIncluded: [
        "Productfotografie of copywriting tenzij gescoped",
        "Beheer van marketplace-listings",
        "Betaalde advertising of influencer-campagnes",
        "Gegarandeerde omzet of conversieratio's",
      ],
      extensions: [
        "Abonnementen of terugkerende betaalpatronen",
        "WhatsApp orderupdates of support",
        "Maatwerk fulfilment- of warehouse-integraties",
        "Conversie-optimalisatie op product- en checkoutpagina's",
      ],
      faq: [
        {
          q: "Waarom Mollie Hosted Checkout?",
          a: "Gevoelige betaalgegevens blijven bij Mollie, je PCI-scope blijft kleiner en klanten krijgen vertrouwde NL/EU-betaalmethoden.",
        },
        {
          q: "Kunnen prijzen in de browser worden gemanipuleerd?",
          a: "Nee. Eindbedragen worden opnieuw berekend en gevalideerd op de server vóórdat een betaling wordt aangemaakt.",
        },
        {
          q: "Regelen jullie verzendlogistiek?",
          a: "We kunnen verzendopties en labels in de flow zetten indien gescoped. Fysieke logistiek blijft jouw verantwoordelijkheid tenzij apart gecontracteerd.",
        },
      ],
      related: [
        { href: paths.websites, label: "Maatwerkwebsites" },
        { href: paths.aiAutomation, label: "AI-automatisering" },
        { href: paths.technicalSupport, label: "Technische support" },
        { href: paths.conversionOptimisation, label: "Conversie-optimalisatie" },
      ],
    },
  },

  "ai-automation": {
    en: {
      metaTitle: "AI Automation",
      metaDescription:
        "Practical AI and workflow automation that cuts repetitive work, speeds follow-up and keeps humans in control of decisions.",
      title: "AI & automation",
      description:
        "We design automations that remove busywork — lead routing, reminders, notifications and AI-assisted drafting — while your team stays accountable for outcomes.",
      problem: {
        title: "Manual follow-up does not scale with demand",
        body: "Leads sit in inboxes, appointments need chasing and the same answers get typed daily. Without structure, quality depends on who is online that hour.",
      },
      builds: {
        title: "Workflows with clear handoffs",
        body: "We map your process, automate the repetitive steps, add AI where it drafts or classifies usefully, and keep escalation paths to people for judgment calls.",
      },
      benefits: [
        "Less copy-paste work for your team",
        "Faster, more consistent first responses",
        "Fewer dropped leads between tools",
        "Automation that grows with agreed rules — not black-box decisions",
      ],
      features: [
        "Workflow design and automation build",
        "Lead capture, tagging and follow-up sequences",
        "Appointment-related reminders where scoped",
        "Email and internal notification flows",
        "AI-assisted replies or summaries under guardrails",
        "Monitoring and simple reporting on flow health",
      ],
      process: [
        "Process mapping and exception list",
        "Automation blueprint and tool choices",
        "Build, test with sample data, refine rules",
        "Go-live with ownership and escalation docs",
      ],
      integrations: [
        "CRM or spreadsheet systems you already use",
        "Email providers and calendars",
        "WhatsApp or web forms as triggers",
        "Internal chat or ticket tools when needed",
      ],
      security: [
        "Least data needed for each automation step",
        "Secrets stored outside client-facing code",
        "Human approval paths for sensitive actions",
        "Audit-friendly logging of automated events where feasible",
      ],
      whoFor: [
        "Teams drowning in repetitive coordination",
        "Sales and ops that share the same intake funnel",
        "Businesses ready to automate after a clear process exists",
      ],
      included: [
        "Scoped automation design and implementation",
        "Test scenarios and go-live checklist",
        "Runbook for your team’s day-to-day ownership",
        "Configured alerts for failed or stuck steps",
      ],
      notIncluded: [
        "Fully autonomous business decision-making by AI",
        "Replacement of licensed professional judgment",
        "Unlimited new flows after launch without a change request",
        "Paid media buying or ad automation",
      ],
      extensions: [
        "WhatsApp AI intake layer",
        "Appointment automation package",
        "Custom software for complex rules",
        "Ongoing optimisation retainer",
      ],
      faq: [
        {
          q: "Will AI decide for us?",
          a: "No. We use AI to assist with drafting, sorting or suggestions. Material actions and customer commitments stay with your people unless you explicitly approve a narrow automated rule.",
        },
        {
          q: "Do we need to change our CRM?",
          a: "Not always. We prefer connecting what you already use when APIs or exports allow a reliable flow.",
        },
        {
          q: "How do you avoid brittle automations?",
          a: "We document exceptions, add failure alerts and keep a human escalation path for odd cases instead of pretending every path is covered.",
        },
      ],
      related: [
        { href: paths.whatsappAi, label: "WhatsApp AI" },
        { href: paths.appointmentAutomation, label: "Appointment automation" },
        { href: paths.reviewflows, label: "Review flows" },
        { href: paths.customSoftware, label: "Custom software" },
      ],
    },
    nl: {
      metaTitle: "AI-automatisering",
      metaDescription:
        "Praktische AI- en workflowautomatisering die repetitief werk vermindert, opvolging versnelt en mensen de beslissingen laat nemen.",
      title: "AI & automatisering",
      description:
        "Wij ontwerpen automatiseringen die rommelwerk wegnemen — leadrouting, herinneringen, notificaties en AI-ondersteund opstellen — terwijl jouw team verantwoordelijk blijft voor uitkomsten.",
      problem: {
        title: "Handmatige opvolging schaalt niet mee met vraag",
        body: "Leads blijven in inboxen liggen, afspraken moeten nagejaagd worden en dezelfde antwoorden worden dagelijks getypt. Zonder structuur hangt kwaliteit af van wie er die avond online is.",
      },
      builds: {
        title: "Workflows met duidelijke overdracht",
        body: "Wij brengen jouw proces in kaart, automatiseren repetitieve stappen, zetten AI in waar het zinvol opstelt of classificeert, en houden escalatiepaden naar mensen voor beoordelingsvragen.",
      },
      benefits: [
        "Minder copy-paste-werk voor jouw team",
        "Snellere, consistentere eerste responses",
        "Minder kwijtgeraakte leads tussen tools",
        "Automatisering die meegroeit met afgesproken regels — geen black-box besluiten",
      ],
      features: [
        "Workflowontwerp en bouw van automatisering",
        "Leadopvang, tagging en opvolgsequenties",
        "Afspraakgerelateerde herinneringen indien gescoped",
        "E-mail- en interne notificatieflows",
        "AI-ondersteunde replies of samenvattingen met guardrails",
        "Monitoring en eenvoudige rapportage over flow-gezondheid",
      ],
      process: [
        "Procesmapping en uitzonderingenlijst",
        "Automatiseringsblueprint en toolkeuzes",
        "Bouwen, testen met voorbeeldata, regels aanscherpen",
        "Livegang met eigenaarschap en escalatiedocs",
      ],
      integrations: [
        "CRM of spreadsheets die je al gebruikt",
        "E-mailproviders en agenda's",
        "WhatsApp of webformulieren als triggers",
        "Interne chat- of tickettools indien nodig",
      ],
      security: [
        "Alleen de data die elke stap nodig heeft",
        "Secrets buiten clientgerichte code",
        "Menselijke goedkeuringspaden voor gevoelige acties",
        "Auditvriendelijke logging van geautomatiseerde events waar mogelijk",
      ],
      whoFor: [
        "Teams die verdrinken in repetitieve coördinatie",
        "Sales en ops die dezelfde intake delen",
        "Bedrijven die willen automatiseren nadat het proces helder is",
      ],
      included: [
        "Gescopt automatiseringsontwerp en implementatie",
        "Testscenario's en go-live checklist",
        "Runbook voor dagelijks eigenaarschap van jouw team",
        "Geconfigureerde alerts bij mislukte of vastgelopen stappen",
      ],
      notIncluded: [
        "Volledig autonome bedrijfsbesluitvorming door AI",
        "Vervanging van professioneel oordeel met vergunning of aansprakelijkheid",
        "Onbeperkt nieuwe flows na livegang zonder change request",
        "Media buying of ad-automatisering",
      ],
      extensions: [
        "WhatsApp AI intake-laag",
        "Afspraakautomatiseringspakket",
        "Maatwerksoftware voor complexe regels",
        "Doorlopende optimalisatieretainer",
      ],
      faq: [
        {
          q: "Beslist AI namens ons?",
          a: "Nee. We gebruiken AI om te helpen met opstellen, sorteren of suggesties. Materiële acties en toezeggingen aan klanten blijven bij jouw mensen, tenzij je expliciet een smalle automatische regel goedkeurt.",
        },
        {
          q: "Moeten we van CRM wisselen?",
          a: "Niet per se. We koppelen bij voorkeur wat je al gebruikt wanneer API's of exports een betrouwbare flow toestaan.",
        },
        {
          q: "Hoe voorkomen jullie breekbare automatiseringen?",
          a: "We documenteren uitzonderingen, zetten failure-alerts en houden een menselijk escalatiepad voor rare cases — in plaats van te doen alsof elk pad is afgedekt.",
        },
      ],
      related: [
        { href: paths.whatsappAi, label: "WhatsApp AI" },
        { href: paths.appointmentAutomation, label: "Afspraakautomatisering" },
        { href: paths.reviewflows, label: "Reviewflows" },
        { href: paths.customSoftware, label: "Maatwerksoftware" },
      ],
    },
  },

  "whatsapp-ai": {
    en: {
      metaTitle: "WhatsApp AI",
      metaDescription:
        "WhatsApp Business AI that answers common questions, captures leads and hands conversations to your team when judgment is needed.",
      title: "WhatsApp Business AI",
      description:
        "Meet customers on WhatsApp with AI-assisted replies for FAQs and intake — always with a clear path to a real teammate for nuance, exceptions and commitments.",
      problem: {
        title: "Important chats arrive when nobody is at the desk",
        body: "WhatsApp is where customers message, but evenings and busy hours leave threads unanswered. Pure autoresponders feel robotic; fully “autonomous AI” risks overpromising.",
      },
      builds: {
        title: "Assisted intake with human handover",
        body: "We connect WhatsApp Business, configure AI for approved FAQs and lead capture, and set explicit handover rules so a person takes over when the conversation needs judgment.",
      },
      benefits: [
        "Faster first response on a channel customers already use",
        "Lead details captured outside office hours",
        "Team time spent on conversations that need a human",
        "Contextual messaging without stuffing sensitive data into URLs",
      ],
      features: [
        "WhatsApp Business API integration",
        "AI responses for approved FAQ topics",
        "Lead capture fields and internal notifications",
        "Appointment intake support when scoped",
        "One-tap or rule-based handover to staff",
        "Monthly prompt and flow tuning as agreed",
      ],
      process: [
        "Channel audit and FAQ / escalation matrix",
        "Message flows and brand tone setup",
        "API connect, testing with sample chats",
        "Go-live with handover training for your team",
      ],
      integrations: [
        "WhatsApp Business API provider",
        "CRM or inbox notifications",
        "Calendar tools for appointment intents",
        "Website “chat on WhatsApp” entry points",
      ],
      security: [
        "Minimal personal data in automated messages",
        "Staff access limited to people who handle chats",
        "No sensitive tokens in front-end code",
        "Clear retention expectations for message logs",
      ],
      whoFor: [
        "Service businesses active on WhatsApp already",
        "Teams that miss after-hours enquiries",
        "Companies that want AI help without removing human ownership",
      ],
      included: [
        "Scoped FAQ knowledge and handover rules",
        "WhatsApp Business AI setup and testing",
        "Notification path for new leads",
        "Team guide for taking over conversations",
      ],
      notIncluded: [
        "Fully autonomous closing of deals or legal commitments",
        "Medical, legal or regulated advice by AI",
        "Unlimited conversation volume guarantees",
        "Ad account or WhatsApp ads management",
      ],
      extensions: [
        "Appointment automation behind the chat",
        "Review invitation flows after service",
        "Live chat on the website as a sibling channel",
        "Deeper CRM sync",
      ],
      faq: [
        {
          q: "Does the AI fully replace our team?",
          a: "No. It handles routine questions and intake. When the topic is outside the approved list — or the customer needs a decision — we route to a human.",
        },
        {
          q: "Can it book appointments automatically?",
          a: "It can collect intent and preferred times and create calendar holds when you approve that flow. Final confirmation can stay with your staff if you prefer.",
        },
        {
          q: "What about Meta / WhatsApp policy compliance?",
          a: "We implement within WhatsApp Business rules for your use case. You remain the business account owner responsible for consented messaging practices.",
        },
      ],
      related: [
        { href: paths.livechat, label: "Live chat" },
        { href: paths.appointmentAutomation, label: "Appointment automation" },
        { href: paths.aiAutomation, label: "AI automation" },
        { href: paths.reviewflows, label: "Review flows" },
      ],
    },
    nl: {
      metaTitle: "WhatsApp AI",
      metaDescription:
        "WhatsApp Business AI die veelgestelde vragen beantwoordt, leads opvangt en gesprekken overdraagt aan jouw team wanneer beoordeling nodig is.",
      title: "WhatsApp Business AI",
      description:
        "Ontmoet klanten op WhatsApp met AI-ondersteunde replies voor FAQ's en intake — altijd met een duidelijk pad naar een echte medewerker voor nuance, uitzonderingen en toezeggingen.",
      problem: {
        title: "Belangrijke chats komen binnen als niemand achter het bureau zit",
        body: "WhatsApp is waar klanten berichten, maar avonden en drukte laten threads onbeantwoord. Pure autoresponders voelen robotisch; volledig “autonome AI” belooft te veel.",
      },
      builds: {
        title: "Ondersteunde intake met menselijke overdracht",
        body: "Wij koppelen WhatsApp Business, configureren AI voor goedgekeurde FAQ's en leadopvang, en zetten expliciete overdrachtsregels zodat een persoon overneemt wanneer beoordeling nodig is.",
      },
      benefits: [
        "Snellere eerste response via een kanaal dat klanten al gebruiken",
        "Leaddetails opgevangen buiten kantooruren",
        "Teamtijd voor gesprekken die een mens nodig hebben",
        "Contextuele berichten zonder gevoelige data in URL's te stoppen",
      ],
      features: [
        "WhatsApp Business API-integratie",
        "AI-responses voor goedgekeurde FAQ-onderwerpen",
        "Leadvelden en interne notificaties",
        "Afspraakintake indien gescoped",
        "Rule-based of one-tap overdracht naar medewerkers",
        "Maandelijks aanscherpen van prompts en flows zoals afgesproken",
      ],
      process: [
        "Kanaalaudit en FAQ-/escalatiematrix",
        "Berichtflows en merktoon",
        "API-koppeling, testen met voorbeeldchats",
        "Livegang met overdrachtstraining voor jouw team",
      ],
      integrations: [
        "WhatsApp Business API-provider",
        "CRM of inbox-notificaties",
        "Agendatools voor afspraakintenties",
        "Website-instappen “chat op WhatsApp”",
      ],
      security: [
        "Minimale persoonsgegevens in geautomatiseerde berichten",
        "Medewerkerstoegang beperkt tot wie chats afhandelt",
        "Geen gevoelige tokens in front-endcode",
        "Duidelijke retentie-afspraken voor berichtlogs",
      ],
      whoFor: [
        "Dienstverleners die al actief zijn op WhatsApp",
        "Teams die avondenquiries missen",
        "Bedrijven die AI-hulp willen zonder menselijk eigenaarschap weg te nemen",
      ],
      included: [
        "Gescopte FAQ-kennis en overdrachtsregels",
        "WhatsApp Business AI-setup en tests",
        "Notificatiepad voor nieuwe leads",
        "Teamid voor het overnemen van gesprekken",
      ],
      notIncluded: [
        "Volledig autonome dealclosing of juridische toezeggingen",
        "Medisch, juridisch of gereguleerd advies door AI",
        "Onbeperkte gespreksvolumes garanderen",
        "Beheer van ad-accounts of WhatsApp-ads",
      ],
      extensions: [
        "Afspraakautomatisering achter de chat",
        "Review-uitnodigingen na dienstverlening",
        "Livechat op de website als zustkanaal",
        "Diepere CRM-sync",
      ],
      faq: [
        {
          q: "Vervangt de AI ons team volledig?",
          a: "Nee. Die handelt routinevragen en intake af. Zodra het onderwerp buiten de goedgekeurde lijst valt — of de klant een besluit nodig heeft — routeren we naar een mens.",
        },
        {
          q: "Kan het automatisch afspraken boeken?",
          a: "Het kan intentie en voorkeurstijden verzamelen en kalenderholds maken als jij die flow goedkeurt. Definitieve bevestiging kan bij jouw medewerkers blijven.",
        },
        {
          q: "Hoe zit het met Meta-/WhatsApp-beleid?",
          a: "Wij implementeren binnen de WhatsApp Business-regels voor jouw use case. Jij blijft account-eigenaar en verantwoordelijk voor consented messaging.",
        },
      ],
      related: [
        { href: paths.livechat, label: "Livechat" },
        { href: paths.appointmentAutomation, label: "Afspraakautomatisering" },
        { href: paths.aiAutomation, label: "AI-automatisering" },
        { href: paths.reviewflows, label: "Reviewflows" },
      ],
    },
  },

  livechat: {
    en: {
      metaTitle: "Live Chat",
      metaDescription:
        "Professional live chat setup on your website — styling, triggers, offline messages and consent-aware loading.",
      title: "Live chat for your website",
      description:
        "Talk to visitors in real time. We install and configure live chat so it matches your brand, respects consent and gives your team a clean inbox workflow.",
      problem: {
        title: "Forms alone leave hot intent waiting",
        body: "Some visitors will chat if you make it easy — but a default widget that loads too early, shifts layout or ignores cookie consent creates legal and UX friction.",
      },
      builds: {
        title: "Chat that fits your site",
        body: "We place and style the widget, set triggers and offline messages, connect team access, wire consent-aware loading and optionally add a WhatsApp fallback path.",
      },
      benefits: [
        "Direct conversations while buying intent is high",
        "Fewer missed questions during office hours",
        "Privacy-conscious loading with consent",
        "No jarring layout shift from late widget injection",
      ],
      features: [
        "Widget installation and brand styling",
        "Trigger rules by page or behaviour",
        "Offline message handling",
        "Team seats and routing basics",
        "Cookie consent integration",
        "Optional WhatsApp fallback link",
      ],
      process: [
        "Site and consent setup review",
        "Widget styling and trigger plan",
        "Install, lazy-load and QA",
        "Short team walkthrough",
      ],
      integrations: [
        "Live chat provider (your choice)",
        "Your cookie consent banner",
        "Optional WhatsApp deep link",
        "Internal email alerts for offline messages",
      ],
      security: [
        "Chat script only after required consent category",
        "No unnecessary third-party scripts beyond the chat vendor",
        "Staff access limited to operators you nominate",
        "Guidance on avoiding sensitive data in chat",
      ],
      whoFor: [
        "Websites with an active support or sales team online",
        "Businesses that want chat without building a custom stack",
        "Teams pairing chat with WhatsApp for after hours",
      ],
      included: [
        "Configured live chat widget on agreed pages",
        "Consent-aware load strategy",
        "Trigger and offline message setup",
        "Operator quick-start notes",
      ],
      notIncluded: [
        "24/7 staffing of the chat inbox by VDB Digital Software",
        "Custom chat product development (use our custom software offer)",
        "Paid ads that drive chat traffic",
        "Guaranteed conversion lift from chat alone",
      ],
      extensions: [
        "WhatsApp AI for after-hours coverage",
        "CRM handoff of chat leads",
        "Conversion review of chat CTAs and page placement",
      ],
      faq: [
        {
          q: "Why a dedicated live chat tool?",
          a: "It is a practical live chat platform for small and mid-sized teams. We configure it properly rather than inventing a chat product you must maintain alone.",
        },
        {
          q: "Does it load before cookie consent?",
          a: "We wire loading so non-essential chat only activates under your consent rules — typically after the functional category is accepted.",
        },
        {
          q: "Can chat replace WhatsApp?",
          a: "They serve different moments. Chat catches website visitors; WhatsApp meets people in the messaging app. Many clients use both with a clear fallback.",
        },
      ],
      related: [
        { href: paths.whatsappAi, label: "WhatsApp AI" },
        { href: paths.websites, label: "Custom websites" },
        { href: paths.conversionOptimisation, label: "Conversion optimisation" },
      ],
    },
    nl: {
      metaTitle: "Livechat",
      metaDescription:
        "Professionele livechat-setup op jouw website — styling, triggers, offlineberichten en toestemmingsbewust laden.",
      title: "Livechat voor je website",
      description:
        "Spreek bezoekers realtime. Wij installeren en configureren van livechat zodat het bij jouw merk past, toestemming respecteert en jouw team een schone inboxworkflow geeft.",
      problem: {
        title: "Alleen formulieren laten hete intentie wachten",
        body: "Sommige bezoekers chatten graag als je het makkelijk maakt — maar een standaardwidget die te vroeg laadt, layout verschuift of cookietoestemming negeert, geeft juridische en UX-wrijving.",
      },
      builds: {
        title: "Chat die bij jouw site past",
        body: "Wij plaatsen en stylen de widget, zetten triggers en offlineberichten, koppelen teamtoegang, laden toestemmingsbewust en voegen optioneel een WhatsApp-fallback toe.",
      },
      benefits: [
        "Directe gesprekken terwijl koopintentie hoog is",
        "Minder gemiste vragen tijdens kantooruren",
        "Privacybewust laden met toestemming",
        "Geen storende layout shift door late widget-injectie",
      ],
      features: [
        "Widget-installatie en merkstyling",
        "Triggregels per pagina of gedrag",
        "Offline berichtenafhandeling",
        "Teamseats en basisrouting",
        "Cookietoestemming-integratie",
        "Optionele WhatsApp-fallback",
      ],
      process: [
        "Review van site- en toestemmingssetup",
        "Widgetstyling en triggerplan",
        "Installatie, lazy-load en QA",
        "Korte teamwalkthrough",
      ],
      integrations: [
        "Live chat provider (your choice)",
        "Jouw cookiebanner",
        "Optionele WhatsApp deep link",
        "Interne e-mailalerts voor offlineberichten",
      ],
      security: [
        "Chatscript pas na de vereiste toestemmingscategorie",
        "Geen onnodige third-party scripts buiten de chatvendor",
        "Medewerkerstoegang beperkt tot door jou aangewezen operators",
        "Richtlijnen om gevoelige data in chat te vermijden",
      ],
      whoFor: [
        "Websites met een actief support- of salesteam online",
        "Bedrijven die chat willen zonder een eigen stack te bouwen",
        "Teams die chat combineren met WhatsApp voor na werktijd",
      ],
      included: [
        "Geconfigureerde livechat-widget op afgesproken pagina's",
        "Toestemmingsbewuste laadstrategie",
        "Trigger- en offlineberichtsetup",
        "Operator quick-start notities",
      ],
      notIncluded: [
        "24/7 bemanning van de chatinbox door VDB Digital Software",
        "Maatwerk chatproductontwikkeling (zie maatwerksoftware)",
        "Betaalde ads die chatverkeer aantrekken",
        "Gegarandeerde conversiestijging door chat alleen",
      ],
      extensions: [
        "WhatsApp AI voor dekking buiten kantooruren",
        "CRM-handoff van chatleads",
        "Conversiereview van chat-CTA's en plaatsing",
      ],
      faq: [
        {
          q: "Waarom een dedicated livechat-tool?",
          a: "Het is een praktische livechat voor kleine en middelgrote teams. Wij richten het goed in in plaats van een chatproduct te bouwen dat jij alleen moet onderhouden.",
        },
        {
          q: "Laadt het vóór cookietoestemming?",
          a: "Wij koppelen laden zodat niet-essentiële chat alleen activeert volgens jouw toestemmingsregels — typisch na acceptatie van de functionele categorie.",
        },
        {
          q: "Kan chat WhatsApp vervangen?",
          a: "Ze dienen andere momenten. Chat vangt websitebezoekers; WhatsApp ontmoet mensen in de berichtenapp. Veel klanten gebruiken beide met een duidelijke fallback.",
        },
      ],
      related: [
        { href: paths.whatsappAi, label: "WhatsApp AI" },
        { href: paths.websites, label: "Maatwerkwebsites" },
        { href: paths.conversionOptimisation, label: "Conversie-optimalisatie" },
      ],
    },
  },

  reviewflows: {
    en: {
      metaTitle: "Review Flows",
      metaDescription:
        "Ethical automated review invitation flows after appointments, deliveries or service visits — no review manipulation.",
      title: "Review and feedback flows",
      description:
        "Ask for feedback at the right moment. We set up automated invitations after completed jobs so happy customers can leave reviews — without gaming platforms or filtering only praise.",
      problem: {
        title: "Great work goes unreviewed because nobody asks",
        body: "Manual “could you leave a review?” messages get forgotten. Delayed asks earn silence. Aggressive filtering or fake positivity risks policy violations and trust damage.",
      },
      builds: {
        title: "Honest invitation automation",
        body: "We trigger review invitations after a completed appointment, delivery or service event, route customers to the platforms you use, and keep messaging compliant — no score gating or review suppression tricks.",
      },
      benefits: [
        "More review invitations without daily manual chasing",
        "Timing tied to real completed work",
        "Clearer signal of customer satisfaction over time",
        "Flows you can explain to platforms and customers alike",
      ],
      features: [
        "Automated invitation triggers after completion events",
        "Email and/or WhatsApp message templates",
        "Links to your review platforms",
        "Timing and frequency caps",
        "Basic reporting on sends and clicks where available",
        "Multi-location message variants when scoped",
      ],
      process: [
        "Map completion events and platforms",
        "Write transparent invitation copy",
        "Build triggers, caps and tests",
        "Launch with monitoring for bounce or spam issues",
      ],
      integrations: [
        "Booking or job completion systems",
        "Email delivery providers",
        "WhatsApp where already in your stack",
        "Google Business Profile or other review destinations you own",
      ],
      security: [
        "Only contact customers who engaged with your service",
        "Honour opt-outs and frequency limits",
        "No credential sharing that bypasses platform rules",
        "Personal data limited to what the send needs",
      ],
      whoFor: [
        "Local service businesses after on-site visits",
        "Clinics, salons and trades with appointment completion",
        "Stores that ship orders and want post-delivery asks",
      ],
      included: [
        "Trigger design tied to real completion events",
        "Invitation templates in your tone of voice",
        "Platform link configuration",
        "Launch checklist and owner runbook",
      ],
      notIncluded: [
        "Review manipulation, fake reviews or incentivised five-star schemes",
        "Filtering out unhappy customers before they can review",
        "Guaranteed star ratings or review counts",
        "Reputation crisis PR management",
      ],
      extensions: [
        "Internal feedback form before public review ask",
        "WhatsApp AI for service follow-ups",
        "Appointment automation that feeds completion events",
      ],
      faq: [
        {
          q: "Do you filter unhappy customers away from review sites?",
          a: "No. That practice conflicts with major platform policies and with how we work. We send fair invitations; public feedback stays with the customer.",
        },
        {
          q: "Can we offer discounts for five-star reviews?",
          a: "We do not set up incentivised rating schemes. If you want a thank-you for any feedback, we keep it non-conditional on star score.",
        },
        {
          q: "What if someone leaves a critical review?",
          a: "That is part of an honest reputation. We can help you spot operational issues in private feedback channels — not hide public criticism.",
        },
      ],
      related: [
        { href: paths.appointmentAutomation, label: "Appointment automation" },
        { href: paths.whatsappAi, label: "WhatsApp AI" },
        { href: paths.aiAutomation, label: "AI automation" },
      ],
    },
    nl: {
      metaTitle: "Reviewflows",
      metaDescription:
        "Ethische automatische review-uitnodigingen na afspraken, leveringen of dienstverlening — zonder reviewmanipulatie.",
      title: "Review- en feedbackflows",
      description:
        "Vraag feedback op het juiste moment. Wij zetten automatische uitnodigingen na afgerond werk zodat tevreden klanten een review kunnen achterlaten — zonder platforms te gamen of alleen lof te selecteren.",
      problem: {
        title: "Goed werk blijft ongereviewd omdat niemand vraagt",
        body: "Handmatige “zou je een review willen plaatsen?”-berichten worden vergeten. Te late vragen leveren stilte op. Agressief filteren of nep-positiviteit schaadt beleid én vertrouwen.",
      },
      builds: {
        title: "Eerlijke uitnodigingsautomatisering",
        body: "Wij triggeren review-uitnodigingen na een afgeronde afspraak, levering of dienst, sturen klanten naar de platforms die jij gebruikt, en houden messaging compliant — zonder score-gating of review-onderdrukkingstrucs.",
      },
      benefits: [
        "Meer review-uitnodigingen zonder dagelijks handmatig napraten",
        "Timing gekoppeld aan echt afgerond werk",
        "Duidelijker beeld van klanttevredenheid in de tijd",
        "Flows die je kunt uitleggen aan platforms en klanten",
      ],
      features: [
        "Automatische uitnodigingstriggers na afrondingsevents",
        "E-mail- en/of WhatsApp-sjablonen",
        "Links naar jouw reviewplatforms",
        "Timing en frequentiecaps",
        "Basisrapportage over sends en clicks waar beschikbaar",
        "Multi-locatie berichtvarianten indien gescoped",
      ],
      process: [
        "Afrondingsevents en platforms in kaart",
        "Transparante uitnodigingsteksten schrijven",
        "Triggers, caps en tests bouwen",
        "Livegang met monitoring op bounce of spamissues",
      ],
      integrations: [
        "Boekings- of jobafrondingssystemen",
        "E-mailproviders",
        "WhatsApp als dat al in jouw stack zit",
        "Google Business Profile of andere reviewbestemmingen die jij beheert",
      ],
      security: [
        "Alleen klanten benaderen die jouw dienst hebben ervaren",
        "Opt-outs en frequentielimieten respecteren",
        "Geen credential-sharing die platformregels omzeilt",
        "Persoonsgegevens beperkt tot wat de send nodig heeft",
      ],
      whoFor: [
        "Lokale dienstverleners na locatiebezoeken",
        "Klinieken, salons en vakmensen met afspraakafronding",
        "Winkels die orders verzenden en na levering willen vragen",
      ],
      included: [
        "Triggerontwerp gekoppeld aan echte afrondingsevents",
        "Uitnodigingssjablonen in jouw tone of voice",
        "Configuratie van platformlinks",
        "Launch-checklist en eigenaarsrunbook",
      ],
      notIncluded: [
        "Reviewmanipulatie, nep-reviews of beloonde vijfster-schema's",
        "Ontevreden klanten wegfilteren vóór ze kunnen reviewen",
        "Gegarandeerde sterrenscores of reviewaantallen",
        "PR-crisisbeheer bij reputatieschade",
      ],
      extensions: [
        "Interne feedbackformulier vóór publieke reviewvraag",
        "WhatsApp AI voor service-opvolging",
        "Afspraakautomatisering die afrondingsevents voedt",
      ],
      faq: [
        {
          q: "Filteren jullie ontevreden klanten weg van reviewsites?",
          a: "Nee. Dat botst met beleid van grote platforms en met hoe wij werken. Wij sturen eerlijke uitnodigingen; publieke feedback blijft bij de klant.",
        },
        {
          q: "Mogen we korting geven voor vijf sterren?",
          a: "Wij zetten geen beloonde scoreschema's op. Wil je bedanken voor feedback, dan houden we dat niet afhankelijk van het aantal sterren.",
        },
        {
          q: "Wat als iemand een kritische review achterlaat?",
          a: "Dat hoort bij een eerlijke reputatie. We kunnen helpen operationele signalen in private kanalen op te vangen — niet publieke kritiek verbergen.",
        },
      ],
      related: [
        { href: paths.appointmentAutomation, label: "Afspraakautomatisering" },
        { href: paths.whatsappAi, label: "WhatsApp AI" },
        { href: paths.aiAutomation, label: "AI-automatisering" },
      ],
    },
  },

  "appointment-automation": {
    en: {
      metaTitle: "Appointment Automation",
      metaDescription:
        "Automate booking confirmations, reminders and no-show reduction flows around your calendar — with people still confirming exceptions.",
      title: "Appointment automation",
      description:
        "Reduce no-shows and inbox ping-pong. We automate confirmations, reminders and reschedule links around your scheduling tools while staff keep control of exceptions.",
      problem: {
        title: "Calendars fill up; follow-up still happens by hand",
        body: "Clients forget slots, staff retype the same reminders and double bookings slip through when systems do not talk. Manual SMS and email chains do not keep up with volume.",
      },
      builds: {
        title: "Calendar-aware reminder and confirmation flows",
        body: "We connect your booking source, send timely confirmations and reminders, offer clear reschedule paths and notify your team when something needs a human decision.",
      },
      benefits: [
        "Fewer forgotten appointments through timely reminders",
        "Less manual copy-paste for reception or ops",
        "Clearer client communication before the visit",
        "A foundation for post-visit review invites",
      ],
      features: [
        "Booking confirmation messages",
        "Multi-step reminder sequences",
        "Reschedule / cancel instruction links",
        "Internal alerts for risky or changed bookings",
        "Timezone and buffer-aware timing where supported",
        "Optional WhatsApp or email channel mix",
      ],
      process: [
        "Audit booking tools and no-show patterns",
        "Design message cadence and exception rules",
        "Integrate, test with sandbox bookings",
        "Go-live with staff ownership guide",
      ],
      integrations: [
        "Popular scheduling tools via API or webhooks when available",
        "Google Calendar / Microsoft 365 where scoped",
        "Email and WhatsApp delivery channels",
        "CRM notes for appointment outcomes",
      ],
      security: [
        "Appointment details shared only with the right parties",
        "Secure webhook verification when platforms support it",
        "Staff roles for who can change automation rules",
        "No oversharing of medical or sensitive notes in reminders",
      ],
      whoFor: [
        "Clinics, salons, consultants and field-service teams",
        "Businesses with high booking volume",
        "Teams already using a digital calendar or booking page",
      ],
      included: [
        "Scoped confirmation and reminder flows",
        "Channel templates you approve",
        "Exception escalation to your inbox or chat",
        "Launch monitoring window as agreed",
      ],
      notIncluded: [
        "Guaranteed no-show percentage reductions",
        "Staffing your reception desk",
        "Medical triage or clinical advice automation",
        "Unlimited last-minute custom message campaigns",
      ],
      extensions: [
        "Review flows after completed visits",
        "WhatsApp AI for booking questions",
        "Deeper custom booking UI as custom software",
      ],
      faq: [
        {
          q: "Can clients rebook without calling us?",
          a: "Often yes, via links into your existing scheduling tool. Complex exceptions still route to your team.",
        },
        {
          q: "Will reminders spam people?",
          a: "We set frequency caps and quiet hours. You approve the cadence before go-live.",
        },
        {
          q: "Do you replace our booking software?",
          a: "Usually we enhance what you already use. A fully custom booking product is a separate custom software engagement.",
        },
      ],
      related: [
        { href: paths.whatsappAi, label: "WhatsApp AI" },
        { href: paths.reviewflows, label: "Review flows" },
        { href: paths.aiAutomation, label: "AI automation" },
        { href: paths.customSoftware, label: "Custom software" },
      ],
    },
    nl: {
      metaTitle: "Afspraakautomatisering",
      metaDescription:
        "Automatiseer boekingsbevestigingen, herinneringen en no-show-reductie rond jouw agenda — met mensen die uitzonderingen blijven bevestigen.",
      title: "Afspraakautomatisering",
      description:
        "Minder no-shows en inbox pingpong. Wij automatiseren bevestigingen, herinneringen en verzetlinks rond jouw planningstools terwijl medewerkers uitzonderingen blijven beheersen.",
      problem: {
        title: "Agenda's raken vol; opvolging gebeurt nog steeds handmatig",
        body: "Klanten vergeten slots, medewerkers typen dezelfde reminders opnieuw en dubbele boekingen glippen erdoor als systemen niet praten. Handmatige sms- en e-mailketens houden volume niet bij.",
      },
      builds: {
        title: "Agenda-bewuste herinnerings- en bevestigingsflows",
        body: "Wij koppelen jouw boekingsbron, sturen tijdige bevestigingen en herinneringen, bieden duidelijke verzetpaden en waarschuwen jouw team wanneer een menselijk besluit nodig is.",
      },
      benefits: [
        "Minder vergeten afspraken door tijdige herinneringen",
        "Minder handmatig copy-paste voor receptie of ops",
        "Duidelijkere klantcommunicatie vóór het bezoek",
        "Fundament voor review-uitnodigingen na de afspraak",
      ],
      features: [
        "Boekingsbevestigingsberichten",
        "Meertraps herinneringssequenties",
        "Instructielinks voor verzetten / annuleren",
        "Interne alerts bij risicovolle of gewijzigde boekingen",
        "Tijdzone- en bufferbewuste timing waar ondersteund",
        "Optionele mix van WhatsApp en e-mail",
      ],
      process: [
        "Audit van bookingtools en no-show-patronen",
        "Berichtcadans en uitzonderingsregels ontwerpen",
        "Integreren, testen met sandboxboekingen",
        "Livegang met eigenaarschapshandleiding voor medewerkers",
      ],
      integrations: [
        "Gangbare planningstools via API of webhooks waar beschikbaar",
        "Google Calendar / Microsoft 365 indien gescoped",
        "E-mail- en WhatsApp-kanalen",
        "CRM-notities voor afspraakuitkomsten",
      ],
      security: [
        "Afspraakdetails alleen met de juiste partijen delen",
        "Veilige webhookverificatie wanneer platforms dat steunen",
        "Medewerkersrollen voor wie automatiseringsregels mag wijzigen",
        "Geen oversharing van medische of gevoelige notities in herinneringen",
      ],
      whoFor: [
        "Klinieken, salons, consultants en buitendienstteams",
        "Bedrijven met hoog boekingsvolume",
        "Teams die al een digitale agenda of boekingspagina gebruiken",
      ],
      included: [
        "Gescopte bevestigings- en herinneringsflows",
        "Kanaalsjablonen die jij goedkeurt",
        "Uitzonderingsescalatie naar jouw inbox of chat",
        "Launch-monitoringvenster zoals afgesproken",
      ],
      notIncluded: [
        "Gegarandeerde percentages minder no-shows",
        "Bemanning van jouw receptie",
        "Medische triage of klinisch advies via automatisering",
        "Onbeperkte last-minute custom berichtcampagnes",
      ],
      extensions: [
        "Reviewflows na afgeronde bezoeken",
        "WhatsApp AI voor boekingsvragen",
        "Diepere maatwerk boekings-UI als maatwerksoftware",
      ],
      faq: [
        {
          q: "Kunnen klanten herbocken zonder te bellen?",
          a: "Vaak ja, via links naar jouw bestaande planningstool. Complexe uitzonderingen gaan alsnog naar jouw team.",
        },
        {
          q: "Spammem reminders niet?",
          a: "We zetten frequentiecaps en rusturen. Jij keurt de cadans goed vóór livegang.",
        },
        {
          q: "Vervangen jullie onze boekingssoftware?",
          a: "Meestal versterken we wat je al gebruikt. Een volledig maatwerk boekingsproduct is een apart maatwerksoftware-traject.",
        },
      ],
      related: [
        { href: paths.whatsappAi, label: "WhatsApp AI" },
        { href: paths.reviewflows, label: "Reviewflows" },
        { href: paths.aiAutomation, label: "AI-automatisering" },
        { href: paths.customSoftware, label: "Maatwerksoftware" },
      ],
    },
  },

  "website-maintenance": {
    en: {
      metaTitle: "Website Maintenance",
      metaDescription:
        "Scoped website maintenance: updates, monitoring, small fixes and content assists — without unlimited work claims.",
      title: "Website maintenance",
      description:
        "Keep your site healthy after launch. We provide a scoped maintenance retainer for updates, uptime awareness, dependency care and small agreed changes — not an open cheque for endless work.",
      problem: {
        title: "Launched sites quietly drift into risk",
        body: "Unused plugins, expired certificates, broken forms and ignored dependency updates accumulate until something breaks on a Friday afternoon.",
      },
      builds: {
        title: "A predictable care plan",
        body: "We define hours or tickets per month, monitor what matters, apply security and dependency updates in a controlled window and handle small content or fix requests within the agreed bucket.",
      },
      benefits: [
        "Someone watching the basics after launch",
        "Updates applied with a rollback mindset",
        "Small changes without starting a full project each time",
        "Clear boundaries so priorities stay honest",
      ],
      features: [
        "Dependency and security update cadence",
        "Uptime / availability checks as agreed",
        "Broken-link and form smoke checks",
        "Backup verification where we manage hosting touchpoints",
        "Small content and CSS fixes within monthly scope",
        "Monthly summary of what changed",
      ],
      process: [
        "Baseline audit of your stack",
        "Agree monthly hours / ticket model",
        "Onboard monitoring and access",
        "Steady monthly care with change log",
      ],
      integrations: [
        "Your hosting or Vercel / similar deploy pipeline",
        "Error or uptime monitors you already use",
        "CMS or repo access with least privilege",
      ],
      security: [
        "Prompt attention to known dependency CVEs in scope",
        "Access via individual credentials — not shared passwords in chat",
        "Change windows that avoid silent Friday megadeploys when possible",
        "No “hack-proof” promises — defence in layers, not slogans",
      ],
      whoFor: [
        "Businesses that shipped a site and need ongoing care",
        "Teams without an in-house web developer",
        "Stores that need careful update windows",
      ],
      included: [
        "Agreed monthly capacity (hours or tickets)",
        "Priority queue for in-scope fixes",
        "Update and check routines as listed in your plan",
        "Short monthly status note",
      ],
      notIncluded: [
        "Unlimited redesigns, new page builds or feature projects",
        "Emergency work beyond fair-use response windows",
        "Guaranteed zero downtime or invulnerable security",
        "Content marketing production retainers unless added",
      ],
      extensions: [
        "Conversion optimisation sprints",
        "Technical support for incidents outside the site",
        "Larger feature projects scoped separately",
      ],
      faq: [
        {
          q: "Is maintenance unlimited?",
          a: "No. Plans include a defined monthly capacity. Larger work is quoted as a project so your site’s roadmap stays transparent.",
        },
        {
          q: "What happens if we exceed hours?",
          a: "We pause non-urgent items or propose a top-up / project quote. Critical production fixes are handled according to your plan’s response terms.",
        },
        {
          q: "Do you also write all our content?",
          a: "Small copy tweaks can fit in scope. Full content programmes need a separate agreement.",
        },
      ],
      related: [
        { href: paths.technicalSupport, label: "Technical support" },
        { href: paths.websites, label: "Custom websites" },
        { href: paths.conversionOptimisation, label: "Conversion optimisation" },
        { href: paths.webshops, label: "Online stores" },
      ],
    },
    nl: {
      metaTitle: "Websiteonderhoud",
      metaDescription:
        "Afgestemd websiteonderhoud: updates, monitoring, kleine fixes en contenthulp — zonder claims over onbeperkt werk.",
      title: "Websiteonderhoud",
      description:
        "Houd jouw site gezond na livegang. Wij bieden een afgebakende onderhoudsretainer voor updates, uptime-bewustzijn, dependency-zorg en kleine afgesproken wijzigingen — geen open cheque voor eindeloos werk.",
      problem: {
        title: "Live sites glijden stil richting risico",
        body: "Ongebruikte plugins, verlopen certificaten, kapotte formulieren en genegeerde dependency-updates stapelen zich op tot iets stukgaat op een vrijdagmiddag.",
      },
      builds: {
        title: "Een voorspelbaar zorgplan",
        body: "Wij definiëren uren of tickets per maand, monitoren wat ertoe doet, passen security- en dependency-updates gecontroleerd toe en handelen kleine content- of fixverzoeken binnen de afgesproken bucket af.",
      },
      benefits: [
        "Iemand die na livegang de basis in de gaten houdt",
        "Updates met een rollback-mindset",
        "Kleine wijzigingen zonder elk keer een volledig project",
        "Duidelijke grenzen zodat prioriteiten eerlijk blijven",
      ],
      features: [
        "Cadans voor dependency- en security-updates",
        "Uptime-/beschikbaarheidschecks zoals afgesproken",
        "Broken-link- en formulier-smoketests",
        "Backupverificatie waar wij hosting-touchpoints beheren",
        "Kleine content- en CSS-fixes binnen maandelijkse scope",
        "Maandelijks overzicht van wat er is gewijzigd",
      ],
      process: [
        "Baseline-audit van jouw stack",
        "Maandmodel in uren / tickets afspreken",
        "Monitoring en toegang onboarding",
        "Vaste maandelijkse zorg met changelog",
      ],
      integrations: [
        "Jouw hosting of Vercel / vergelijkbare deploy-pipeline",
        "Error- of uptimemonitors die je al gebruikt",
        "CMS- of repo-toegang met least privilege",
      ],
      security: [
        "Aandacht voor bekende dependency-CVE's binnen scope",
        "Toegang via persoonlijke credentials — geen gedeelde wachtwoorden in chat",
        "Change-windows die stille vrijdag-megadeploys vermijden waar mogelijk",
        "Geen “hack-proof”-beloftes — verdediging in lagen, geen slogans",
      ],
      whoFor: [
        "Bedrijven met een live site die doorlopende zorg nodig hebben",
        "Teams zonder in-house webontwikkelaar",
        "Webshops die zorgvuldige updatevensters nodig hebben",
      ],
      included: [
        "Afgesproken maandelijkse capaciteit (uren of tickets)",
        "Prioriteitsqueue voor in-scope fixes",
        "Update- en checkroutines zoals in jouw plan",
        "Korte maandelijkse statusnotitie",
      ],
      notIncluded: [
        "Onbeperkte redesigns, nieuwe pagina's of featureprojecten",
        "Spoedwerk buiten fair-use responsevensters",
        "Gegarandeerde zero downtime of onkwetsbare beveiliging",
        "Contentmarketing-retainers tenzij apart toegevoegd",
      ],
      extensions: [
        "Conversie-optimalisatie sprints",
        "Technische support voor incidenten buiten de site",
        "Grotere featureprojecten apart gescoped",
      ],
      faq: [
        {
          q: "Is onderhoud onbeperkt?",
          a: "Nee. Plannen bevatten een gedefinieerde maandcapaciteit. Groter werk offreren we als project zodat de roadmap transparant blijft.",
        },
        {
          q: "Wat als we de uren overschrijden?",
          a: "We parkeren niet-urgente items of stellen een top-up / projectofferte voor. Kritieke productiefixes volgen de responstermen van jouw plan.",
        },
        {
          q: "Schrijven jullie ook al onze content?",
          a: "Kleine copy-tweaks kunnen binnen scope vallen. Volledige contentprogramma's vragen een aparte overeenkomst.",
        },
      ],
      related: [
        { href: paths.technicalSupport, label: "Technische support" },
        { href: paths.websites, label: "Maatwerkwebsites" },
        { href: paths.conversionOptimisation, label: "Conversie-optimalisatie" },
        { href: paths.webshops, label: "Webshops" },
      ],
    },
  },

  "technical-support": {
    en: {
      metaTitle: "Technical Support",
      metaDescription:
        "Technical support for your VDB Digital Software stack — incident triage, fixes and guided changes with clear severity and response expectations.",
      title: "Technical support",
      description:
        "When something breaks or a change needs careful hands, our support desk helps triage, fix and advise — with defined channels and severity, not a vague “ping us anytime” promise.",
      problem: {
        title: "Issues stall when there is no clear owner",
        body: "Forms fail, webhooks miss events or a deploy behaves oddly. Without a support path, those problems bounce between freelancers and inbox threads.",
      },
      builds: {
        title: "A structured support relationship",
        body: "We establish how you report issues, how we classify severity, what falls inside support versus a project, and how we communicate until resolution or a scoped follow-up.",
      },
      benefits: [
        "A known channel when production misbehaves",
        "Faster triage because we know your stack",
        "Honest split between support fixes and new feature work",
        "Written outcomes so your team learns what changed",
      ],
      features: [
        "Ticketed intake via agreed channels",
        "Severity classification and response targets",
        "Bugfix and integration troubleshooting",
        "Guided configuration help for delivered systems",
        "Post-incident notes for material events",
        "Optional paired support + maintenance plans",
      ],
      process: [
        "Confirm systems and access inventory",
        "Set support channel and hours",
        "Triage → reproduce → fix or escalate to project",
        "Close with summary and prevention notes when useful",
      ],
      integrations: [
        "Your production apps and admin tools",
        "Mollie, WhatsApp or chat vendors in your stack",
        "Monitoring alerts forwarded into support",
      ],
      security: [
        "Verified requester identity for privileged changes",
        "Time-bound elevated access when needed",
        "No casual production changes without a ticket trail",
        "Secrets rotated if exposure is suspected",
      ],
      whoFor: [
        "Clients running stores, automations or custom apps we built",
        "Teams that need more than “email the developer and hope”",
        "Businesses pairing support with a maintenance retainer",
      ],
      included: [
        "Support channel and severity model",
        "In-scope incident and defect handling",
        "Advice on safe configuration of delivered features",
        "Escalation path to fixed-price project work when needed",
      ],
      notIncluded: [
        "Unlimited feature development under the support label",
        "Support for third-party tools we did not implement",
        "Guaranteed response in seconds or 100% uptime SLAs unless contracted",
        "On-site hardware or office IT support",
      ],
      extensions: [
        "Website maintenance retainer",
        "Conversion or performance investigation sprints",
        "Custom software enhancements",
      ],
      faq: [
        {
          q: "Is this the same as website maintenance?",
          a: "Maintenance is proactive care and small changes. Support is reactive help when something fails or needs guided intervention. Many clients combine both.",
        },
        {
          q: "What if the fix is really a new feature?",
          a: "We say so early, estimate it as a project and keep support capacity for true incidents.",
        },
        {
          q: "Do you support sites you did not build?",
          a: "Sometimes, after an audit. Legacy unknown stacks may need a paid discovery before we accept ongoing support.",
        },
      ],
      related: [
        { href: paths.websiteMaintenance, label: "Website maintenance" },
        { href: paths.customSoftware, label: "Custom software" },
        { href: paths.webshops, label: "Online stores" },
        { href: paths.aiAutomation, label: "AI automation" },
      ],
    },
    nl: {
      metaTitle: "Technische support",
      metaDescription:
        "Technische support voor jouw VDB Digital Software-stack — incidenttriage, fixes en begeleide wijzigingen met duidelijke severity en responseverwachtingen.",
      title: "Technische support",
      description:
        "Wanneer iets stukgaat of een wijziging zorgvuldige handen nodig heeft, helpt onze supportdesk met triëren, oplossen en adviseren — met afgesproken kanalen en severity, geen vage “ping ons maar”-belofte.",
      problem: {
        title: "Issues blijven liggen zonder duidelijke eigenaar",
        body: "Formulieren falen, webhooks missen events of een deploy gedraagt zich vreemd. Zonder supportpad kaatsen die problemen tussen freelancers en inboxthreads.",
      },
      builds: {
        title: "Een gestructureerde supportrelatie",
        body: "Wij bepalen hoe je issues meldt, hoe we severity indelen, wat onder support valt versus een project, en hoe we communiceren tot oplossing of een gescopte vervolgstap.",
      },
      benefits: [
        "Een bekend kanaal wanneer productie zich vreemd gedraagt",
        "Snellere triage omdat we jouw stack kennen",
        "Eerlijke scheiding tussen supportfixes en nieuw featurewerk",
        "Schriftelijke uitkomsten zodat jouw team leert wat er is gewijzigd",
      ],
      features: [
        "Ticketintake via afgesproken kanalen",
        "Severity-indeling en responstargets",
        "Bugfix en troubleshooting van integraties",
        "Begeleide configuratiehulp voor opgeleverde systemen",
        "Post-incident notities bij materiële events",
        "Optionele combinatie van support + onderhoudsplannen",
      ],
      process: [
        "Systemen en toegangslijst bevestigen",
        "Supportkanaal en uren vastleggen",
        "Triage → reproduceren → fixen of escaleren naar project",
        "Afsluiten met samenvatting en preventienotities wanneer nuttig",
      ],
      integrations: [
        "Jouw productie-apps en admintools",
        "Mollie, WhatsApp of chatvendors in jouw stack",
        "Monitoringalerts doorgestuurd naar support",
      ],
      security: [
        "Geverifieerde aanvrageridentiteit voor bevoorrechte wijzigingen",
        "Tijdelijke elevated access wanneer nodig",
        "Geen losse productiewijzigingen zonder tickettrail",
        "Secrets roteren bij vermoeden van exposure",
      ],
      whoFor: [
        "Klanten met webshops, automatiseringen of maatwerkapps die wij bouwden",
        "Teams die meer nodig hebben dan “e-mail de developer en hoop”",
        "Bedrijven die support combineren met een onderhoudsretainer",
      ],
      included: [
        "Supportkanaal en severity-model",
        "In-scope incident- en defectafhandeling",
        "Advies over veilige configuratie van opgeleverde features",
        "Escalatiepad naar vaste-prijs projectwerk wanneer nodig",
      ],
      notIncluded: [
        "Onbeperkte featureontwikkeling onder het supportlabel",
        "Support voor third-party tools die wij niet hebben geïmplementeerd",
        "Gegarandeerde response in seconden of 100% uptime-SLA’s tenzij gecontracteerd",
        "On-site hardware of kantoor-IT-support",
      ],
      extensions: [
        "Websiteonderhoudsretainer",
        "Conversie- of performance-onderzoekssprints",
        "Maatwerksoftware-uitbreidingen",
      ],
      faq: [
        {
          q: "Is dit hetzelfde als websiteonderhoud?",
          a: "Onderhoud is proactieve zorg en kleine wijzigingen. Support is reactieve hulp wanneer iets faalt of begeleide interventie nodig is. Veel klanten combineren beide.",
        },
        {
          q: "Wat als de fix eigenlijk een nieuwe feature is?",
          a: "Dat zeggen we vroeg, offreren we als project en houden we supportcapaciteit vrij voor echte incidenten.",
        },
        {
          q: "Supporten jullie ook sites die jullie niet bouwden?",
          a: "Soms, na een audit. Onbekende legacy stacks kunnen eerst betaalde discovery nodig hebben voordat we doorlopende support accepteren.",
        },
      ],
      related: [
        { href: paths.websiteMaintenance, label: "Websiteonderhoud" },
        { href: paths.customSoftware, label: "Maatwerksoftware" },
        { href: paths.webshops, label: "Webshops" },
        { href: paths.aiAutomation, label: "AI-automatisering" },
      ],
    },
  },

  "conversion-optimisation": {
    en: {
      metaTitle: "Conversion Optimisation",
      metaDescription:
        "Practical conversion optimisation for your website or store — clarity, structure and UX improvements without fake metrics or ranking guarantees.",
      title: "Conversion optimisation",
      description:
        "Improve how visitors understand your offer and take the next step. We diagnose friction on key pages and ship focused UX, copy and structure changes you can measure.",
      problem: {
        title: "Traffic without clarity wastes attention",
        body: "Pages that bury the offer, hide proof or overload forms leave interest on the table. Guesswork redesigns without a hypothesis rarely move the needle.",
      },
      builds: {
        title: "Focused experiments and shippable improvements",
        body: "We review key journeys, prioritise friction, implement agreed changes to layout, messaging and forms, and define how you will observe results in your analytics — without inventing vanity metrics.",
      },
      benefits: [
        "Clearer value proposition above the fold",
        "Fewer abandoned forms through simpler asks",
        "Stronger alignment between ads landing intent and page content (you manage ads)",
        "A backlog of improvements grounded in real user paths",
      ],
      features: [
        "Journey and page friction review",
        "Hypothesis backlog with priority",
        "UX and content adjustments on agreed pages",
        "Form and CTA restructuring",
        "Mobile experience fixes where they block action",
        "Measurement checklist using your analytics setup",
      ],
      process: [
        "Baseline review of key conversion pages",
        "Prioritised hypothesis workshop",
        "Implement the selected change set",
        "Handover with what to watch post-launch",
      ],
      integrations: [
        "Your analytics tool (with consent)",
        "Heatmap or session tools if you already have them",
        "CRM or form destinations for lead quality signals",
      ],
      security: [
        "No invasive tracking beyond what you approve",
        "Form changes keep server-side validation intact",
        "Privacy-aware handling of any recorded sessions you already collect",
      ],
      whoFor: [
        "Businesses with a live site that already gets traffic",
        "Stores with drop-off on product or checkout steps",
        "Teams that want iterative improvements, not a full rebuild yet",
      ],
      included: [
        "Scoped audit of agreed pages or funnels",
        "Implementation of the prioritised change set",
        "Before/after notes on what changed and why",
        "Guidance on observing outcomes in your tools",
      ],
      notIncluded: [
        "Guaranteed revenue or conversion-rate lifts",
        "Paid advertising management or budget spending",
        "Search ranking guarantees",
        "Invented case-study metrics or fake testimonials",
      ],
      extensions: [
        "Full redesign when structure is the blocker",
        "Website maintenance to keep wins stable",
        "A/B tooling setup when volume justifies it",
      ],
      faq: [
        {
          q: "Can you guarantee a higher conversion rate?",
          a: "No. We reduce clear friction and improve clarity. Results depend on traffic quality, offer and market — we will not invent a percentage promise.",
        },
        {
          q: "Do you run our Google or Meta ads?",
          a: "No. We can make landing experiences match the intent of campaigns you run, but we do not manage ad accounts.",
        },
        {
          q: "Is this the same as a new website?",
          a: "Not necessarily. Many sprints improve existing pages. If the foundation is wrong, we will recommend a rebuild instead of polishing a weak structure.",
        },
      ],
      related: [
        { href: paths.websites, label: "Custom websites" },
        { href: paths.webshops, label: "Online stores" },
        { href: paths.websiteMaintenance, label: "Website maintenance" },
        { href: paths.livechat, label: "Live chat" },
      ],
    },
    nl: {
      metaTitle: "Conversie-optimalisatie",
      metaDescription:
        "Praktische conversie-optimalisatie voor jouw website of webshop — helderheid, structuur en UX-verbeteringen zonder nepmetrics of rankinggaranties.",
      title: "Conversie-optimalisatie",
      description:
        "Verbeter hoe bezoekers jouw aanbod begrijpen en de volgende stap zetten. Wij diagnosticeren frictie op kernpagina's en leveren gerichte UX-, copy- en structuurwijzigingen die je kunt volgen.",
      problem: {
        title: "Traffic zonder helderheid verspilt aandacht",
        body: "Pagina's die het aanbod begraven, bewijs verstoppen of formulieren overladen laten interesse liggen. Redesign op gevoel zonder hypothese beweegt zelden de naald.",
      },
      builds: {
        title: "Gerichte experimenten en shipbare verbeteringen",
        body: "Wij bekijken kernjourneys, prioriteren frictie, implementeren afgesproken wijzigingen in layout, boodschap en formulieren, en bepalen hoe jij resultaten observeert in analytics — zonder vanity metrics te verzinnen.",
      },
      benefits: [
        "Duidelijkere value proposition above the fold",
        "Minder afgebroken formulieren door eenvoudigere vragen",
        "Sterkere aansluiting tussen ad-intentie en paginacontent (jij beheert de ads)",
        "Een backlog van verbeteringen gebaseerd op echte gebruikerspaden",
      ],
      features: [
        "Journey- en paginafrictiereview",
        "Hypothesebacklog met prioriteit",
        "UX- en contentaanpassingen op afgesproken pagina's",
        "Herstructurering van formulieren en CTA's",
        "Mobiele UX-fixes waar actie blokkeert",
        "Meetchecklist op basis van jouw analytics-setup",
      ],
      process: [
        "Baseline-review van kernconversiepagina's",
        "Prioriteitenworkshop met hypotheses",
        "Geselecteerde changeset implementeren",
        "Overdracht met wat je na livegang moet volgen",
      ],
      integrations: [
        "Jouw analytics-tool (met toestemming)",
        "Heatmap- of sessiontools als je die al hebt",
        "CRM of formbestemmingen voor leadkwaliteitssignalen",
      ],
      security: [
        "Geen invasieve tracking buiten wat jij goedkeurt",
        "Formulierwijzigingen houden server-side validatie intact",
        "Privacybewuste omgang met sessies die je al verzamelt",
      ],
      whoFor: [
        "Bedrijven met een live site die al traffic krijgt",
        "Webshops met uitval op product- of checkoutstappen",
        "Teams die iteratieve verbeteringen willen, nog geen volledige rebuild",
      ],
      included: [
        "Gescopte audit van afgesproken pagina's of funnels",
        "Implementatie van de geprioriteerde changeset",
        "Before/after-notities over wat er is gewijzigd en waarom",
        "Richtlijnen om uitkomsten in jouw tools te volgen",
      ],
      notIncluded: [
        "Gegarandeerde omzet- of conversiestijgingen",
        "Beheer van betaalde advertising of mediabudget",
        "Gegarandeerde zoekranglijsten",
        "Verzonnen case-study metrics of nep-testimonials",
      ],
      extensions: [
        "Volledige redesign wanneer structuur de blokkade is",
        "Websiteonderhoud om wins stabiel te houden",
        "A/B-tooling wanneer volume dat rechtvaardigt",
      ],
      faq: [
        {
          q: "Kunnen jullie een hogere conversieratio garanderen?",
          a: "Nee. Wij verminderen duidelijke frictie en verbeteren helderheid. Resultaten hangen af van traffickwaliteit, aanbod en markt — wij verzinnen geen percentagebelofte.",
        },
        {
          q: "Runnen jullie onze Google- of Meta-ads?",
          a: "Nee. Wij kunnen landingservaringen laten aansluiten op campagnes die jij runt, maar beheren geen ad-accounts.",
        },
        {
          q: "Is dit hetzelfde als een nieuwe website?",
          a: "Niet per se. Veel sprints verbeteren bestaande pagina's. Als het fundament verkeerd is, raden we een rebuild aan in plaats van een zwakke structuur te poetsen.",
        },
      ],
      related: [
        { href: paths.websites, label: "Maatwerkwebsites" },
        { href: paths.webshops, label: "Webshops" },
        { href: paths.websiteMaintenance, label: "Websiteonderhoud" },
        { href: paths.livechat, label: "Livechat" },
      ],
    },
  },

  "custom-software": {
    en: {
      metaTitle: "Custom Software",
      metaDescription:
        "Custom software and internal tools built around your workflows — scoped discovery, secure delivery and room to extend.",
      title: "Custom software",
      description:
        "When off-the-shelf tools force workarounds, we design and build software that matches how your business actually operates — portals, admin tools, system integrations and domain-specific apps.",
      problem: {
        title: "Spreadsheets and duct-taped SaaS hit a ceiling",
        body: "Unique pricing rules, partner portals or operational workflows rarely fit a generic product. Teams invent shadow processes that nobody owns and nobody secures well.",
      },
      builds: {
        title: "Software shaped to your domain",
        body: "We run discovery, propose an architecture that fits your constraints, build in iterative slices you can use, and document how your team operates and extends the system later.",
      },
      benefits: [
        "Workflows that match your real process instead of the vendor’s",
        "Less manual reconciliation between disconnected tools",
        "Access control and audit trails designed for your roles",
        "A roadmap of slices so value arrives before the “complete” vision",
      ],
      features: [
        "Discovery and technical scope definition",
        "UX for internal or customer-facing apps",
        "Secure APIs and role-based access",
        "Integrations with systems you already run",
        "Admin tooling for day-to-day operations",
        "Handover docs and optional maintenance bridge",
      ],
      process: [
        "Discovery workshops and success criteria",
        "Architecture and milestone plan",
        "Build in reviewable increments",
        "Hardening, training and launch support",
      ],
      integrations: [
        "Accounting, CRM or ERP APIs where available",
        "Payment providers such as Mollie when commerce is involved",
        "Identity providers or SSO when required",
        "Messaging and notification channels",
      ],
      security: [
        "Authn/authz designed around real roles",
        "Server-side authorization on every privileged action",
        "Secrets management outside the repository and client",
        "Input validation and least-privilege data access",
      ],
      whoFor: [
        "Companies whose process is the product advantage",
        "Teams coordinating partners, inventory or field work in bespoke ways",
        "Businesses ready to replace fragile spreadsheet systems",
      ],
      included: [
        "Scoped discovery outcome and build plan",
        "Implemented milestones agreed in the proposal",
        "Environments and deployment approach as defined",
        "Operational documentation for your admins",
      ],
      notIncluded: [
        "Open-ended build-anything retainers without milestones",
        "Guaranteed business ROI percentages",
        "Taking ownership of your regulated professional decisions",
        "Perpetual free feature requests after handover",
      ],
      extensions: [
        "Technical support after launch",
        "AI automation on top of the new system",
        "Customer-facing website or store that plugs into the app",
      ],
      faq: [
        {
          q: "How do you keep custom projects from ballooning?",
          a: "We slice delivery into milestones with explicit in/out scope. New ideas become change requests with impact on timeline and budget.",
        },
        {
          q: "Do we own the code?",
          a: "Licensing and ownership are defined in your agreement. We prefer transparent terms so you are not locked into a black box.",
        },
        {
          q: "Can this connect to our website or WhatsApp flows?",
          a: "Yes. Many projects expose APIs or events that websites, stores and messaging automations can use.",
        },
      ],
      related: [
        { href: paths.aiAutomation, label: "AI automation" },
        { href: paths.webshops, label: "Online stores" },
        { href: paths.technicalSupport, label: "Technical support" },
        { href: paths.websites, label: "Custom websites" },
      ],
    },
    nl: {
      metaTitle: "Maatwerksoftware",
      metaDescription:
        "Maatwerksoftware en interne tools rond jouw workflows — discovery met scope, veilige oplevering en ruimte om uit te breiden.",
      title: "Maatwerksoftware",
      description:
        "Wanneer standaardtools workarounds forceren, ontwerpen en bouwen wij software die past bij hoe jouw bedrijf echt werkt — portals, admintools, koppelingen tussen systemen en domeinspecifieke apps.",
      problem: {
        title: "Spreadsheets en dichtgetapte SaaS raken een plafond",
        body: "Unieke prijsregels, partnerportals of operationele workflows passen zelden in een generiek product. Teams verzinnen schaduwprocessen die niemand eigenaar is en niemand goed beveiligt.",
      },
      builds: {
        title: "Software gevormd naar jouw domein",
        body: "Wij doen discovery, stellen een architectuur voor die bij jouw constraints past, bouwen in iteratieve slices die je kunt gebruiken, en documenteren hoe jouw team het systeem later runt en uitbreidt.",
      },
      benefits: [
        "Workflows die bij jouw echte proces passen in plaats van bij de vendor",
        "Minder handmatige afstemming tussen losse tools",
        "Toegangscontrole en audit trails ontworpen rond jouw rollen",
        "Een roadmap in slices zodat waarde er is vóór de “complete” visie",
      ],
      features: [
        "Discovery en technische scopebepaling",
        "UX voor interne of klantgerichte apps",
        "Veilige API's en role-based access",
        "Integraties met systemen die je al draait",
        "Admintools voor dagelijkse operatie",
        "Overdrachtsdocs en optionele onderhoudsbrug",
      ],
      process: [
        "Discovery-workshops en succescriteria",
        "Architectuur en mijlpalenplan",
        "Bouwen in reviewbare incrementele stappen",
        "Hardening, training en livegangsondersteuning",
      ],
      integrations: [
        "Boekhoud-, CRM- of ERP-API's waar beschikbaar",
        "Betaalproviders zoals Mollie wanneer commerce speelt",
        "Identity providers of SSO wanneer vereist",
        "Messaging- en notificatiekanalen",
      ],
      security: [
        "Authn/authz ontworpen rond echte rollen",
        "Server-side autorisatie op elke bevoorrechte actie",
        "Secretsbeheer buiten repository en client",
        "Inputvalidatie en least-privilege datatoegang",
      ],
      whoFor: [
        "Bedrijven waarvan het proces het concurrentievoordeel is",
        "Teams die partners, voorraad of buitendienst op maat coördineren",
        "Organisaties die fragiele spreadsheetsystemen willen vervangen",
      ],
      included: [
        "Gescopte discovery-uitkomst en bouwplan",
        "Geïmplementeerde mijlpalen zoals in het voorstel",
        "Omgevingen en deploy-aanpak zoals afgesproken",
        "Operationele documentatie voor jouw admins",
      ],
      notIncluded: [
        "Open-ended build-anything retainers zonder mijlpalen",
        "Gegarandeerde ROI-percentages",
        "Het overnemen van jouw gereguleerde professionele beslissingen",
        "Eeuwige gratis featureverzoeken na overdracht",
      ],
      extensions: [
        "Technische support na livegang",
        "AI-automatisering bovenop het nieuwe systeem",
        "Klantgerichte website of webshop die op de app aansluit",
      ],
      faq: [
        {
          q: "Hoe voorkomen jullie dat maatwerkprojecten uitdijen?",
          a: "We snijden oplevering in mijlpalen met expliciete in/out scope. Nieuwe ideeën worden change requests met impact op tijdlijn en budget.",
        },
        {
          q: "Van wie is de code?",
          a: "Licentie en ownership staan in jouw overeenkomst. Wij prefereren transparante voorwaarden zodat je niet vastzit in een black box.",
        },
        {
          q: "Kan dit koppelen aan onze website of WhatsApp-flows?",
          a: "Ja. Veel projecten exposen API's of events die websites, webshops en messaging-automatisering kunnen gebruiken.",
        },
      ],
      related: [
        { href: paths.aiAutomation, label: "AI-automatisering" },
        { href: paths.webshops, label: "Webshops" },
        { href: paths.technicalSupport, label: "Technische support" },
        { href: paths.websites, label: "Maatwerkwebsites" },
      ],
    },
  },
} as const satisfies Record<string, BilingualSolutionContent>;

export type SolutionSlug = keyof typeof solutionsContent;

export function getSolutionContent(
  slug: SolutionSlug,
  locale: Locale,
): SolutionContent {
  return solutionsContent[slug][locale];
}
