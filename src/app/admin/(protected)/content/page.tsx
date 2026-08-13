import type { Metadata } from "next";
import { Card } from "@/components/ui/container";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t("admin.page.content.metaTitle"), robots: { index: false } };
}

export default async function AdminContentPage() {
  const { t } = await getDictionary();

  return (
    <div>
      <h1 className="text-h1 mb-8">{t("admin.page.content.title")}</h1>
      <Card>
        <p className="text-muted">{t("admin.page.content.description")}</p>
      </Card>
    </div>
  );
}
