import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utilities/cn";

type LinkButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type LinkButtonSize = "sm" | "md" | "lg";

interface LinkButtonProps {
  href: string;
  external?: boolean;
  className?: string;
  variant?: LinkButtonVariant;
  size?: LinkButtonSize;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function LinkButton({
  href,
  external,
  className,
  variant = "primary",
  size = "md",
  children,
  onClick,
}: LinkButtonProps) {
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

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} onClick={onClick}>
      {children}
    </Link>
  );
}
