"use client";

import { useEffect } from "react";

/**
 * Minimal marketing error boundary. Kept tiny so it does not inflate first-load JS
 * beyond the irreducible App Router client runtime.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="mb-4 text-2xl font-semibold">Something went wrong</h1>
      <p className="mb-8 text-muted">This page could not be loaded.</p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg hover:bg-primary-hover"
      >
        Try again
      </button>
    </div>
  );
}
