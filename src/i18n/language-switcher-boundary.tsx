"use client";

import { Suspense } from "react";
import { LanguageSwitcher } from "@/i18n/language-switcher";

/** `useSearchParams` requires a Suspense boundary in the App Router. */
export function LanguageSwitcherBoundary({
  className,
}: {
  className?: string;
}) {
  return (
    <Suspense
      fallback={
        <div
          className={className}
          aria-hidden="true"
          style={{ minHeight: "2.75rem", minWidth: "5.5rem" }}
        />
      }
    >
      <LanguageSwitcher className={className} />
    </Suspense>
  );
}
