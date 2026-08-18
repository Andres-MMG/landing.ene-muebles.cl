import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/strapi";
import { pickMediaFormat } from "@/lib/strapi";
import { site } from "@ene/ui-tokens";

type CategoryGridProps = {
  categories: Category[];
};

/**
 * Category index — industrial parts catalog, NOT a card grid.
 *
 * Each row is a wide stripe: number on the left, image, name + description,
 * arrow. Thin taupe dividers between rows. The list grows as the catalog
 * grows; the design does not change.
 *
 * Anti-patterns rejected here:
 *   - "Icon + heading + text" identical cards in a regular grid.
 *   - "01 / 02 / 03" eyebrows above each card (the numbers ARE data here,
 *     the category ordinal, not scaffolding).
 *   - Side-stripe borders as accent.
 *   - Same-sized image cards (vignette-style hover only).
 */
export function CategoryGrid({ categories }: CategoryGridProps) {
  if (categories.length === 0) return null;

  return (
    <section
      aria-labelledby="categorias-heading"
      className="bg-paper"
    >
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-12 sm:px-10 sm:pt-28 lg:px-16 lg:pt-32">
        <header className="grid grid-cols-1 gap-8 border-b border-ink-line pb-12 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="block h-px w-10 bg-taupe" aria-hidden />
              <span className="t-label text-taupe-text">
                {site.catalogOverview}
              </span>
            </div>
            <h2
              id="categorias-heading"
              className="t-h2 mt-6 max-w-[24ch] text-[clamp(2rem,1.2rem+3.2vw,3.5rem)] text-ink"
            >
              El catálogo se divide en dos líneas de fabricación.
            </h2>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <p className="t-body text-base text-ink-mute">
              Cada línea agrupa productos con la misma estructura, materiales
              y plazos de despacho. Cotización por volumen disponible sobre
              toda la línea.
            </p>
            <Link
              href="/catalogo"
              className="t-label mt-6 inline-flex items-center gap-2 text-ink underline-offset-[6px] transition-colors hover:text-taupe-text hover:underline tap-target"
            >
              {site.catalogAll}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </header>
      </div>

      <ol
        className="mx-auto w-full max-w-[1440px] px-6 sm:px-10 lg:px-16"
        role="list"
      >
        {categories.map((category, index) => {
          const ordinal = String(index + 1).padStart(2, "0");
          return (
            <li key={category.id} className="border-t border-ink-line last:border-b">
              <Link
                href={`/categoria/${category.slug}` as never}
                className="group grid grid-cols-12 items-center gap-4 py-8 transition-colors duration-500 hover:bg-cream-soft/40 sm:gap-6 sm:py-10 lg:gap-10 lg:py-12"
              >
                {/* Ordinal. */}
                <span
                  className="t-mono col-span-2 text-2xl text-taupe-deep transition-colors duration-500 group-hover:text-ink sm:text-3xl lg:col-span-1 lg:text-4xl"
                  aria-hidden
                >
                  {ordinal}
                </span>

                {/* Image. */}
                <div className="img-zoom relative col-span-4 aspect-[4/3] overflow-hidden bg-cream-soft sm:col-span-3 lg:col-span-4">
                  {category.image ? (
                    <Image
                      // Slot-aware media (ISR milestone): category rows
                      // render the smallest Strapi responsive format
                      // that fits (~30 vw slot), falling back upward.
                      src={pickMediaFormat(category.image, "small") ?? category.image.url}
                      alt={category.image.alternativeText || category.name}
                      fill
                      sizes="(min-width: 1024px) 30vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="t-overline text-ink-mute">
                        Sin imagen
                      </span>
                    </div>
                  )}
                </div>

                {/* Text block. */}
                <div className="col-span-6 sm:col-span-5 lg:col-span-6">
                  <p className="t-overline text-ink-mute">
                    Línea {ordinal}
                  </p>
                  <h3 className="t-h2 mt-2 text-2xl text-ink transition-colors duration-500 group-hover:text-taupe-deep sm:text-3xl lg:text-4xl">
                    {category.name}
                  </h3>
                  {category.description ? (
                    <p className="t-body mt-3 max-w-[52ch] text-base text-ink-mute line-clamp-2">
                      {category.description}
                    </p>
                  ) : null}
                </div>

                {/* Arrow. */}
                <span
                  aria-hidden
                  className="col-span-12 mt-2 inline-flex items-center justify-end gap-3 text-ink transition-transform duration-500 ease-out-expo group-hover:translate-x-2 sm:col-span-2 sm:mt-0 lg:col-span-1"
                >
                  <span className="t-overline text-ink-mute sm:hidden lg:inline">
                    Ir
                  </span>
                  <span className="inline-flex h-11 w-11 items-center justify-center border border-ink text-base transition-colors duration-500 group-hover:border-taupe-deep group-hover:bg-ink group-hover:text-paper">
                    →
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
