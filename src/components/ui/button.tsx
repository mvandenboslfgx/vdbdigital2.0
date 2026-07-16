import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utilities/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover border border-transparent",
  secondary:
    "bg-surface-elevated text-foreground hover:bg-surface border border-border",
  ghost: "bg-transparent text-foreground hover:bg-primary-soft border border-transparent",
  outline:
    "bg-transparent text-foreground border border-border hover:border-primary hover:text-primary",
  danger: "bg-danger text-white hover:opacity-90 border border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3.5 py-2 text-sm rounded-md",
  md: "min-h-11 px-5 py-2.5 text-sm rounded-lg",
  lg: "min-h-12 px-6 py-3 text-base rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
