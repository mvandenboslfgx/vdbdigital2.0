"use client";

import { BrandLink } from "@/components/brand/BrandLink";
import { VdbLogo } from "@/components/brand/VdbLogo";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utilities/cn";

interface LogoProps {
  className?: string;
  /** Preferred rendered height in CSS pixels (mobile ~36–44, desktop ~44–52). */
  height?: number;
  priority?: boolean;
  linked?: boolean;
  /** light = for dark backgrounds; dark = for light backgrounds */
  variant?: "light" | "dark";
  lockup?: "header" | "stacked" | "mark" | "wordmark" | "micro";
}

export function Logo({
  className,
  height = 40,
  priority = false,
  linked = true,
  variant = "light",
  lockup = "header",
}: LogoProps) {
  const sizeClass =
    height <= 36
      ? "h-9 w-auto"
      : height <= 44
        ? "h-10 w-auto sm:h-11"
        : height <= 52
          ? "h-11 w-auto sm:h-12"
          : "h-12 w-auto sm:h-14";

  if (linked) {
    return (
      <BrandLink
        variant={variant}
        priority={priority}
        className={className}
        logoClassName={cn(sizeClass, "object-contain")}
      />
    );
  }

  return (
    <span className={cn("inline-flex shrink-0", className)}>
      <VdbLogo
        lockup={lockup}
        variant={variant}
        priority={priority}
        className={cn(sizeClass, "object-contain")}
      />
    </span>
  );
}

/** Canonical organization / schema logo (square mark). */
export const brandLogoPath = siteConfig.brand.logo;
