"use client";

import type { MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utilities/cn";
import { LocaleLink } from "@/i18n/locale-link";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface LocaleLinkButtonProps {
  href: string;
  className?: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function LocaleLinkButton({
  href,
  className,
  variant = "primary",
  size = "md",
  children,
  onClick,
}: LocaleLinkButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200",
    variant === "primary" &&
      "bg-primary text-white hover:bg-primary-hover border border-transparent",
    variant === "secondary" &&
      "bg-surface-elevated text-foreground hover:bg-surface border border-border",
    variant === "ghost" &&
      "bg-transparent text-foreground hover:bg-primary-soft border border-transparent",
    variant === "outline" &&
      "bg-transparent text-foreground border border-border hover:border-primary hover:text-primary",
    variant === "danger" &&
      "bg-danger text-white hover:opacity-90 border border-transparent",
    size === "sm" && "min-h-10 px-3.5 py-2 text-sm rounded-md",
    size === "md" && "min-h-11 px-5 py-2.5 text-sm rounded-lg",
    size === "lg" && "min-h-12 px-6 py-3 text-base rounded-lg",
    className,
  );

  return (
    <LocaleLink href={href} className={classes} onClick={onClick}>
      {children}
    </LocaleLink>
  );
}
