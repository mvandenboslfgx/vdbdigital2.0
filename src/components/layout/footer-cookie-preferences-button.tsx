/** Opens the vanilla cookie banner via data attribute (no client JS). */
export function FooterCookiePreferencesButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      data-vdb-open-consent
      className="text-small text-muted hover:text-foreground transition-colors"
    >
      {label}
    </button>
  );
}
