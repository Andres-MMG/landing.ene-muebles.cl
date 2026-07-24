import { Hero } from "@/components/Hero";
import { AboutSection } from "@/components/AboutSection";
import { CategoryGrid } from "@/components/CategoryGrid";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { ContactCTA } from "@/components/ContactCTA";
import {
  getSiteSettings,
  getCategories,
  getProducts,
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

  let categories: Category[] = [];
  let featured: Product[] = [];
  let productCount: number | undefined;
  let categoryCount: number | undefined;
  try {
    const [allCats, allProducts] = await Promise.all([
      getCategories(),
      getProducts(),
    ]);
    categories = allCats;
    categoryCount = allCats.length;
    productCount = allProducts.length;
    featured = allProducts
      .filter((p) => p.featured)
      .slice(0, 6);
    if (featured.length === 0) {
      featured = allProducts.slice(0, 6);
    }
  } catch (err) {
    console.warn("[home] catalog fetch failed:", err);
  }

  return (
    <>
      <Hero settings={settings} />
      <CategoryGrid categories={categories} />
      <AboutSection
        aboutText={settings.aboutText}
        siteName={settings.siteName}
        productCount={productCount}
        categoryCount={categoryCount}
      />
      <FeaturedProducts
        products={featured}
        whatsappNumber={settings.whatsappNumber}
      />
      <ContactCTA settings={settings} />
    </>
  );
}
