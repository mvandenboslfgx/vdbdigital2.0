import { paths } from "@/i18n/config";

/** Dutch keyword landing paths — NL locale is primary; EN redirects to equivalent solution. */
export const seoPaths = {
  websiteLatenMaken: paths.websiteLatenMaken,
  webdesign: paths.webdesign,
  webshopLatenMaken: paths.webshopLatenMaken,
  aiAutomatisering: paths.aiAutomatisering,
  aiChatbot: paths.aiChatbot,
  whatsappAutomatisering: paths.whatsappAutomatisering,
  maatwerkSoftware: paths.maatwerkSoftware,
  klantportaalLatenMaken: paths.klantportaalLatenMaken,
  kennisbank: paths.kennisbank,
} as const;

export type SeoLandingKey =
  | "websiteLatenMaken"
  | "webdesign"
  | "webshopLatenMaken"
  | "aiAutomatisering"
  | "aiChatbot"
  | "whatsappAutomatisering"
  | "maatwerkSoftware"
  | "klantportaalLatenMaken";

export const seoLandingKeys: SeoLandingKey[] = [
  "websiteLatenMaken",
  "webdesign",
  "webshopLatenMaken",
  "aiAutomatisering",
  "aiChatbot",
  "whatsappAutomatisering",
  "maatwerkSoftware",
  "klantportaalLatenMaken",
];

/** Maps Dutch SEO path → English canonical solution path for hreflang / EN redirect. */
export const seoEnglishEquivalent: Record<string, string> = {
  [seoPaths.websiteLatenMaken]: paths.websites,
  [seoPaths.webdesign]: paths.websites,
  [seoPaths.webshopLatenMaken]: paths.webshops,
  [seoPaths.aiAutomatisering]: paths.aiAutomation,
  [seoPaths.aiChatbot]: paths.livechat,
  [seoPaths.whatsappAutomatisering]: paths.whatsappAi,
  [seoPaths.maatwerkSoftware]: paths.customSoftware,
  [seoPaths.klantportaalLatenMaken]: paths.customSoftware,
};

export function getSeoPath(key: SeoLandingKey): string {
  return seoPaths[key];
}

export const seoLocalLocations = ["hoeksche-waard", "rotterdam"] as const;
export type SeoLocalLocation = (typeof seoLocalLocations)[number];

export const seoLocalParentKeys: Record<
  SeoLocalLocation,
  { website: SeoLandingKey; webdesign: SeoLandingKey }
> = {
  "hoeksche-waard": {
    website: "websiteLatenMaken",
    webdesign: "webdesign",
  },
  rotterdam: {
    website: "websiteLatenMaken",
    webdesign: "webdesign",
  },
};

/** All indexable SEO routes for sitemap (NL only — EN uses solution equivalents). */
export function getAllSeoSitemapPaths(): string[] {
  const landing = seoLandingKeys.map((key) => seoPaths[key]);
  const local: string[] = [];
  for (const loc of seoLocalLocations) {
    local.push(`${seoPaths.websiteLatenMaken}/${loc}`);
    local.push(`${seoPaths.webdesign}/${loc}`);
  }
  return [...landing, seoPaths.kennisbank, ...local];
}
