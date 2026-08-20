"use client";

import { Suspense } from "react";
import { LanguageSwitcher } from "@/i18n/language-switcher";

/** `useSearchParams` requires a Suspense boundary in the App Router. */
export function LanguageSwitcherBoundary({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "compact";
}) {
  return (
    <Suspense
      fallback={
        <div
          className={className}
          aria-hidden="true"
          style={{
            minHeight: size === "compact" ? "2rem" : "2.75rem",
            minWidth: size === "compact" ? "4.5rem" : "5.5rem",
          }}
        />
      }
    >
      <LanguageSwitcher className={className} size={size} />
    </Suspense>
  );
}
