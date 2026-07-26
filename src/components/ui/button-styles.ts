import { cn } from "@/lib/utilities/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
/** Explicit tone overrides surface context. `auto` follows nearest `[data-surface]`. */
export type ButtonTone = "auto" | "light" | "dark";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3.5 py-2 text-sm rounded-md",
  md: "min-h-11 px-5 py-2.5 text-sm rounded-lg",
  lg: "min-h-12 px-6 py-3 text-base rounded-lg",
};

const primaryClasses =
  "bg-primary text-primary-fg hover:bg-primary-hover border border-transparent";
const dangerClasses =
  "bg-danger text-white hover:opacity-90 border border-transparent";

/** Light-surface readable outline / ghost / secondary */
const lightTone: Record<"secondary" | "ghost" | "outline", string> = {
  secondary:
    "bg-light-background text-light-foreground hover:bg-white border border-light-border",
  ghost:
    "bg-transparent text-light-foreground hover:bg-primary-soft border border-transparent",
  outline:
    "bg-white text-light-foreground border border-[#9aa6b5] hover:border-primary hover:text-primary",
};

/** Dark-surface readable outline / ghost / secondary */
const darkTone: Record<"secondary" | "ghost" | "outline", string> = {
  secondary:
    "bg-surface-elevated text-foreground hover:bg-surface border border-border",
  ghost:
    "bg-transparent text-foreground hover:bg-primary-soft border border-transparent",
  outline:
    "bg-transparent text-foreground border border-border hover:border-primary hover:text-primary",
};

/**
 * Auto tone: dark defaults + ancestor `[data-surface=light|dark]` overrides via CSS
 * (`in-data-[surface=…]`). Explicit `tone` skips surface CSS and uses fixed classes.
 */
const autoTone: Record<"secondary" | "ghost" | "outline", string> = {
  secondary: cn(
    darkTone.secondary,
    "in-data-[surface=light]:bg-light-background in-data-[surface=light]:text-light-foreground in-data-[surface=light]:border-light-border in-data-[surface=light]:hover:bg-white",
    "in-data-[surface=dark]:bg-surface-elevated in-data-[surface=dark]:text-foreground in-data-[surface=dark]:border-border",
  ),
  ghost: cn(
    darkTone.ghost,
    "in-data-[surface=light]:text-light-foreground in-data-[surface=light]:hover:bg-primary-soft",
    "in-data-[surface=dark]:text-foreground",
  ),
  outline: cn(
    darkTone.outline,
    "in-data-[surface=light]:bg-white in-data-[surface=light]:text-light-foreground in-data-[surface=light]:border-[#9aa6b5] in-data-[surface=light]:hover:border-primary in-data-[surface=light]:hover:text-primary",
    "in-data-[surface=dark]:bg-transparent in-data-[surface=dark]:text-foreground in-data-[surface=dark]:border-border",
  ),
};

export function buttonBaseClasses(disabledAware = false): string {
  return cn(
    "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    disabledAware && "disabled:opacity-50 disabled:pointer-events-none",
  );
}

export function buttonSizeClass(size: ButtonSize = "md"): string {
  return sizeClasses[size];
}

export function buttonVariantClass(
  variant: ButtonVariant = "primary",
  tone: ButtonTone = "auto",
): string {
  if (variant === "primary") return primaryClasses;
  if (variant === "danger") return dangerClasses;

  if (tone === "light") return lightTone[variant];
  if (tone === "dark") return darkTone[variant];
  return autoTone[variant];
}

export function buttonClassName(options: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  className?: string;
  disabledAware?: boolean;
}): string {
  const {
    variant = "primary",
    size = "md",
    tone = "auto",
    className,
    disabledAware = false,
  } = options;
  return cn(
    buttonBaseClasses(disabledAware),
    buttonVariantClass(variant, tone),
    buttonSizeClass(size),
    className,
  );
}

export function buttonDataAttrs(variant: ButtonVariant, tone: ButtonTone) {
  return {
    "data-btn-variant": variant,
    "data-btn-tone": tone,
  } as const;
}
