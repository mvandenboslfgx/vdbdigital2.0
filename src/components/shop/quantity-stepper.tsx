"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function QuantityStepper({
  min,
  max,
  value,
  label,
}: {
  min: number;
  max: number;
  value: number;
  label: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setQuantity(next: number) {
    const clamped = Math.min(max, Math.max(min, next));
    const params = new URLSearchParams(searchParams.toString());
    params.set("quantity", String(clamped));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-2">
      <p className="text-label text-light-muted">{label}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-light-border text-light-foreground disabled:opacity-40"
          onClick={() => setQuantity(value - 1)}
          disabled={value <= min}
          aria-label="Minder"
        >
          −
        </button>
        <span className="min-w-10 text-center text-lg font-semibold text-light-foreground tabular-nums">
          {value}
        </span>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-light-border text-light-foreground disabled:opacity-40"
          onClick={() => setQuantity(value + 1)}
          disabled={value >= max}
          aria-label="Meer"
        >
          +
        </button>
      </div>
      <p className="text-xs text-light-muted">
        {min}–{max}
      </p>
    </div>
  );
}
