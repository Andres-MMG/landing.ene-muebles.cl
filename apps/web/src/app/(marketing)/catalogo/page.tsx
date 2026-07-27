import { CategoryFilter } from "@/components/CategoryFilter";
import { ContactCTA } from "@/components/ContactCTA";
import { ProductCard } from "@/components/ProductCard";
import {
  getCategories,
  getProducts,
  getSiteSettings,
  type Category,
  type Product,
} from "@/lib/strapi";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catálogo",
  description:
    "Mobiliario escolar y de oficina para instituciones en Chile: escritorios, cajoneras, archivadores, lockers, pupitres, sillas y más.",
};

export default async function CatalogoPage() {
  const settings = await getSiteSettings();

  let categories: Category[] = [];
  let products: Product[] = [];
  try {
    [categories, products] = await Promise.all([
      getCategories(),
      getProducts(),
    ]);
  } catch (err) {
    console.warn("[catalogo] catalog fetch failed:", err);
  }

  return (
    <>
      <section aria-labelledby="catalogo-heading" className="bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-12 sm:px-10 sm:pt-28 sm:pb-16 lg:px-16 lg:pt-32">
          <header className="grid grid-cols-1 gap-8 border-b border-ink-line pb-12 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3">
                <span className="block h-px w-10 bg-taupe" aria-hidden />
                <span className="t-label text-taupe-deep">
                  Catálogo institucional
                </span>
              </div>
              <h1
                id="catalogo-heading"
                className="t-h2 mt-6 max-w-[24ch] text-[clamp(2rem,1.2rem+3.2vw,3.75rem)] text-ink"
              >
                20 productos certificados para instituciones.
              </h1>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <p className="t-body text-base text-ink-mute">
                Despacho a todo Chile, descuentos por volumen y pago a
                30, 60 o 90 días para instituciones. Cada producto se
                entrega con ficha técnica y declaración de materiales.
              </p>
              <div className="mt-6">
                <CategoryFilter categories={categories} />
              </div>
            </div>
          </header>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-6 pt-12 pb-20 sm:px-10 sm:pt-16 sm:pb-24 lg:px-16 lg:pb-28">
        {products.length === 0 ? (
          <p className="py-20 text-center text-base text-ink-mute">
            Próximamente publicaremos nuevos productos en este catálogo.
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
