import type { MetadataRoute } from "next";
import { getProducts, getCategories } from "@/lib/strapi";

// Sitemap is rebuilt on every request that hits it (no prerender).
// Strapi may be unreachable at build time; the route handler runs
// on demand and serves a valid XML or fails loudly.
export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Dynamic sitemap.xml for the public site.
 *
 * - Static pages are declared here (priority tuned per role).
 * - Catalog and category pages are pulled from Strapi at request
 *   time and re-fetched every hour (revalidate: 3600) so the
 *   sitemap stays in sync with the catalog.
 *
 * The /admin/* and /api/* paths are NOT included here; robots.ts
 * disallows them from indexing.
 */
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "https://ene-muebles.cl";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/catalogo`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/nosotros`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contacto`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/terminos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacidad`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE_URL}/categoria/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((p) => {
    // Strapi v5 returns ISO strings; tolerate null.
    const lastModified = p.updatedAt ? new Date(p.updatedAt) : now;
    // Catalog-import (S4) — Next.js's typed `MetadataRoute.Sitemap.images`
    // (string[]) does NOT expose `<image:title>`; Next.js's runtime
    // emits only `<image:loc>` (verified in next@16.2.9
    // resolve-route-data.js). The image-title extension would
    // require dropping down to a raw XML route handler — out of
    // scope here. The `buildSitemapImageTitle` helper in
    // `product-attributes.ts` stays as the single source of truth
    // for the catalog-import label so a future slice that switches
    // to raw XML does not have to re-derive the format.
    const cover = p.images?.[0]?.url;
    return {
      url: `${BASE_URL}/producto/${p.slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
      images: cover ? [cover.startsWith("http") ? cover : `${BASE_URL}${cover}`] : [],
    };
  });

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
