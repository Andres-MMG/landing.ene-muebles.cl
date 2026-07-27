import { notFound } from "next/navigation";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ContactCTA } from "@/components/ContactCTA";
import { ProductCard } from "@/components/ProductCard";
import {
  getCategories,
  getProducts,
  getSiteSettings,
} from "@/lib/strapi";

export const revalidate = 60;
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const categories = await getCategories();
  const match = categories.find((c) => c.slug === slug);
  if (!match) return { title: "Línea" };
  return {
    title: match.name,
    description: match.description,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [settings, categories, products] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getProducts(slug),
  ]);

  const current = categories.find((c) => c.slug === slug);
  if (!current) notFound();

  return (
    <>
      <section aria-labelledby="linea-heading" className="bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-12 sm:px-10 sm:pt-28 sm:pb-16 lg:px-16 lg:pt-32">
          <header className="grid grid-cols-1 gap-8 border-b border-ink-line pb-12 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3">
                <span className="block h-px w-10 bg-taupe" aria-hidden />
                <span className="t-label text-taupe-deep">
                  Línea · {String(categories.findIndex((c) => c.slug === current.slug) + 1).padStart(2, "0")}
                </span>
              </div>
              <h1
                id="linea-heading"
                className="t-h2 mt-6 max-w-[24ch] text-[clamp(2rem,1.2rem+3.2vw,3.5rem)] text-ink"
              >
                {current.name}
              </h1>
              {current.description ? (
                <p className="t-body mt-6 max-w-[55ch] text-lg text-ink-mute">
                  {current.description}
                </p>
              ) : null}
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                Filtrar por línea
              </p>
              <div className="mt-4">
                <CategoryFilter categories={categories} activeSlug={current.slug} />
              </div>
            </div>
          </header>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-6 pt-12 pb-20 sm:px-10 sm:pt-16 sm:pb-24 lg:px-16 lg:pb-28">
        {products.length === 0 ? (
          <p className="py-20 text-center text-base text-ink-mute">
            Próximamente publicaremos nuevos productos en esta línea.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 sm:gap-y-14 lg:grid-cols-3 lg:gap-y-16">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard
                  product={product}
                  whatsappNumber={settings.whatsappNumber}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ContactCTA settings={settings} />
    </>
  );
}
