import { Hero } from "@/components/Hero";
import { AboutSection } from "@/components/AboutSection";
import { CategoryGrid } from "@/components/CategoryGrid";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { ContactCTA } from "@/components/ContactCTA";
import {
  getAboutSection,
  getCategories,
  getContactCTASection,
  getHeroSection,
  getProducts,
  getSiteSettings,
  type Category,
  type Product,
} from "@/lib/strapi";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  // site-settings is already fetched by the root layout and passed via
  // children rendering, but we still need it here for the hero/footer
  // content. The cache (revalidate: 60) keeps the cost low.
  const settings = await getSiteSettings();
  // Batch 2: the marketing-section singletons own the per-section
  // copy. Each helper is non-throwing and returns a typed fallback
  // so we can `Promise.all` them with the other Strapi reads without
  // a try/catch wrapper.
  const [aboutSection, heroSection, contactCtaSection] = await Promise.all([
    getAboutSection(),
    getHeroSection(),
    getContactCTASection(),
  ]);

  let categories: Category[] = [];
  let featured: Product[] = [];
  let productCount: number | undefined;
  let categoryCount: number | undefined;
  try {
    const [allCats, allProducts] = await Promise.all([
      getCategories(),
      // Keep the same first-page volume the old unpaginated call
      // returned (Strapi default pageSize 25) so the featured strip
      // picks from the same candidate set; `total` now carries the
      // real count for the About section.
      getProducts({ pageSize: 25 }),
    ]);
    categories = allCats;
    categoryCount = allCats.length;
    productCount = allProducts.total;
    featured = allProducts.products
      .filter((p) => p.featured)
      .slice(0, 6);
    if (featured.length === 0) {
      featured = allProducts.products.slice(0, 6);
    }
  } catch (err) {
    console.warn("[home] catalog fetch failed:", err);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: settings.siteName,
            url: "https://ene-muebles.cl",
            description:
              settings.tagline ||
              "Mobiliario escolar y de oficina para instituciones en Chile.",
            address: settings.address
              ? {
                  "@type": "PostalAddress",
                  streetAddress: settings.address,
                  addressCountry: "CL",
                }
              : undefined,
            contactPoint: [
              {
                "@type": "ContactPoint",
                contactType: "sales",
                email: settings.contactEmail,
                telephone: settings.contactPhone,
                areaServed: "CL",
                availableLanguage: ["es-CL"],
              },
            ],
            sameAs: Object.values(settings.socialLinks ?? {}).filter(Boolean),
          }),
        }}
      />
      {/* Home page only: the hero's secondary "Solicitar cotización" CTA
          is opt-out because the page already has a near-the-end
          WhatsApp CTA in the dark `ContactCTA` block. Stacking both
          within ~1900 px of scroll duplicates the same intent. Other
          marketing pages keep both CTAs. */}
      <Hero settings={settings} section={heroSection} omitSecondaryCta />
      <CategoryGrid categories={categories} />
      <AboutSection
        aboutText={settings.aboutText}
        siteName={settings.siteName}
        productCount={productCount}
        categoryCount={categoryCount}
        section={aboutSection}
      />
      <FeaturedProducts
        products={featured}
        whatsappNumber={settings.whatsappNumber}
      />
      <ContactCTA settings={settings} section={contactCtaSection} />
    </>
  );
}
