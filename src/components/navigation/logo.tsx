"use client";

import Image from "next/image";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utilities/cn";
import { LocaleLink } from "@/i18n/locale-link";

const LOGO_ASPECT = 1;

interface LogoProps {
  className?: string;
  height?: number;
  priority?: boolean;
  linked?: boolean;
}

export function Logo({
  className,
  height = 40,
  priority = false,
  linked = true,
}: LogoProps) {
  const width = Math.round(height * LOGO_ASPECT);

  const image = (
    <Image
      src={siteConfig.brand.logo}
      alt={siteConfig.brand.logoAlt}
      width={width}
      height={height}
      priority={priority}
      className="object-contain object-left"
      style={{ height, width: "auto", maxWidth: width }}
    />
  );

  if (!linked) {
    return <span className={cn("inline-flex shrink-0", className)}>{image}</span>;
  }

  return (
    <LocaleLink
      href="/"
      className={cn("inline-flex shrink-0 rounded-md overflow-hidden", className)}
      aria-label={`${siteConfig.name} — home`}
    >
      {image}
    </LocaleLink>
  );
}

export const brandLogoPath = siteConfig.brand.logo;
