import { LocaleLinkButton } from "@/components/ui/locale-link-button";
import { resolveBooking } from "@/config/commercial/booking";
import { paths } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utilities/cn";

export async function BookingCta({
  label,
  variant = "primary",
  className,
}: {
  label?: string;
  variant?: "outline" | "ghost" | "primary";
  className?: string;
}) {
  const { t } = await getDictionary();
  const booking = resolveBooking();
  const text = label ?? t("nav.scheduleIntro");

  if (booking.available) {
    return (
      <a
        href={booking.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-base font-medium transition-colors",
          variant === "primary" && "bg-primary text-white hover:bg-primary-hover",
          variant === "outline" &&
            "border border-border hover:border-primary hover:text-primary",
          variant === "ghost" && "hover:bg-surface-elevated hover:text-primary",
          className,
        )}
      >
        {text}
      </a>
    );
  }

  return (
    <LocaleLinkButton
      href={`${paths.contact}?intent=introduction`}
      variant={variant}
      size="lg"
      className={className}
    >
      {text}
    </LocaleLinkButton>
  );
}
