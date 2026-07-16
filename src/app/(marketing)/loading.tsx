import { getDictionary } from "@/i18n/get-dictionary";

export default async function Loading() {
  const { t } = await getDictionary();

  return (
    <div className="section-dark min-h-[40vh] flex items-center justify-center px-4">
      <div className="text-center space-y-3" role="status" aria-live="polite">
        <div className="mx-auto h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-small text-muted">{t("common.loading")}</p>
      </div>
    </div>
  );
}
