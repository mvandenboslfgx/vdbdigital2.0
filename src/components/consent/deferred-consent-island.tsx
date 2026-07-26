"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ConsentProvider } from "@/components/consent/consent-provider";
import type { CookieBannerLabels } from "@/components/consent/cookie-banner";

const CookieBanner = dynamic(
  () =>
    import("@/components/consent/cookie-banner").then((m) => m.CookieBanner),
  { ssr: false },
);

const ContactFab = dynamic(
  () => import("@/components/chat/contact-fab").then((m) => m.ContactFab),
  { ssr: false },
);

type DeferredConsentIslandProps = CookieBannerLabels & {
  contactLabel: string;
};

/**
 * Consent + FAB load after first paint / idle so they never compete with LCP.
 * Tracking remains blocked until the user accepts (banner still works).
 */
export function DeferredConsentIsland({
  contactLabel,
  ...cookieLabels
}: DeferredConsentIslandProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (
        window as Window & {
          requestIdleCallback: (
            cb: () => void,
            opts?: { timeout: number },
          ) => number;
          cancelIdleCallback: (id: number) => void;
        }
      ).requestIdleCallback(enable, { timeout: 1800 });
      return () => {
        cancelled = true;
        (
          window as Window & { cancelIdleCallback: (id: number) => void }
        ).cancelIdleCallback(id);
      };
    }

    const timer = globalThis.setTimeout(enable, 1);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timer);
    };
  }, []);

  if (!ready) return null;

  return (
    <ConsentProvider>
      <CookieBanner {...cookieLabels} />
      <ContactFab label={contactLabel} />
    </ConsentProvider>
  );
}
