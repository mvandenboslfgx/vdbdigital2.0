import { NextResponse } from "next/server";
import { commerceQuoteRequestSchema, quotePublicProduct } from "@/lib/commerce/price-quote";
import { getPublicShopProductBySlug } from "@/server/repositories/public-shop-catalog";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const raw = body as { slug?: unknown; quantity?: unknown; locale?: unknown };
  const parsed = commerceQuoteRequestSchema.safeParse({
    slug: raw.slug,
    locale: raw.locale,
    quantity: typeof raw.quantity === "string" ? Number(raw.quantity) : raw.quantity,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_REQUEST",
        message: parsed.error.issues[0]?.message ?? "Invalid request",
      },
      { status: 400 },
    );
  }

  const product = await getPublicShopProductBySlug(parsed.data.slug);
  const quote = quotePublicProduct(product, parsed.data.quantity);
  return NextResponse.json(quote, { status: quote.ok ? 200 : 422 });
}
