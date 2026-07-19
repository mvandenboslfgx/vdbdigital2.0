import { cn } from "@/lib/utilities/cn";
import type { HTMLAttributes } from "react";

export function Container({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl page-pad-x", className)}
      {...props}
    />
  );
}

export function Section({
  className,
  variant = "dark",
  ...props
}: HTMLAttributes<HTMLElement> & { variant?: "dark" | "light" }) {
  return (
    <section
      data-surface={variant}
      className={cn(
        "py-12 sm:py-16 md:py-20 lg:py-24",
        variant === "dark" ? "section-dark" : "section-light",
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  variant = "dark",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "dark" | "light" }) {
  return (
    <div
      data-surface={variant}
      className={cn(
        "p-5 sm:p-6 md:p-8",
        variant === "dark" ? "surface-card" : "surface-card-light",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-label bg-primary-soft text-primary normal-case tracking-wide",
        className,
      )}
      {...props}
    />
  );
}
