import type { Product } from "@/lib/strapi";
import { ProductCard } from "./ProductCard";
import { site } from "@ene/ui-tokens";

type FeaturedProductsProps = {
  products: Product[];
  whatsappNumber?: string;
};

/**
 * FeaturedProducts — asymmetric catalog grid.
 *
 * Pattern: 1 hero (full-width), 3 second-row medium (4 cols each),
 * remaining in a wide-row layout (6 cols each). When the catalog has
 * fewer products, the last row collapses gracefully.
 *
 * The grid is intentionally not a uniform 3×N; the rupture between
 * the hero and the medium row carries visual weight, and the wide row
 * at the bottom acts as a closing statement.
 */
export function FeaturedProducts({
  products,
  whatsappNumber,
}: FeaturedProductsProps) {
  if (products.length === 0) return null;

  const [hero, ...rest] = products;

  return (
    <section
      aria-labelledby="destacados-heading"
      className="bg-paper"
    >
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-12 sm:px-10 sm:pt-28 sm:pb-16 lg:px-16 lg:pt-32 lg:pb-20">
        <header className="grid grid-cols-1 gap-8 border-b border-ink-line pb-12 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="block h-px w-10 bg-taupe" aria-hidden />
              <span className="t-label text-taupe-text">
                {site.featuredOverline}
              </span>
            </div>
            <h2
              id="destacados-heading"
              className="t-h2 mt-6 max-w-[24ch] text-[clamp(2rem,1.2rem+3.2vw,3.5rem)] text-ink"
            >
              {site.featuredHeading}
            </h2>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <p className="t-body text-base text-ink-mute">
              La selección activa del catálogo. Cada uno se entrega con
              ficha técnica, plazo de despacho y descuento por volumen
              sujeto a cantidad.
            </p>
            <a
              href="/catalogo"
              className="t-label mt-6 inline-flex items-center gap-2 text-ink underline-offset-[6px] transition-colors hover:text-taupe-text hover:underline tap-target"
            >
              {site.catalogAll}
              <span aria-hidden>→</span>
            </a>
          </div>
        </header>
      </div>

      <div className="mx-auto w-full max-w-[1440px] px-6 sm:px-10 lg:px-16">
        <div className="grid grid-cols-12 gap-6 sm:gap-8 lg:gap-10">
          {hero ? (
            <div className="col-span-12">
              <ProductCard
                product={hero}
                whatsappNumber={whatsappNumber}
                variant="hero"
                priority
              />
            </div>
          ) : null}

          {rest.slice(0, 3).map((product) => (
            <div
              key={product.id}
              className="col-span-12 sm:col-span-6 lg:col-span-4"
            >
              <ProductCard
                product={product}
                whatsappNumber={whatsappNumber}
              />
            </div>
          ))}

          {rest.slice(3).map((product) => (
            <div
              key={product.id}
              className="col-span-12 sm:col-span-6 lg:col-span-6"
            >
              <ProductCard
                product={product}
                whatsappNumber={whatsappNumber}
                variant="wide"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
