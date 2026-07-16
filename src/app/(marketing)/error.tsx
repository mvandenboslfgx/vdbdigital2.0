"use client";

import { useEffect } from "react";
import { LinkButton } from "@/components/ui/link-button";
import { Container, Section } from "@/components/ui/container";
import { useT } from "@/i18n/provider";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Section variant="dark" className="pt-16 min-h-[50vh]">
      <Container className="text-center max-w-xl">
        <h1 className="text-h1 mb-4">{t("common.somethingWentWrong")}</h1>
        <p className="text-muted mb-8">{t("common.pageLoadError")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            {t("common.tryAgain")}
          </button>
          <LinkButton href="/" variant="outline">
            {t("common.backHome")}
          </LinkButton>
        </div>
      </Container>
    </Section>
  );
}
