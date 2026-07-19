import { forwardRef, type ButtonHTMLAttributes } from "react";
import {
  buttonClassName,
  buttonDataAttrs,
  type ButtonSize,
  type ButtonTone,
  type ButtonVariant,
} from "@/components/ui/button-styles";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", tone = "auto", ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={buttonClassName({
          variant,
          size,
          tone,
          className,
          disabledAware: true,
        })}
        {...props}
        {...buttonDataAttrs(variant, tone)}
      />
    );
  },
);

Button.displayName = "Button";
