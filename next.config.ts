import type { NextConfig } from "next";
import { validateProductionEnv } from "./src/config/env";
import {
  assertProductionAppUrl,
  isLocalhostUrl,
} from "./src/lib/url/app-url";

const deploymentEnv = process.env.VDB_DEPLOYMENT_ENV?.trim().toLowerCase();
const forceProductionValidation = process.env.REQUIRE_PRODUCTION_ENV === "1";

function resolveBuildPublicAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (
    (deploymentEnv === "production" || forceProductionValidation) &&
    explicit
  ) {
    return assertProductionAppUrl(explicit);
  }

  if (explicit && !isLocalhostUrl(explicit)) {
    return explicit.replace(/\/$/, "");
  }

  return explicit?.replace(/\/$/, "") ?? "http://localhost:3000";
}

if (
  process.env.NODE_ENV === "production" &&
  (deploymentEnv === "production" || forceProductionValidation)
) {
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

const resolvedPublicAppUrl = resolveBuildPublicAppUrl();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_URL: resolvedPublicAppUrl,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["vdbdigital.nl", "www.vdbdigital.nl"],
    },
  },
  images: {
    remotePatterns: [],
  },
  async redirects() {
    return [
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
