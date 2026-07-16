import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { resolveBooking } from "@/config/commercial/booking";
import { paths } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

/** Server component — never embeds raw client URLs */
export async function BookingCta({
  label,
  variant = "outline",
}: {
  label?: string;
  variant?: "outline" | "ghost" | "primary";
}) {
  const { t } = await getDictionary();
  const booking = resolveBooking();

  if (booking.available) {
    return (
      <a
        href={booking.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border px-5 text-base font-medium hover:border-primary hover:text-primary"
      >
        {label ?? t("nav.scheduleIntro")}
      </a>
    );
  }

  return (
    <LocaleLinkButton
      href={`${paths.contact}?intent=introduction`}
      variant={variant === "primary" ? "primary" : variant}
      size="lg"
    >
      {label ?? t("nav.scheduleIntro")}
    </LocaleLinkButton>
  );
}
