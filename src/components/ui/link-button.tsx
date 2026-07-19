import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import {
  buttonClassName,
  buttonDataAttrs,
  type ButtonSize,
  type ButtonTone,
  type ButtonVariant,
} from "@/components/ui/button-styles";

interface LinkButtonProps {
  href: string;
  external?: boolean;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  "aria-label"?: string;
}

export function LinkButton({
  href,
  external,
  className,
  variant = "primary",
  size = "md",
  tone = "auto",
  children,
  onClick,
  "aria-label": ariaLabel,
}: LinkButtonProps) {
  const classes = buttonClassName({ variant, size, tone, className });
  const dataAttrs = buttonDataAttrs(variant, tone);

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        aria-label={ariaLabel}
        {...dataAttrs}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={classes}
      onClick={onClick}
      aria-label={ariaLabel}
      {...dataAttrs}
    >
      {children}
    </Link>
  );
}
