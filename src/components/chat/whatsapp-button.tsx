"use client";

import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utilities/cn";
import { useT } from "@/i18n/provider";

interface WhatsAppButtonProps {
  message?: string;
  className?: string;
  label?: string;
  variant?: "button" | "link";
}

export function buildWhatsAppUrl(message: string): string | null {
  const number = siteConfig.whatsappNumber.replace(/\D/g, "");
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppButton({
  message,
  className,
  label,
  variant = "button",
}: WhatsAppButtonProps) {
  const t = useT();
  const resolvedMessage = message ?? t("forms.whatsappMessageDefault");
  const resolvedLabel = label ?? t("forms.whatsapp");
  const url = buildWhatsAppUrl(resolvedMessage);

  // Never show a public "not configured" message — fail closed for visitors
  if (!url) {
    return null;
  }

  if (variant === "link") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("text-primary hover:underline text-small", className)}
      >
        {resolvedLabel}
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border",
        "bg-surface-elevated text-foreground hover:border-success hover:text-success transition-colors",
        className,
      )}
    >
      <MessageCircle className="h-4 w-4" />
      {resolvedLabel}
    </a>
  );
}
