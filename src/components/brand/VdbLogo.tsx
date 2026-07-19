import Image from "next/image";
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

export function VdbLogo({
  className,
  variant = "light",
  lockup = "header",
  priority = false,
  alt = "VDB Digital Software",
}: VdbLogoProps) {
  const { width, height } = dimensions[lockup];

  return (
    <Image
      src={`/brand/vdb-logo-${lockup}-${variant}.svg`}
      width={width}
      height={height}
      alt={alt}
      className={cn("h-10 w-auto object-contain sm:h-12", className)}
      priority={priority}
      unoptimized
    />
  );
}
