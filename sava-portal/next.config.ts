import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : []

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
      allowedOrigins,
    },
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  telemetry: false,
});
