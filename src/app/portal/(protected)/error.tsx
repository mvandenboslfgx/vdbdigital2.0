"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Safe client log — no tokens/PII; digest only.
    console.info(
      JSON.stringify({
        type: "portal_client_error",
        name: error.name,
        digest: error.digest ?? null,
        message: error.message?.slice(0, 120) ?? null,
      }),
    );
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
      <h1 className="text-h2">Deze pagina kon niet worden geladen</h1>
      <p className="text-muted text-small">
        Er ging iets mis bij het laden. Probeer opnieuw of ga terug naar het
        overzicht. Je sessie blijft actief wanneer je bent ingelogd.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted">Ref: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Opnieuw proberen
        </Button>
        <Link
          href="/portal"
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm"
        >
          Naar overzicht
        </Link>
      </div>
    </div>
  );
}
