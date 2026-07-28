import type { NextConfig } from "next";
import {
  validatePreviewBuildEnv,
  validateProductionEnv,
} from "./src/config/env";
import {
  assertProductionAppUrl,
  isLocalhostUrl,
} from "./src/lib/url/app-url";

const onVercel = process.env.VERCEL === "1";
const vercelEnv = process.env.VERCEL_ENV;
const vercelHost = process.env.VERCEL_URL?.trim();

const previewAppUrl =
  onVercel && vercelEnv === "preview" && vercelHost
    ? `https://${vercelHost.replace(/^https?:\/\//, "")}`
    : undefined;

function resolveBuildPublicAppUrl(): string {
  // Vercel Preview: prefer explicit non-localhost APP_URL, else VERCEL_URL
  if (onVercel && vercelEnv === "preview") {
    const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (explicit && !isLocalhostUrl(explicit)) {
      return explicit.replace(/\/$/, "");
    }
    if (previewAppUrl) return previewAppUrl;
  }

  // Vercel Production: fail-closed exact apex only (never localhost / VERCEL_URL / www)
  if (onVercel && vercelEnv === "production") {
    return assertProductionAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

if (process.env.NODE_ENV === "production") {
  const forceLocal = process.env.REQUIRE_PRODUCTION_ENV === "1";

  if (onVercel && vercelEnv === "preview") {
    const result = validatePreviewBuildEnv();
    if (!result.ok) {
      throw new Error(
        `Preview-build geblokkeerd — stel deze variabelen in via Vercel Dashboard → Settings → Environment Variables (scope: Preview): ${result.missing.join(", ")}`,
      );
    }
  } else if ((onVercel && vercelEnv === "production") || forceLocal) {
    try {
      assertProductionAppUrl(process.env.NEXT_PUBLIC_APP_URL);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "NEXT_PUBLIC_APP_URL is invalid for production";
      throw new Error(`Production-build geblokkeerd — ${message}`);
    }
    const result = validateProductionEnv();
    if (!result.ok) {
      throw new Error(
        `Production-build geblokkeerd — ontbrekende environment variables: ${result.missing.join(", ")}`,
      );
    }
  }
}

// Eager resolve so a bad production origin fails at config load, not mid-request.
const resolvedPublicAppUrl = resolveBuildPublicAppUrl();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_URL: resolvedPublicAppUrl,
  },
  images: {
    remotePatterns: [],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
