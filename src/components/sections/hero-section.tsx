import { Container } from "@/components/ui/container";
import { VdbLogo } from "@/components/brand/VdbLogo";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { paths } from "@/i18n/config";
import { LocaleLink } from "@/i18n/locale-link";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { WebsitePreviewVisual } from "@/components/visuals/website-preview-visual";
import { BookingCta } from "@/components/commercial/booking-cta";

export async function HeroSection() {
  const { t } = await getDictionary();
  const locale = await getLocale();
  const studioLine =
    locale === "nl"
      ? "Softwarestudio · Hoeksche Waard · Nederland"
      : "Software studio · Hoeksche Waard · Netherlands";
  const homeLabel =
    locale === "nl"
      ? "VDB Digital Software — naar de homepage"
      : "VDB Digital Software — back to the homepage";
  const capabilityLine =
    locale === "nl"
      ? "Websites, apps, CRM, klantportalen en AI-automatisering — één technische partner voor groei en minder handmatig werk."
      : "Websites, apps, CRM, customer portals and AI automation — one technical partner for growth and less manual work.";

  return (
    <section className="hero-glow relative py-12 sm:py-16 md:py-24 lg:py-28">
      <Container>
        <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7 animate-fade-in min-w-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 sm:mb-6">
              <span className="vdb-status-dot h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted sm:text-[11px]">
                {studioLine}
              </span>
            </div>
            <LocaleLink
              href="/"
              aria-label={homeLabel}
              className="mb-5 hidden sm:mb-7 sm:inline-flex"
            >
              <VdbLogo
                lockup="stacked"
                variant="light"
                priority
                alt=""
                className="h-14 w-auto sm:h-16 lg:h-[4.5rem]"
              />
            </LocaleLink>
            <h1 className="text-display mb-4 max-w-3xl sm:mb-6">
              <span className="vdb-hero-title-gradient">{t("home.heroTitle")}</span>
            </h1>
            <p className="text-body-lg text-muted max-w-prose mb-6 sm:mb-8">
              {t("home.heroBody")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap animate-fade-in-delayed">
              <BookingCta
                label={t("home.ctaIntro")}
                variant="primary"
                className="w-full sm:w-auto"
              />
              <LocaleLinkButton
                href={paths.cases}
                variant="outline"
                size="lg"
                className="w-full min-h-12 justify-center sm:w-auto"
              >
                {t("home.ctaCases")}
              </LocaleLinkButton>
            </div>
            <p className="mt-5 max-w-2xl text-sm text-muted">
              {capabilityLine}
            </p>
          </div>

          <div className="lg:col-span-5 relative animate-fade-in-delayed min-w-0">
            <div className="pointer-events-none absolute -inset-8 hidden rounded-[2rem] bg-primary/[0.08] blur-3xl md:block" />
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
