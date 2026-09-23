import { paths } from "@/i18n/config";

export const seoPaths = {
  websiteLatenMaken: paths.websiteLatenMaken,
  webdesign: paths.webdesign,
  webshopLatenMaken: paths.webshopLatenMaken,
  aiAutomatisering: paths.aiAutomatisering,
  aiChatbot: paths.aiChatbot,
  whatsappAutomatisering: paths.whatsappAutomatisering,
  maatwerkSoftware: paths.maatwerkSoftware,
  klantportaalLatenMaken: paths.klantportaalLatenMaken,
  kennisbank: paths.kennisbank ,
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

/** High-intent services that get genuinely useful regional pages. */
export const seoLocalServiceKeys = [
  "websiteLatenMaken",
  "webdesign",
  "aiAutomatisering",
  "maatwerkSoftware",
  "klantportaalLatenMaken",
] as const satisfies readonly SeoLandingKey[];

export function getAllSeoSitemapPaths(): string[] {
  const landing = seoLandingKeys.map((key) => seoPaths[key]);
  const local = seoLocalLocations.flatMap((location) =>
    seoLocalServiceKeys.map((key) => `${seoPaths[key]}/${location}`),
  );
  return [...landing, seoPaths.kennisbank, ...local];
}
