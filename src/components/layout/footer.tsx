import { siteConfig, hasCompanyLocation, hasSocial } from "@/config/site";
import { Container } from "@/components/ui/container";
import { VdbLogo } from "@/components/brand/VdbLogo";
import { ServerLocaleLink } from "@/i18n/server-locale-link";
import { ServerLanguageSwitcher } from "@/i18n/server-language-switcher";
import { paths } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { FooterCookiePreferencesButton } from "@/components/layout/footer-cookie-preferences-button";

export async function Footer() {
  const { footer } = siteConfig.navigation;
  const { t } = await getDictionary();

  return (
    <footer data-surface="dark" className="border-t border-border bg-surface section-dark">
      <Container className="py-12 sm:py-16 pb-[max(3rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          <div className="lg:col-span-1">
            <ServerLocaleLink
              href="/"
              aria-label="VDB Digital Software — naar de homepage"
              className="inline-flex shrink-0 items-center"
            >
              <VdbLogo lockup="header" variant="light" priority alt="" />
            </ServerLocaleLink>
            <p className="mt-4 text-small text-muted prose-width">
              {t("meta.tagline")}
            </p>
            <div className="mt-5 h-10 min-w-[5.5rem]">
              <ServerLanguageSwitcher />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <ServerLocaleLink
                href={paths.login}
                className="text-small text-muted hover:text-primary transition-colors"
              >
                {t("nav.login")}
              </ServerLocaleLink>
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
                  <ServerLocaleLink
                    href={link.href}
                    className="text-small text-muted hover:text-foreground transition-colors"
                  >
                    {t(link.labelKey)}
                  </ServerLocaleLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-label text-muted mb-4">{t("footer.company")}</h3>
            <ul className="space-y-2">
              {footer.company.map((link) => (
                <li key={link.href}>
                  <ServerLocaleLink
                    href={link.href}
                    className="text-small text-muted hover:text-foreground transition-colors"
                  >
                    {t(link.labelKey)}
                  </ServerLocaleLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-label text-muted mb-4">{t("footer.legal")}</h3>
            <ul className="space-y-2">
              {footer.legal.map((link) => (
                <li key={link.href}>
                  <ServerLocaleLink
                    href={link.href}
                    className="text-small text-muted hover:text-foreground transition-colors"
                  >
                    {t(link.labelKey)}
                  </ServerLocaleLink>
                </li>
              ))}
              <li>
                <FooterCookiePreferencesButton
                  label={t("footer.cookiePreferences")}
                />
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div className="space-y-2">
            <p className="text-small text-muted">
              © {new Date().getFullYear()} {siteConfig.legalName}. {t("footer.rights")}
            </p>
            <p className="text-small text-muted">
              {[
                siteConfig.company.kvk ? `KvK ${siteConfig.company.kvk}` : null,
                siteConfig.company.vat ? `BTW ${siteConfig.company.vat}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              {siteConfig.company.phone ? (
                <>
                  {(siteConfig.company.kvk || siteConfig.company.vat) ? " · " : null}
                  <a
                    href={`tel:${siteConfig.company.phoneTel}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {siteConfig.company.phone}
                  </a>
                </>
              ) : null}
              {!siteConfig.company.kvk &&
              !siteConfig.company.vat &&
              !siteConfig.company.phone ? (
                <a
                  href={`mailto:${siteConfig.contactEmail}`}
                  className="hover:text-foreground transition-colors"
                >
                  {siteConfig.contactEmail}
                </a>
              ) : null}
            </p>
          </div>
          {hasCompanyLocation() ? (
            <p className="text-small text-muted sm:text-right">
              {siteConfig.company.address}
              <br />
              {siteConfig.company.city}, {siteConfig.company.country}
            </p>
          ) : (
            <p className="text-small text-muted sm:text-right">
              {siteConfig.company.country}
            </p>
          )}
        </div>
      </Container>
    </footer>
  );
}
