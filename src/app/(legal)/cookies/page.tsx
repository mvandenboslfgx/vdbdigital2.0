import type { Metadata } from "next";
import { LegalPageContent } from "@/components/sections/legal-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Cookie policy",
  description:
    "Cookie policy of VDB Digital — which cookies we use and how to manage your preferences.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPageContent title="Cookie policy">
      <p>
        This website uses cookies to make the site work and — only with your
        consent — for functional, analytics and marketing purposes.
      </p>

      <h2 className="text-h3 text-light-foreground">Necessary cookies</h2>
      <p>
        Required for security, session management, cookie preferences and the
        shopping cart. These cookies are always placed.
      </p>

      <h2 className="text-h3 text-light-foreground">Functional cookies</h2>
      <p>
        Optional enhancements that are not required for basic browsing. We do not
        currently load third-party live-chat widgets. Any future functional cookies
        are only placed after consent.
      </p>

      <h2 className="text-h3 text-light-foreground">Analytics cookies</h2>
      <p>
        Help us understand how the website is used. Only loaded after consent. We
        aim to minimise personally identifiable data.
      </p>

      <h2 className="text-h3 text-light-foreground">Marketing cookies</h2>
      <p>
        Only loaded after consent. Marketing pixels are not activated by default
        without explicit configuration and consent.
      </p>

      <h2 className="text-h3 text-light-foreground">Changing your preferences</h2>
      <p>
        You can reopen cookie preferences at any time via the{" "}
        <strong>Cookie preferences</strong> link in the footer, or by clearing cookies
        in your browser and revisiting the site.
      </p>

      <p className="text-small text-light-muted">
        Last updated: {siteConfig.legal.lastUpdated}
      </p>
    </LegalPageContent>
  );
}
