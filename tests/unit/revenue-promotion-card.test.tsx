import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { RevenuePromotionCard } from "@/components/promotion/revenue-promotion-card";
import type { RevenuePromotionCardProps } from "@/components/promotion/revenue-promotion-card";

afterEach(() => cleanup());

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const BASE_OWN: RevenuePromotionCardProps = {
  type: "OWN_SERVICE",
  title: "Websiteonderhoud",
  description: "Wij houden uw website snel, veilig en up-to-date.",
  ctaLabel: "Meer info",
  destination: "https://vdbdigital.nl/solutions/website-maintenance",
  enabled: true,
};

const BASE_AFFILIATE: RevenuePromotionCardProps = {
  type: "AFFILIATE",
  title: "Shopify",
  description: "Start je webshop met Shopify.",
  ctaLabel: "Probeer Shopify",
  destination: "https://www.shopify.com/ref=vdb",
  enabled: true,
};

const BASE_SPONSORED: RevenuePromotionCardProps = {
  type: "SPONSORED",
  title: "Hosted by Kinsta",
  description: "Snelle managed hosting.",
  ctaLabel: "Bekijk Kinsta",
  destination: "https://kinsta.com",
  sponsorName: "Kinsta",
  enabled: true,
};

// ---------------------------------------------------------------------------
// OWN_SERVICE
// ---------------------------------------------------------------------------

describe("RevenuePromotionCard — OWN_SERVICE", () => {
  it("renders title, description, CTA", () => {
    const { getByRole, getByText } = render(<RevenuePromotionCard {...BASE_OWN} />);
    expect(getByText(BASE_OWN.title)).toBeInTheDocument();
    expect(getByText(BASE_OWN.description)).toBeInTheDocument();
    const link = getByRole("link");
    expect(link).toBeInTheDocument();
    expect(link.textContent).toContain(BASE_OWN.ctaLabel);
  });

  it("no affiliate or sponsored badge for OWN_SERVICE", () => {
    const { container } = render(<RevenuePromotionCard {...BASE_OWN} />);
    expect(container.textContent).not.toMatch(/affiliate-link/i);
    expect(container.textContent).not.toMatch(/gesponsord/i);
  });

  it("link opens in new tab with safe rel", () => {
    const { getByRole } = render(<RevenuePromotionCard {...BASE_OWN} />);
    const link = getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
    expect(link.getAttribute("rel")).not.toContain("nofollow");
  });

  it("renders nothing when enabled=false", () => {
    const { container } = render(<RevenuePromotionCard {...BASE_OWN} enabled={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing with invalid destination URL", () => {
    const { container } = render(<RevenuePromotionCard {...BASE_OWN} destination="not-a-url" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing with http:// URL (must be https)", () => {
    const { container } = render(
      <RevenuePromotionCard {...BASE_OWN} destination="http://example.com" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when title is empty", () => {
    const { container } = render(<RevenuePromotionCard {...BASE_OWN} title="" />);
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AFFILIATE
// ---------------------------------------------------------------------------

describe("RevenuePromotionCard — AFFILIATE", () => {
  it("renders affiliate badge", () => {
    const { container } = render(<RevenuePromotionCard {...BASE_AFFILIATE} />);
    expect(container.textContent).toMatch(/affiliate-link/i);
  });

  it("renders disclosure text", () => {
    const { getByRole } = render(<RevenuePromotionCard {...BASE_AFFILIATE} />);
    const aside = getByRole("complementary");
    expect(within(aside).getByText(/commissie/i)).toBeInTheDocument();
  });

  it("link has sponsored nofollow rel", () => {
    const { getByRole } = render(<RevenuePromotionCard {...BASE_AFFILIATE} />);
    const link = getByRole("link");
    expect(link.getAttribute("rel")).toContain("sponsored");
    expect(link.getAttribute("rel")).toContain("nofollow");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("uses custom disclosure when provided", () => {
    const { getByText } = render(
      <RevenuePromotionCard {...BASE_AFFILIATE} disclosure="Eigen tekst." />,
    );
    expect(getByText("Eigen tekst.")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SPONSORED
// ---------------------------------------------------------------------------

describe("RevenuePromotionCard — SPONSORED", () => {
  it("renders sponsored badge with sponsor name", () => {
    const { container } = render(<RevenuePromotionCard {...BASE_SPONSORED} />);
    expect(container.textContent).toMatch(/gesponsord/i);
    expect(container.textContent).toContain("Kinsta");
  });

  it("renders disclosure", () => {
    const { container } = render(<RevenuePromotionCard {...BASE_SPONSORED} />);
    // The disclosure paragraph contains the sponsor name
    expect(container.textContent).toContain("gesponsord door Kinsta");
  });

  it("renders nothing when sponsorName is missing", () => {
    const { container } = render(
      <RevenuePromotionCard {...BASE_SPONSORED} sponsorName={undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("link has sponsored nofollow rel", () => {
    const { getByRole } = render(<RevenuePromotionCard {...BASE_SPONSORED} />);
    const link = getByRole("link");
    expect(link.getAttribute("rel")).toContain("sponsored");
    expect(link.getAttribute("rel")).toContain("nofollow");
  });
});

// ---------------------------------------------------------------------------
// Script injection safety
// ---------------------------------------------------------------------------

describe("RevenuePromotionCard — safety", () => {
  it("does not inject script elements from title prop", () => {
    render(
      <RevenuePromotionCard
        {...BASE_OWN}
        title={'<script>alert("xss")</script>Legitimate title'}
      />,
    );
    const scripts = document.querySelectorAll("script");
    const xssScript = Array.from(scripts).find((s) => s.textContent?.includes("xss"));
    expect(xssScript).toBeUndefined();
  });
});
