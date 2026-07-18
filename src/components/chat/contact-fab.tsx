"use client";

import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { LocaleLink } from "@/i18n/locale-link";
import { paths } from "@/i18n/config";
import { useT } from "@/i18n/provider";

/**
 * Floating contact entry — no third-party chat widgets.
 * Links to the contact page only.
 */
export function ContactFab() {
  const pathname = usePathname();
  const t = useT();

  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed z-40 flex flex-col gap-2 items-end bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]">
      <LocaleLink
        href={paths.contact}
        className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-white shadow-lg hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={t("nav.contact")}
      >
        <MessageSquare className="h-5 w-5 shrink-0" aria-hidden />
        <span className="pr-1 text-small font-medium max-sm:sr-only">{t("nav.contact")}</span>
      </LocaleLink>
    </div>
  );
}
