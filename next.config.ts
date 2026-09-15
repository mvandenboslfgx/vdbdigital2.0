import type { NextConfig } from "next";
import {
  getDeploymentEnvironment,
  validatePreviewBuildEnv,
  validateProductionEnv,
} from "./src/config/env";
import {
  assertProductionAppUrl,
  isLocalhostUrl,
} from "./src/lib/url/app-url";

const onVercel = process.env.VERCEL === "1";
const deploymentEnv = getDeploymentEnvironment();
const vercelHost = process.env.VERCEL_URL?.trim();

const previewAppUrl =
  onVercel && deploymentEnv === "preview" && vercelHost
    ? `https://${vercelHost.replace(/^https?:\/\//, "")}`
    : undefined;

function resolveBuildPublicAppUrl(): string {
  // Preview: prefer explicit non-localhost APP_URL. Vercel may fall back to VERCEL_URL.
  if (deploymentEnv === "preview") {
    const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (explicit && !isLocalhostUrl(explicit)) {
      return explicit.replace(/\/$/, "");
    }
    if (previewAppUrl) return previewAppUrl;
  }

  // Production on any host: fail-closed exact apex only (never localhost / preview URL / www).
  if (deploymentEnv === "production") {
    return assertProductionAppUrl(process.env.NEXT_PUBLIC_APP_URL);
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

if (process.env.NODE_ENV === "production") {
  const forceLocal = process.env.REQUIRE_PRODUCTION_ENV === "1";

  if (deploymentEnv === "preview") {
    const result = validatePreviewBuildEnv();
    if (!result.ok) {
      throw new Error(
        `Preview-build geblokkeerd — stel de vereiste environment variables in voor deze preview deployment: ${result.missing.join(", ")}`,
      );
    }
  } else if (deploymentEnv === "production" || forceLocal) {
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
  async redirects() {
    return [
      // Legacy commercial URL — shop is the single public pricing surface
      {
        source: "/packages",
        destination: "/shop",
        permanent: true,
      },
      {
        source: "/nl/packages",
        destination: "/nl/shop",
        permanent: true,
      },
      {
        source: "/packages/:path*",
        destination: "/shop",
        permanent: true,
      },
      {
        source: "/nl/packages/:path*",
        destination: "/nl/shop",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
