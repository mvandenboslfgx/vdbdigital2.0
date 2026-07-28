"use client";

import dynamic from "next/dynamic";
import type { CookieBannerLabels } from "@/components/consent/cookie-banner";

const DeferredConsentIsland = dynamic(
  () =>
    import("@/components/consent/deferred-consent-island").then(
      (m) => m.DeferredConsentIsland,
    ),
  { ssr: false },
);

type ConsentIslandLoaderProps = CookieBannerLabels & {
  contactLabel: string;
};

/** Tiny client boundary — keeps consent/FAB out of the first-load JS graph. */
export function ConsentIslandLoader(props: ConsentIslandLoaderProps) {
  return <DeferredConsentIsland {...props} />;
}
