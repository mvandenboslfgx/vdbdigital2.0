"use client";

import dynamic from "next/dynamic";
import type { CookieBannerLabels } from "@/components/consent/cookie-banner";

const CookieBanner = dynamic(
  () =>
    import("@/components/consent/cookie-banner").then((m) => m.CookieBanner),
  { ssr: false },
);

export function CookieBannerLazy(props: CookieBannerLabels) {
  return <CookieBanner {...props} />;
}
