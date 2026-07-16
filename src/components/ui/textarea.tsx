import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utilities/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id ?? props.name;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-small font-medium block">
            {label}
            {props.required && (
              <span className="text-danger ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full min-h-[7.5rem] px-4 py-3 text-base rounded-lg border bg-surface text-foreground placeholder:text-muted resize-y",
            "focus:border-primary focus:ring-1 focus:ring-primary",
            error ? "border-danger" : "border-border",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-small text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
