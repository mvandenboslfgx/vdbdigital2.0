"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { useConsent } from "@/components/consent/consent-provider";
import { getTawkEmbedUrl, isTawkEmbedConfigured } from "@/config/tawk";
import { WhatsAppButton, buildWhatsAppUrl } from "./whatsapp-button";
import { useT } from "@/i18n/provider";

declare global {
  interface Window {
    Tawk_API?: {
      maximize?: () => void;
      showWidget?: () => void;
      hideWidget?: () => void;
      onLoad?: () => void;
      setAttributes?: (attrs: Record<string, string>, callback?: () => void) => void;
    };
    Tawk_LoadStart?: Date;
  }
}

export function ChatProvider() {
  const pathname = usePathname();
  const { hasConsent } = useConsent();
  const injected = useRef(false);
  const t = useT();

  const isAdmin = pathname.startsWith("/admin");
  const embedUrl = getTawkEmbedUrl();
  const tawkReady = isTawkEmbedConfigured();
  const canLoadTawk =
    !isAdmin && hasConsent("functional") && tawkReady && embedUrl !== null;
  const whatsappUrl = buildWhatsAppUrl(t("forms.whatsappMessageDefault"));

  useEffect(() => {
    if (!canLoadTawk || !embedUrl || injected.current) return;
    injected.current = true;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const script = document.createElement("script");
    script.async = true;
    script.src = embedUrl;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");

    script.onload = () => {
      window.Tawk_API?.hideWidget?.();
    };

    document.body.appendChild(script);

    return () => {
      script.remove();
      injected.current = false;
    };
  }, [canLoadTawk, embedUrl]);

  if (isAdmin) return null;
  if (!canLoadTawk && !whatsappUrl) return null;

  return (
    <div className="fixed z-40 flex flex-col gap-2 items-end bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]">
      {canLoadTawk && (
        <button
          type="button"
          onClick={() => window.Tawk_API?.maximize?.()}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg hover:bg-primary-hover transition-colors"
          aria-label="Open livechat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}
      {!canLoadTawk && whatsappUrl && (
        <WhatsAppButton
          className="shadow-lg max-w-[calc(100vw-2rem)]"
          label="WhatsApp"
        />
      )}
    </div>
  );
}
