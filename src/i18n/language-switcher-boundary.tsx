"use client";

import { Suspense } from "react";
import { LanguageSwitcher } from "@/i18n/language-switcher";

/** `useSearchParams` requires a Suspense boundary in the App Router. */
export function LanguageSwitcherBoundary({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Suspense
      fallback={
        <div
          className={className}
          aria-hidden="true"
          style={{
            minHeight: compact ? "2.25rem" : "2.5rem",
            minWidth: compact ? "4.5rem" : "5rem",
          }}
        />
      }
    >
      <LanguageSwitcher className={className} compact={compact} />
    </Suspense>
  );
}
