import { Container, Section } from "@/components/ui/container";
import { getLocale } from "@/i18n/get-dictionary";
import { getCommercialContent } from "@/i18n/content/commercial";
import { getFoundingClientState } from "@/server/services/founding-client-service";
import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { paths } from "@/i18n/config";

export async function FoundingClientSection() {
  const state = await getFoundingClientState();
  if (!state.showCampaign) return null;

  const locale = await getLocale();
  const c = getCommercialContent(locale);

  return (
    <Section variant="dark" className="py-12">
      <Container className="max-w-3xl text-center">
        <h2 className="text-h2 mb-4">{c.founding.title}</h2>
        <p className="text-muted mb-6">{c.founding.body}</p>
        <LocaleLinkButton href={`${paths.contact}?intent=introduction`} size="lg">
          {c.founding.cta}
        </LocaleLinkButton>
      </Container>
    </Section>
  );
}
