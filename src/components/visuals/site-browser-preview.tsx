import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utilities/cn";

const LIVE_URL = "https://www.vermeulenbouwservice.nl/";

export type SiteBrowserPreviewProps = {
  desktopSrc: string;
  mobileSrc: string;
  desktopAlt: string;
  mobileAlt: string;
  address?: string;
  liveLabel?: string;
  openHint?: string;
  className?: string;
  /** Larger composition for case hero */
  size?: "featured" | "hero";
};

/**
 * Luxury browser + phone mockup with local screenshots.
 * No iframe — click opens the live site in a new tab.
 */
export function SiteBrowserPreview({
  desktopSrc,
  mobileSrc,
  desktopAlt,
  mobileAlt,
  address = "vermeulenbouwservice.nl",
  liveLabel = "Live",
  openHint = "Open live website",
  className,
  size = "featured",
}: SiteBrowserPreviewProps) {
  const desktopAspect = size === "hero" ? "aspect-[16/11]" : "aspect-[16/11]";

  return (
    <div className={cn("relative w-full", className)}>
      <a
        href={LIVE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group relative block rounded-2xl outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        aria-label={`${openHint}: ${address}`}
      >
        {/* Desktop browser chrome */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border/80 bg-surface-elevated",
            "shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55),0_8px_24px_-8px_rgba(0,0,0,0.35)]",
            "transition-transform duration-500 ease-out",
            "motion-safe:group-hover:-translate-y-1",
          )}
        >
          <div className="flex items-center gap-3 border-b border-border/70 bg-surface px-3.5 py-2.5 sm:px-4">
            <div className="flex gap-1.5 shrink-0" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/80 px-2.5 py-1">
                <span className="truncate text-[11px] sm:text-xs text-muted tracking-wide">
                  {address}
                </span>
              </div>
            </div>
            <span className="shrink-0 rounded-md border border-border/70 bg-background/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
              {liveLabel}
            </span>
          </div>

          <div
            className={cn(
              "relative overflow-hidden bg-background",
              desktopAspect,
            )}
          >
            <div
              className={cn(
                "absolute inset-0 transition-transform duration-[1.8s] ease-out will-change-transform",
                "motion-safe:group-hover:-translate-y-[6%]",
              )}
            >
              <Image
                src={desktopSrc}
                alt={desktopAlt}
                width={1440}
                height={1100}
                className="h-auto w-full object-cover object-top"
                sizes={
                  size === "hero"
                    ? "(max-width: 768px) 100vw, 720px"
                    : "(max-width: 768px) 100vw, 560px"
                }
                priority={size === "hero"}
              />
            </div>

            {/* Hover affordance */}
            <div
              className={cn(
                "pointer-events-none absolute inset-0 flex items-end justify-end p-3 sm:p-4",
                "bg-gradient-to-t from-black/35 via-transparent to-transparent",
                "opacity-90 motion-safe:opacity-0 motion-safe:transition-opacity motion-safe:duration-300",
                "motion-safe:group-hover:opacity-100",
              )}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
                {openHint}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>

        {/* Phone mockup — overlaps desktop (decorative within the live-site link) */}
        <div
          className={cn(
            "pointer-events-none absolute z-10",
            "right-2 bottom-[-8%] sm:right-4 sm:bottom-[-6%] md:right-5 md:bottom-[-4%]",
            "w-[28%] min-w-[96px] max-w-[148px] sm:max-w-[168px]",
            "transition-transform duration-500 ease-out",
            "motion-safe:group-hover:-translate-y-1.5 motion-safe:group-hover:translate-x-0.5",
          )}
        >
          <div
            className={cn(
              "overflow-hidden rounded-[1.35rem] border-[3px] border-[#1a1c22]",
              "bg-[#1a1c22] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.65)]",
            )}
          >
            <div className="mx-auto mt-1.5 mb-1 h-1 w-8 rounded-full bg-white/15" />
            <div className="relative aspect-[390/844] overflow-hidden bg-background">
              <Image
                src={mobileSrc}
                alt={mobileAlt}
                width={390}
                height={844}
                className="h-full w-full object-cover object-top"
                sizes="168px"
              />
            </div>
          </div>
        </div>
      </a>
      {/* Spacer so overlapping phone doesn't collide with following content */}
      <div className="h-8 sm:h-10 md:h-6" aria-hidden="true" />
    </div>
  );
}

export { LIVE_URL as VERMEULEN_LIVE_URL };
