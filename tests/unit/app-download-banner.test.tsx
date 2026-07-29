import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { AppDownloadBanner, type AppBannerConfig, type AppBannerLabels } from "@/components/promotion/app-download-banner";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/components/consent/consent-provider", () => ({
  useConsent: vi.fn(() => ({ hasConsent: () => false })),
}));

import { useConsent } from "@/components/consent/consent-provider";

function mockConsent(analytics: boolean) {
  vi.mocked(useConsent).mockReturnValue({
    hasConsent: (category: string) => category === "analytics" ? analytics : false,
  } as ReturnType<typeof useConsent>);
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const BASE_CONFIG: AppBannerConfig = {
  enabled: true,
  deepLinkUrl: "",
  androidStoreUrl: "https://play.google.com/store/apps/details?id=nl.vdbdigital",
  iosStoreUrl: "https://apps.apple.com/nl/app/vdb-digital/id123456789",
  delayMs: 0,
  dismissDays: 30,
  storageKeyVersion: "v1",
};

const LABELS: AppBannerLabels = {
  title: "VDB Digital, always within reach",
  description: "Access projects, quotes, invoices and support faster.",
  download: "Download the app",
  open: "Open the app",
  dismiss: "Not now",
  close: "Close banner",
};

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36";
const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", { writable: true, configurable: true, value: ua });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  setViewport(390);
  setUserAgent(ANDROID_UA);
  mockConsent(false);
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderBanner(config: Partial<AppBannerConfig> = {}) {
  return render(
    <AppDownloadBanner
      config={{ ...BASE_CONFIG, ...config }}
      labels={LABELS}
      locale="en"
      routeGroup="marketing"
    />,
  );
}

async function showBanner(config?: Partial<AppBannerConfig>) {
  renderBanner(config);
  await act(async () => { vi.advanceTimersByTime(1); });
}

// ---------------------------------------------------------------------------
// Feature flag tests
// ---------------------------------------------------------------------------

describe("AppDownloadBanner — feature flag", () => {
  it("renders nothing when enabled=false", async () => {
    renderBanner({ enabled: false });
    await act(async () => { vi.advanceTimersByTime(15_000); });
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("renders nothing when enabled=true but no store/deep links", async () => {
    renderBanner({ androidStoreUrl: "", iosStoreUrl: "", deepLinkUrl: "" });
    await act(async () => { vi.advanceTimersByTime(15_000); });
    expect(screen.queryByRole("region")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Viewport tests
// ---------------------------------------------------------------------------

describe("AppDownloadBanner — viewport", () => {
  it("does not appear on desktop (>=768 px)", async () => {
    setViewport(1024);
    await showBanner();
    expect(screen.queryByRole("region", { name: LABELS.title })).toBeNull();
  });

  it("appears on small mobile (390 px) after delay=0", async () => {
    await showBanner();
    expect(screen.getByRole("region", { name: LABELS.title })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Session / dismiss frequency
// ---------------------------------------------------------------------------

describe("AppDownloadBanner — session control", () => {
  it("does not appear twice in the same session", async () => {
    sessionStorage.setItem("vdb_app_banner_shown", "1");
    await showBanner();
    expect(screen.queryByRole("region", { name: LABELS.title })).toBeNull();
  });

  it("dismiss button hides banner and persists dismiss state", async () => {
    await showBanner();
    const closeBtn = screen.getAllByRole("button", { name: LABELS.close })[0];
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("region", { name: LABELS.title })).toBeNull();
    const stored = localStorage.getItem("vdb_app_banner_dismissed_v1");
    expect(stored).not.toBeNull();
    expect(Number(stored)).toBeGreaterThan(Date.now());
  });

  it("does not appear when dismissed within 30 days", async () => {
    const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem("vdb_app_banner_dismissed_v1", String(expiry));
    await showBanner();
    expect(screen.queryByRole("region", { name: LABELS.title })).toBeNull();
  });

  it("re-appears when dismiss expiry has passed", async () => {
    const expired = Date.now() - 1000;
    localStorage.setItem("vdb_app_banner_dismissed_v1", String(expired));
    await showBanner();
    expect(screen.getByRole("region", { name: LABELS.title })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Platform routing
// ---------------------------------------------------------------------------

describe("AppDownloadBanner — platform routing", () => {
  it("shows 'Download the app' CTA on Android with store link", async () => {
    setUserAgent(ANDROID_UA);
    await showBanner({ deepLinkUrl: "" });
    expect(screen.getByText(LABELS.download)).toBeInTheDocument();
  });

  it("shows 'Download the app' CTA on iOS with store link", async () => {
    setUserAgent(IOS_UA);
    await showBanner({ deepLinkUrl: "" });
    expect(screen.getByText(LABELS.download)).toBeInTheDocument();
  });

  it("shows 'Open the app' CTA when deep link is configured", async () => {
    setUserAgent(ANDROID_UA);
    await showBanner({ deepLinkUrl: "vdbdigital://home" });
    expect(screen.getByText(LABELS.open)).toBeInTheDocument();
  });

  it("does not appear on unsupported platform without store links", async () => {
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    await showBanner({ deepLinkUrl: "", androidStoreUrl: "", iosStoreUrl: "" });
    expect(screen.queryByRole("region", { name: LABELS.title })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Scroll trigger
// ---------------------------------------------------------------------------

describe("AppDownloadBanner — scroll trigger", () => {
  it("appears after 45% scroll before delay fires", async () => {
    renderBanner({ delayMs: 60_000 });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      writable: true, configurable: true, value: 2000,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true, configurable: true, value: 800,
    });
    Object.defineProperty(window, "scrollY", {
      writable: true, configurable: true, value: 540,
    });
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByRole("region", { name: LABELS.title })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Keyboard accessibility
// ---------------------------------------------------------------------------

describe("AppDownloadBanner — keyboard", () => {
  it("Escape closes the banner when focus is inside", async () => {
    await showBanner();
    const closeBtn = screen.getAllByRole("button", { name: LABELS.close })[0];
    closeBtn.focus();
    expect(screen.getByRole("region", { name: LABELS.title })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region", { name: LABELS.title })).toBeNull();
  });

  it("close button has accessible label", async () => {
    await showBanner();
    const btns = screen.getAllByRole("button", { name: LABELS.close });
    expect(btns.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Analytics — consent-aware
// ---------------------------------------------------------------------------

describe("AppDownloadBanner — analytics consent", () => {
  it("does not fire gtag events without analytics consent", async () => {
    const gtag = vi.fn();
    (window as Record<string, unknown>).gtag = gtag;
    mockConsent(false);
    await showBanner();
    expect(gtag).not.toHaveBeenCalled();
  });

  it("fires impression event when analytics consent is given", async () => {
    const gtag = vi.fn();
    (window as Record<string, unknown>).gtag = gtag;
    mockConsent(true);
    await showBanner();
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "app_banner_impression",
      expect.objectContaining({ bannerVersion: "v1" }),
    );
  });
});

// ---------------------------------------------------------------------------
// No automatic redirect
// ---------------------------------------------------------------------------

describe("AppDownloadBanner — safety", () => {
  it("does not automatically change location without user click", async () => {
    const original = window.location.href;
    await showBanner();
    // No redirect should have happened without a click
    expect(window.location.href).toBe(original);
  });
});
