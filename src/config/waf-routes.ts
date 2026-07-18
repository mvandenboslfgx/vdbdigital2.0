/**
 * Werkelijke HTTP-mutatieroutes — single source of truth voor WAF-documentatie en tests.
 * Next.js Server Actions POSTen naar de pagina-URL waar de action wordt aangeroepen.
 */
export const MAX_WAF_WINDOW_MINUTES = 10;

/** Paden die nooit in een blokkerende publieke rate-limitregel mogen */
export const WAF_EXCLUDED_PATHS = ["/api/webhooks/mollie"] as const;

export type MutationRoute = {
  feature: string;
  method: "POST";
  /** Werkelijk requestpad (geen conceptuele alias) */
  path: string;
  /** Implementatie */
  implementation: string;
  access: "public" | "authenticated" | "server-to-server";
  /** Server action / route handler naam */
  handler: string;
  /** Optioneel: dynamisch padpatroon */
  pathPattern?: string;
};

/** Statische pagina's met form Server Actions */
export const FORM_MUTATION_ROUTES: MutationRoute[] = [
  {
    feature: "Contactformulier",
    method: "POST",
    path: "/contact",
    implementation: "Next.js Server Action (useActionState + form POST)",
    access: "public",
    handler: "submitContactAction",
  },
  {
    feature: "Offerteformulier",
    method: "POST",
    path: "/quote",
    implementation: "Next.js Server Action (useActionState + form POST)",
    access: "public",
    handler: "submitQuoteAction",
  },
  {
    feature: "Supportformulier",
    method: "POST",
    path: "/support",
    implementation: "Next.js Server Action (useActionState + form POST)",
    access: "public",
    handler: "submitSupportAction",
  },
  {
    feature: "Checkout / payment creation",
    method: "POST",
    path: "/checkout",
    implementation: "Next.js Server Action → Mollie payment create + redirect",
    access: "public",
    handler: "submitCheckoutAction",
  },
];

/** Client-aangeroepen Server Actions (POST naar huidige pagina-URL) */
export const CART_MUTATION_ROUTES: MutationRoute[] = [
  {
    feature: "Product toevoegen aan winkelwagen",
    method: "POST",
    path: "/shop/{slug}",
    pathPattern: "/shop/*",
    implementation: "Next.js Server Action (startTransition + onClick)",
    access: "public",
    handler: "addToCartAction",
  },
  {
    feature: "Cart mutation",
    method: "POST",
    path: "/cart",
    implementation: "Next.js Server Action (startTransition + onClick)",
    access: "public",
    handler: "removeFromCartAction / updateQuantityAction",
  },
];

/** Echte Route Handlers (route.ts) */
export const API_MUTATION_ROUTES: MutationRoute[] = [
  {
    feature: "Mollie webhook",
    method: "POST",
    path: "/api/webhooks/mollie",
    implementation: "Route Handler (application/x-www-form-urlencoded)",
    access: "server-to-server",
    handler: "POST in src/app/api/webhooks/mollie/route.ts",
  },
];

/** Publieke mutaties die WAF mag limiteren (webhook uitgesloten) */
export const WAF_PUBLIC_MUTATION_PATHS = [
  "/contact",
  "/quote",
  "/support",
  "/checkout",
  "/cart",
] as const;

export const WAF_PUBLIC_MUTATION_PATH_PREFIXES = ["/shop/"] as const;

export const ALL_DOCUMENTED_MUTATION_ROUTES = [
  ...FORM_MUTATION_ROUTES,
  ...CART_MUTATION_ROUTES,
  ...API_MUTATION_ROUTES,
];
