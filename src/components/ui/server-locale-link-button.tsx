import "server-only";

import type { ReactNode } from "react";
import {
  buttonClassName,
  buttonDataAttrs,
  type ButtonSize,
  type ButtonTone,
  type ButtonVariant,
} from "@/components/ui/button-styles";
import { ServerLocaleLink } from "@/i18n/server-locale-link";

type ServerLocaleLinkButtonProps = {
  href: string;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  children: ReactNode;
  prefetch?: boolean;
};

/** Server-rendered locale-aware button link — no client island. */
export async function ServerLocaleLinkButton({
  href,
  className,
  variant = "primary",
  size = "md",
  tone = "auto",
  children,
  prefetch,
}: ServerLocaleLinkButtonProps) {
  return (
    <ServerLocaleLink
      href={href}
      prefetch={prefetch}
      className={buttonClassName({ variant, size, tone, className })}
      {...buttonDataAttrs(variant, tone)}
    >
      {children}
    </ServerLocaleLink>
  );
}
