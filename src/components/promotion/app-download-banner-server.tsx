import {
  isAppBannerLive,
  getAppDeepLinkUrl,
  getAndroidStoreUrl,
  getIosStoreUrl,
  getAppBannerDelayMs,
  getAppBannerDismissDays,
  getAppBannerVersion,
} from "@/config/features";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { AppDownloadBanner } from "./app-download-banner";

/**
 * Server component that resolves feature flags + i18n then renders the
 * client AppDownloadBanner. Renders nothing when the feature is disabled.
 *
 * Route-exclusion is handled in MarketingLayout; this component trusts its caller.
 */
export async function AppDownloadBannerServer() {
  if (!isAppBannerLive()) return null;

  const locale = await getLocale();
  const { t } = await getDictionary(locale);

  const config = {
    enabled: true,
    deepLinkUrl: getAppDeepLinkUrl(),
    androidStoreUrl: getAndroidStoreUrl(),
    iosStoreUrl: getIosStoreUrl(),
    delayMs: getAppBannerDelayMs(),
    dismissDays: getAppBannerDismissDays(),
    storageKeyVersion: getAppBannerVersion(),
  };

  const labels = {
    title: t("appBanner.title"),
    description: t("appBanner.description"),
    download: t("appBanner.download"),
    open: t("appBanner.open"),
    dismiss: t("appBanner.dismiss"),
    close: t("appBanner.close"),
  };

  return (
    <AppDownloadBanner
      config={config}
      labels={labels}
      locale={locale}
      routeGroup="marketing"
    />
  );
}
