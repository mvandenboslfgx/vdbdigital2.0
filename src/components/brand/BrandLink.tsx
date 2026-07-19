"use client";

import { VdbLogo } from "@/components/brand/VdbLogo";
import { LocaleLink } from "@/i18n/locale-link";
import { cn } from "@/lib/utilities/cn";

type BrandLinkProps = {
  className?: string;
  logoClassName?: string;
  variant?: "light" | "dark";
  priority?: boolean;
};

export function BrandLink({
  className,
  logoClassName,
  variant = "light",
  priority = false,
}: BrandLinkProps) {
  return (
    <LocaleLink
      href="/"
      aria-label="VDB Digital Software — naar de homepage"
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      <VdbLogo
        lockup="header"
        variant={variant}
        priority={priority}
        className={
          logoClassName ??
          "h-9 w-auto max-w-[min(10rem,calc(100vw-11rem))] object-contain object-left sm:h-11 sm:max-w-[14rem] lg:h-12 lg:max-w-none"
        }
        alt=""
      />
    </LocaleLink>
  );
}
