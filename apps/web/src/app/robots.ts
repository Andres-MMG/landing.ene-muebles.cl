import type { MetadataRoute } from "next";

// robots.txt is generated per request. The list of disallowed paths
// is static, but generating on demand keeps production deployments
// independent of the Strapi state.
export const dynamic = "force-dynamic";

/**
 * robots.txt for the public site.
 *
 * - All crawlers may index everything except:
 *   - /admin/* (the Ene Muebles admin panel)
 *   - /api/*  (route handlers; nothing here is meaningful to index)
 * - The sitemap is declared at the canonical /sitemap.xml URL.
 *
 * NEXT_PUBLIC_SITE_URL is used so this file works in local dev
 * (where it points at localhost:4780) and in production (where
 * it points at the real domain) without code changes.
 */
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "https://ene-muebles.cl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
