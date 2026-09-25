import type { MetadataRoute } from "next";
import { absoluteSiteUrl, resolveSiteOrigin } from "@/lib/site-origin";

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
export default function robots(): MetadataRoute.Robots {
  const origin = resolveSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: absoluteSiteUrl("/sitemap.xml", origin),
    host: origin,
  };
}
