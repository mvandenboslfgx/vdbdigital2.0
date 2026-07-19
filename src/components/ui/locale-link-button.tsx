"use client";

import type { MouseEventHandler, ReactNode } from "react";
import {
  buttonClassName,
  buttonDataAttrs,
  type ButtonSize,
  type ButtonTone,
  type ButtonVariant,
} from "@/components/ui/button-styles";
import { LocaleLink } from "@/i18n/locale-link";

interface LocaleLinkButtonProps {
  href: string;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function LocaleLinkButton({
  href,
  className,
  variant = "primary",
  size = "md",
  tone = "auto",
  children,
  onClick,
}: LocaleLinkButtonProps) {
  return (
    <LocaleLink
      href={href}
      className={buttonClassName({ variant, size, tone, className })}
      onClick={onClick}
      {...buttonDataAttrs(variant, tone)}
    >
      {children}
    </LocaleLink>
  );
}
