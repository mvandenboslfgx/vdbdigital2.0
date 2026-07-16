import type { NextConfig } from "next";
import {
  validatePreviewBuildEnv,
  validateProductionEnv,
} from "./src/config/env";

const previewAppUrl =
  process.env.VERCEL === "1" &&
  process.env.VERCEL_ENV === "preview" &&
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
    : undefined;

if (process.env.NODE_ENV === "production") {
  const vercelEnv = process.env.VERCEL_ENV;
  const onVercel = process.env.VERCEL === "1";
  const forceLocal = process.env.REQUIRE_PRODUCTION_ENV === "1";

  if (onVercel && vercelEnv === "preview") {
    const result = validatePreviewBuildEnv();
    if (!result.ok) {
      throw new Error(
        `Preview-build geblokkeerd — stel deze variabelen in via Vercel Dashboard → Settings → Environment Variables (scope: Preview): ${result.missing.join(", ")}`,
      );
    }
  } else if ((onVercel && vercelEnv === "production") || forceLocal) {
    const result = validateProductionEnv();
    if (!result.ok) {
      throw new Error(
        `Production-build geblokkeerd — ontbrekende environment variables: ${result.missing.join(", ")}`,
      );
    }
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_URL:
      previewAppUrl ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000",
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
