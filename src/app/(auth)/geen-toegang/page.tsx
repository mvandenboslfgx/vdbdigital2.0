import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logoutAction } from "@/server/actions/auth-actions";
import { getOptionalAuthenticatedUser } from "@/server/auth/require-session";
import {
  isAuthNoAccessPath,
  resolvePostLoginPath,
} from "@/server/auth/resolve-home";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { getDictionary, getLocale } from "@/i18n/get-dictionary";
import { withLocale } from "@/i18n/config";
import { ServerLocaleLink } from "@/i18n/server-locale-link";
import type { TranslateFn } from "@/i18n/create-t";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t("auth.noAccessDefaultTitle"),
    robots: { index: false, follow: false },
  };
}

function noAccessCopy(
  t: TranslateFn,
  reden: string | undefined,
): { title: string; body: string } {
  if (reden === "geblokkeerd") {
    return { title: t("auth.noAccessBlockedTitle"), body: t("auth.noAccessBlockedBody") };
  }
  if (reden === "tijdelijk") {
    return {
      title: t("auth.noAccessTemporaryTitle"),
      body: t("auth.noAccessTemporaryBody"),
    };
  }
  return { title: t("auth.noAccessDefaultTitle"), body: t("auth.noAccessDefaultBody") };
}

export default async function GeenToegangPage({
  searchParams,
}: {
  searchParams: Promise<{ reden?: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const user = await getOptionalAuthenticatedUser();
  if (!user) {
    redirect(withLocale("/inloggen", locale));
  }

  const destination = await resolvePostLoginPath(user.id);
  if (!isAuthNoAccessPath(destination)) {
    redirect(withLocale(destination, locale));
  }

  const { t } = await getDictionary(locale);
  const { title, body } = noAccessCopy(t, params.reden);
  const contactHref = siteConfig.paths.contact;
  const phone = siteConfig.company.phone;
  const email = siteConfig.contactEmail;

  return (
    <>
      <h1 className="text-h2 mb-2 text-center">{title}</h1>
      <p className="text-muted text-small mb-6 text-center">{body}</p>
      <ul className="text-small text-muted mb-6 space-y-2 list-disc pl-5">
        <li>{t("auth.noAccessBullet1")}</li>
        <li>{t("auth.noAccessBullet2")}</li>
      </ul>
      <form action={logoutAction} className="mb-4">
        <Button type="submit" className="w-full">
          {t("auth.noAccessLogout")}
        </Button>
      </form>
      <p className="text-small text-muted text-center">
        <ServerLocaleLink href={contactHref} className="text-primary hover:underline">
          {t("auth.noAccessContact")}
        </ServerLocaleLink>
        {email ? (
          <>
            {" · "}
            <a href={`mailto:${email}`} className="text-primary hover:underline">
              {email}
            </a>
          </>
        ) : null}
        {phone ? (
          <>
            {" · "}
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="text-primary hover:underline"
            >
              {phone}
            </a>
          </>
        ) : null}
      </p>
    </>
  );
}
