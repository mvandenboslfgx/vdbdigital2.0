import { notFound, redirect } from "next/navigation";
import { getLocale } from "@/i18n/get-dictionary";
import { paths, withLocale } from "@/i18n/config";
import { getPublicShopProductBySlug } from "@/server/repositories/public-shop-catalog";

export default async function LegacySoftwareProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [locale, product] = await Promise.all([
    getLocale(),
    getPublicShopProductBySlug(slug),
  ]);
  if (!product) notFound();
  redirect(withLocale(`${paths.shop}/${product.slug}`, locale));
}
