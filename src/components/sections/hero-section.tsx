import { Container } from "@/components/ui/container";
import { VdbLogo } from "@/components/brand/VdbLogo";
import { getDictionary } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { LocaleLink } from "@/i18n/locale-link";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { WebsitePreviewVisual } from "@/components/visuals/website-preview-visual";

export async function HeroSection() {
  const { t } = await getDictionary();

  return (
    <section className="hero-glow relative py-12 sm:py-16 md:py-24 lg:py-28">
      <Container>
        <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7 animate-fade-in min-w-0">
            <LocaleLink
              href="/"
              aria-label="VDB Digital Software — naar de homepage"
              className="mb-5 inline-flex sm:mb-8"
            >
              <VdbLogo
                lockup="stacked"
                variant="light"
                priority
                alt=""
                className="h-14 w-auto sm:h-16 lg:h-[4.5rem]"
              />
            </LocaleLink>
            <h1 className="text-display mb-4 sm:mb-6 max-w-3xl">{t("home.heroTitle")}</h1>
            <p className="text-body-lg text-muted max-w-prose mb-6 sm:mb-8">
              {t("home.heroBody")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap animate-fade-in-delayed">
              <LocaleLinkButton
                href={`${paths.contact}?intent=introduction`}
                size="lg"
                className="w-full min-h-12 justify-center sm:w-auto"
              >
                {t("home.ctaIntro")}
              </LocaleLinkButton>
              <LocaleLinkButton
                href={paths.solutions}
                variant="outline"
                size="lg"
                className="w-full min-h-12 justify-center sm:w-auto"
              >
                {t("home.ctaSolutions")}
              </LocaleLinkButton>
              <LocaleLinkButton
                href={paths.quote}
                variant="ghost"
                size="lg"
                className="w-full min-h-12 justify-center sm:w-auto"
              >
                {t("home.ctaQuote")}
              </LocaleLinkButton>
            </div>
            <p className="mt-4 sm:mt-6 animate-fade-in-late">
              <LocaleLinkButton
                href={paths.cases}
                variant="ghost"
                size="sm"
                className="px-0 sm:px-3"
              >
                {t("home.ctaCases")}
              </LocaleLinkButton>
            </p>
          </div>

          <div className="lg:col-span-5 relative animate-fade-in-delayed min-w-0">
            <div className="hidden md:block absolute -inset-6 rounded-3xl bg-primary/10 blur-2xl" />
            <WebsitePreviewVisual className="shadow-[0_0_0_1px_rgba(78,115,255,0.15)]" />
            <p className="mt-3 text-center text-xs text-muted md:text-left">
              {t("home.visualNote")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
