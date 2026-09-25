import type { MetadataRoute } from "next";
import { getLegalPage } from "@/lib/legal-pages";
import { absoluteSiteUrl } from "@/lib/site-origin";
import { getSitemapCategories, getSitemapProducts, SINGLE_SITEMAP_URL_LIMIT } from "@/lib/strapi";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export function validSitemapDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, terms, privacy] = await Promise.all([
    getSitemapProducts(),
    getSitemapCategories(),
    getLegalPage("terms"),
    getLegalPage("privacy"),
  ]);

  const fixedEntries: MetadataRoute.Sitemap = [
    { url: absoluteSiteUrl("/"), changeFrequency: "weekly", priority: 1.0 },
    { url: absoluteSiteUrl("/catalogo"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteSiteUrl("/nosotros"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteSiteUrl("/contacto"), changeFrequency: "monthly", priority: 0.7 },
    {
      url: absoluteSiteUrl("/terminos"),
      ...(terms.source === "cms" && validSitemapDate(terms.updatedAt)
        ? { lastModified: validSitemapDate(terms.updatedAt) }
        : {}),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteSiteUrl("/privacidad"),
      ...(privacy.source === "cms" && validSitemapDate(privacy.updatedAt)
        ? { lastModified: validSitemapDate(privacy.updatedAt) }
        : {}),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteSiteUrl(`/categoria/${category.slug}`),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => {
    const lastModified =
      validSitemapDate(product.updatedAt) ??
      validSitemapDate(product.publishedAt) ??
      validSitemapDate(product.createdAt);
    const cover = product.images?.[0]?.url;
    return {
      url: absoluteSiteUrl(`/producto/${product.slug}`),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly",
      priority: 0.7,
      images: cover
        ? [
            cover.startsWith("http://") || cover.startsWith("https://")
              ? cover
              : absoluteSiteUrl(cover),
          ]
        : [],
    };
  });

  const entries = [...fixedEntries, ...categoryEntries, ...productEntries];
  if (entries.length > SINGLE_SITEMAP_URL_LIMIT) {
    throw new Error(
      `Sitemap contains ${entries.length} URLs; split it before exceeding the ${SINGLE_SITEMAP_URL_LIMIT}-URL protocol limit`,
    );
  }
  return entries;
}
