import { cn } from "@/lib/utilities/cn";

export type VdbLogoVariant = "light" | "dark";
export type VdbLogoLockup = "header" | "stacked" | "mark" | "wordmark" | "micro";

type VdbLogoProps = {
  className?: string;
  variant?: VdbLogoVariant;
  lockup?: VdbLogoLockup;
  priority?: boolean;
  alt?: string;
};

const dimensions: Record<VdbLogoLockup, { width: number; height: number }> = {
  header: { width: 1600, height: 280 },
  stacked: { width: 1400, height: 720 },
  mark: { width: 662, height: 293 },
  wordmark: { width: 1200, height: 210 },
  micro: { width: 512, height: 512 },
};

/**
 * Explicit CSS width+height derived from the lockup ratio.
 * Avoids Lighthouse "Media element lacking an explicit size" CLS on lazy footer logos.
 */
export function VdbLogo({
  className,
  variant = "light",
  lockup = "header",
  priority = false,
  alt = "VDB Digital Software",
}: VdbLogoProps) {
  const { width, height } = dimensions[lockup];
  const ratio = width / height;
  const cssHeight = "2.75rem"; // 44px / h-11 — stable across header/footer
  const cssWidth = `calc(${cssHeight} * ${ratio})`;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- sized box required for CLS gate
    <img
      src={`/brand/vdb-logo-${lockup}-${variant}.svg`}
      width={width}
      height={height}
      alt={alt}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn("object-contain object-left max-w-full", className)}
      style={{
        height: cssHeight,
        width: cssWidth,
        maxWidth: "min(100%, 14rem)",
        aspectRatio: `${width} / ${height}`,
      }}
    />
  );
}
