"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utilities/cn";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { paths } from "@/i18n/config";

const STORAGE_KEY = "vdb_founding_bar_dismissed";
const DISMISS_EVENT = "vdb-founding-bar-dismiss";

function isDismissed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(DISMISS_EVENT, onStoreChange);
  return () => window.removeEventListener(DISMISS_EVENT, onStoreChange);
}

interface FoundingClientBarProps {
  message: string;
  ctaLabel: string;
  dismissLabel: string;
}

/** Dismissible announcement bar — no fake scarcity or urgency timers */
export function FoundingClientBar({ message, ctaLabel, dismissLabel }: FoundingClientBarProps) {
  // Server snapshot must match first paint for undismissed visitors.
  // Returning `true` here hid the bar in SSR and showed it after hydrate → CLS.
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => false);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label={message}
      className="border-b border-primary/20 bg-primary-soft/40 text-sm"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-4 py-2.5 page-pad-x sm:gap-3">
        <p className="text-center text-foreground/90 min-w-0 flex-1 basis-full sm:basis-auto sm:flex-none">
          {message}
        </p>
        <LocaleLinkButton
          href={`${paths.contact}?intent=introduction`}
          size="sm"
          className="min-h-10 shrink-0"
        >
          {ctaLabel}
        </LocaleLinkButton>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(STORAGE_KEY, "1");
              window.dispatchEvent(new Event(DISMISS_EVENT));
            } catch {
              /* ignore */
            }
          }}
          className={cn(
            "inline-flex min-h-10 min-w-10 items-center justify-center rounded-md",
            "text-muted hover:text-foreground hover:bg-surface-elevated",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          )}
          aria-label={dismissLabel}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
