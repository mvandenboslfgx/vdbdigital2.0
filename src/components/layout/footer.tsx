"use client";

import { siteConfig, hasCompanyLocation, hasSocial } from "@/config/site";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/navigation/logo";
import { useConsent } from "@/components/consent/consent-provider";
import { useI18n } from "@/i18n/provider";
import { LocaleLink } from "@/i18n/locale-link";
import { LanguageSwitcherBoundary } from "@/i18n/language-switcher-boundary";

export function Footer() {
  const { footer } = siteConfig.navigation;
  const { openPreferences } = useConsent();
  const { t } = useI18n();

  return (
    <footer className="border-t border-border bg-surface section-dark">
      <Container className="py-12 sm:py-16 pb-[max(3rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          <div className="lg:col-span-1">
            <Logo height={44} className="rounded-lg" />
            <p className="mt-4 text-small text-muted prose-width">
              {t("meta.tagline")}
            </p>
            <div className="mt-5">
              <LanguageSwitcherBoundary />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {hasSocial("linkedin") && (
                <a
                  href={siteConfig.social.linkedin}
                  className="text-small text-muted hover:text-primary transition-colors"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  LinkedIn
                </a>
              )}
              {hasSocial("instagram") && (
                <a
                  href={siteConfig.social.instagram}
                  className="text-small text-muted hover:text-primary transition-colors"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Instagram
                </a>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-label text-muted mb-4">{t("footer.products")}</h3>
            <ul className="space-y-2">
              {footer.product.map((link) => (
                <li key={link.href}>
                  <LocaleLink
                    href={link.href}
                    className="text-small text-muted hover:text-foreground transition-colors"
                  >
                    {t(link.labelKey)}
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-label text-muted mb-4">{t("footer.company")}</h3>
            <ul className="space-y-2">
              {footer.company.map((link) => (
                <li key={link.href}>
                  <LocaleLink
                    href={link.href}
                    className="text-small text-muted hover:text-foreground transition-colors"
                  >
                    {t(link.labelKey)}
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-label text-muted mb-4">{t("footer.legal")}</h3>
            <ul className="space-y-2">
              {footer.legal.map((link) => (
                <li key={link.href}>
                  <LocaleLink
                    href={link.href}
                    className="text-small text-muted hover:text-foreground transition-colors"
                  >
                    {t(link.labelKey)}
                  </LocaleLink>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={openPreferences}
                  className="text-small text-muted hover:text-foreground transition-colors"
                >
                  {t("footer.cookiePreferences")}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between gap-4">
          <p className="text-small text-muted">
            © {new Date().getFullYear()} {siteConfig.legalName}. {t("footer.rights")}
          </p>
          {hasCompanyLocation() ? (
            <p className="text-small text-muted">
              {siteConfig.company.address} · {siteConfig.company.city}
            </p>
          ) : (
            <p className="text-small text-muted">
              <a
                href={`mailto:${siteConfig.contactEmail}`}
                className="hover:text-foreground transition-colors"
              >
                {siteConfig.contactEmail}
              </a>
            </p>
          )}
        </div>
      </Container>
    </footer>
  );
}
