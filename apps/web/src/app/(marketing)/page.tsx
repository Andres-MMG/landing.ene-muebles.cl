import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { AboutSection } from "@/components/AboutSection";
import { CategoryGrid } from "@/components/CategoryGrid";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { ContactCTA } from "@/components/ContactCTA";
import {
  FALLBACK_SITE_SETTINGS,
  getAboutSection,
  getCategories,
  getCategoryCount,
  getContactCTASection,
  getHeroSection,
  getHomePage,
  getProducts,
  getSiteSettings,
  sectionFallbacks,
  type Category,
  type Product,
} from "@/lib/strapi";
import { isSocialNetwork, socialHref } from "@/lib/social";
import { buildOrganizationJsonLd, safeJsonLd } from "@/lib/json-ld";
import {
  buildSeoMetadata,
  FALLBACK_ROOT_DESCRIPTION,
  FALLBACK_ROOT_SOCIAL_DESCRIPTION,
  FALLBACK_ROOT_TITLE,
  FALLBACK_SHARE_IMAGE_ALT,
  resolveSeoText,
} from "@/lib/seo-metadata";

// Must not be statically prerendered at build time: this page fetches
// site settings from the CMS, which is unreachable during `next build`
// (web and cms build in parallel in the Coolify compose). The fetches
// in lib/strapi.ts keep their own 60s SWR cache at runtime.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, homePage] = await Promise.all([
    getSiteSettings().catch(() => FALLBACK_SITE_SETTINGS),
    getHomePage(),
  ]);
  const configuredDescription = resolveSeoText(homePage.seoDescription, settings.seoDescription);

  return buildSeoMetadata({
    title: resolveSeoText(homePage.seoTitle, settings.seoTitle) ?? FALLBACK_ROOT_TITLE,
    description: configuredDescription ?? FALLBACK_ROOT_DESCRIPTION,
    socialDescription: configuredDescription ?? FALLBACK_ROOT_SOCIAL_DESCRIPTION,
    path: "/",
    siteName: settings.siteName,
    absoluteTitle: true,
    imageAlt: resolveSeoText(settings.seoShareImageAlt) ?? FALLBACK_SHARE_IMAGE_ALT,
  });
}

export default async function MarketingPage() {
  // site-settings is already fetched by the root layout and passed via
  // children rendering, but we still need it here for the hero/footer
  // content. The cache (revalidate: 60) keeps the cost low.
  const settings = await getSiteSettings();
  // Batch 2: the marketing-section singletons own the per-section
  // copy. Each helper is non-throwing and returns a typed fallback
  // so we can `Promise.all` them with the other Strapi reads without
  // a try/catch wrapper.
  const [aboutSection, heroSection, homePage, contactCtaSection] = await Promise.all([
    getAboutSection(),
    getHeroSection(),
    getHomePage(),
    getContactCTASection(),
  ]);

  let categories: Category[] = [];
  let featured: Product[] = [];
  let productCount: number | undefined;
  let categoryCount: number | undefined;
  try {
    const [allCats, allProducts, activeCategoryCount] = await Promise.all([
      getCategories(),
      // Keep the same first-page volume the old unpaginated call
      // returned (Strapi default pageSize 25) so the featured strip
      // picks from the same candidate set; `total` now carries the
      // real count for the About section.
      getProducts({ pageSize: 25 }),
      getCategoryCount(),
    ]);
    categories = allCats;
    categoryCount = activeCategoryCount;
    productCount = allProducts.total;
    featured = allProducts.products.filter((p) => p.featured).slice(0, 6);
    if (featured.length === 0) {
      featured = allProducts.products.slice(0, 6);
    }
  } catch (err) {
    console.warn("[home] catalog fetch failed:", err);
  }

  const heroFallback = sectionFallbacks.hero();
  const resolvedHeroSection = {
    ...heroFallback,
    ...heroSection,
    title: heroSection.title?.trim() || settings.tagline?.trim() || heroFallback.title,
  };

  // sameAs must be canonical profile URLs (social URLs must not
  // break): bare handles are normalized through the shared helper and
  // values that cannot be normalized are omitted entirely.
  const sameAs = Object.entries(settings.socialLinks ?? {})
    .flatMap(([network, value]) => (isSocialNetwork(network) ? [socialHref(network, value)] : []))
    .filter((href): href is string => href !== null);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(buildOrganizationJsonLd(settings, sameAs)),
        }}
      />
      {/* Home page only: the hero's secondary "Solicitar cotización" CTA
          is opt-out because the page already has a near-the-end
          WhatsApp CTA in the dark `ContactCTA` block. Stacking both
          within ~1900 px of scroll duplicates the same intent. Other
          marketing pages keep both CTAs. */}
      <Hero settings={settings} section={resolvedHeroSection} omitSecondaryCta />
      <CategoryGrid categories={categories} content={homePage} />
      <AboutSection
        aboutText={settings.aboutText}
        siteName={settings.siteName}
        productCount={productCount}
        categoryCount={categoryCount}
        // B1 (U6): the coverage stat row reads the same site-setting
        // field as the hero rail and the footer promise strip.
        dispatchCoverage={settings.dispatchCoverage}
        warrantyText={settings.warrantyText}
        section={aboutSection}
      />
      <FeaturedProducts
        products={featured}
        content={homePage}
        whatsappNumber={settings.whatsappNumber}
        actionCopy={{
          detailLabel: settings.productCardDetailLabel,
          whatsappLabel: settings.productCardWhatsappLabel,
          whatsappMessageTemplate: settings.whatsappProductMessageTemplate,
        }}
      />
      <ContactCTA settings={settings} section={contactCtaSection} />
    </>
  );
}
