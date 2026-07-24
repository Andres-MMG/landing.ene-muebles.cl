import type { NextConfig } from "next";
import path from "node:path";

const STRAPI_URL = process.env.STRAPI_PUBLIC_URL ?? "http://localhost:4781";

let strapiHostname = "localhost";
let strapiPort: string | undefined = "4781";
let strapiProtocol: "http" | "https" = "http";
try {
  const u = new URL(STRAPI_URL);
  strapiHostname = u.hostname;
  if (u.protocol === "https:" || u.protocol === "http:") {
    strapiProtocol = u.protocol.slice(0, -1) as "http" | "https";
  }
  if (u.port) strapiPort = u.port;
} catch {
  // STRAPI_PUBLIC_URL is not a valid URL — fall back to localhost defaults.
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  turbopack: {
    root: path.resolve(__dirname, "..", ".."),
  },
  images: {
    // The local Strapi media library serves files at `/uploads/**` over plain
    // HTTP. We could route them through `next/image` for responsive sizing,
    // but `remotePatterns` matching in Next.js 16's image optimizer is brittle
    // (returns 400 even when the pattern matches the request). The Strapi
    // uploads are already optimized JPEGs/WebPs at sensible sizes, so disabling
    // the optimizer is a deliberate tradeoff: simpler, no 400s, no extra
    // network hop through `/_next/image`. Re-enable and add a strict
    // `remotePatterns` entry when deploying to a CDN that benefits from
    // Next.js's responsive image pipeline.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: strapiProtocol,
        hostname: strapiHostname,
        port: strapiPort,
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
