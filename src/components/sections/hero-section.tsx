import { Container } from "@/components/ui/container";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { ServerLocaleLink } from "@/i18n/server-locale-link";
import { ServerLocaleLinkButton } from "@/components/ui/server-locale-link-button";
import { WebsitePreviewVisual } from "@/components/visuals/website-preview-visual";

export async function HeroSection() {
  const { t } = await getDictionary();

  return (
    <section className="hero-glow relative py-12 sm:py-16 md:py-24 lg:py-28">
      <Container>
        <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7 min-w-0">
            <h1 className="mb-4 sm:mb-6 max-w-[18ch] text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.12] tracking-tight text-foreground">
              {t("home.heroTitle")}
            </h1>
            <p className="text-body-lg text-muted max-w-prose mb-6 sm:mb-8">
              {t("home.heroBody")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap animate-fade-in-delayed">
              <ServerLocaleLinkButton
                href={`${paths.contact}?intent=introduction`}
                size="lg"
                className="w-full min-h-12 justify-center sm:w-auto"
              >
                {t("home.ctaIntro")}
              </ServerLocaleLinkButton>
              <ServerLocaleLinkButton
                href={paths.quote}
                variant="outline"
                size="lg"
                className="w-full min-h-12 justify-center sm:w-auto"
              >
                {t("home.ctaQuote")}
              </ServerLocaleLinkButton>
            </div>
            <p className="mt-4 sm:mt-6 animate-fade-in-late text-small text-muted">
              <ServerLocaleLink
                href={paths.solutions}
                className="underline-offset-4 hover:underline"
              >
                {t("home.ctaSolutions")}
              </ServerLocaleLink>
              <span className="mx-2 text-muted/60" aria-hidden>
                ·
              </span>
              <ServerLocaleLink
                href={paths.cases}
                className="underline-offset-4 hover:underline"
              >
                {t("home.ctaCases")}
              </ServerLocaleLink>
            </p>
          </div>

          <div className="lg:col-span-5 relative animate-fade-in-delayed min-w-0">
            <div className="hidden md:block absolute -inset-6 rounded-3xl bg-accent-soft blur-2xl" />
            <WebsitePreviewVisual className="shadow-[0_0_0_1px_rgba(220,197,154,0.18)]" />
            <p className="mt-3 text-center text-xs text-muted md:text-left">
              {t("home.visualNote")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
