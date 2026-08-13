"use client";

import { usePathname } from "next/navigation";
import { LocaleLink } from "@/i18n/locale-link";
import { paths } from "@/i18n/config";

/**
 * Floating contact entry — no third-party chat widgets.
 * Links to the contact page only. Inline SVG avoids lucide in the public island.
 */
export function ContactFab({ label }: { label: string }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed z-40 flex flex-col gap-2 items-end bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]">
      <LocaleLink
        href={paths.contact}
        className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-primary-fg shadow-lg hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={label}
      >
        <svg
          className="h-5 w-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="pr-1 text-small font-medium max-sm:sr-only">{label}</span>
      </LocaleLink>
    </div>
  );
}
