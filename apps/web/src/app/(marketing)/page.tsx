import { Hero } from "@/components/Hero";
import { AboutSection } from "@/components/AboutSection";
import { CategoryGrid } from "@/components/CategoryGrid";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { ContactCTA } from "@/components/ContactCTA";
import { Footer } from "@/components/Footer";
import {
  getSiteSettings,
  getCategories,
  getFeaturedProducts,
  getProducts,
  type Category,
  type Product,
} from "@/lib/strapi";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  // site-settings is the only hard dependency — if it fails, the error
  // boundary takes over. Everything below is gracefully skipped.
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
    <main className="bg-paper text-ink">
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
      <Footer settings={settings} />
    </main>
  );
}
