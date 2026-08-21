import Link from "next/link";
import { CategoryFilter } from "@/components/CategoryFilter";
import { CatalogSearch } from "@/components/CatalogSearch";
import { ContactCTA } from "@/components/ContactCTA";
import { Pagination } from "@/components/Pagination";
import { ProductSubcategoryGroups } from "@/components/ProductSubcategoryGroups";
import { site } from "@ene/ui-tokens";
import {
  getCategories,
  getProductCount,
  getProducts,
  getSiteSettings,
  type Category,
  type Product,
} from "@/lib/strapi";

export const revalidate = 60;

export const metadata = {
  title: "Catálogo",
  description:
    "Mobiliario escolar y de oficina para instituciones en Chile: escritorios, cajoneras, archivadores, lockers, pupitres, sillas y más.",
};

const PAGE_SIZE = 12;

type Props = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

const parsePage = (raw: string | undefined): number => {
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Math.max(1, Number.isNaN(parsed) ? 1 : parsed);
};

export default async function CatalogoPage({ searchParams }: Props) {
  const { page: pageParam, q: qParam } = await searchParams;
  // Duplicate query params arrive as `string[]` (e.g. `?q=a&q=b`) —
  // a non-string value is not a usable search term.
  const q = typeof qParam === "string" ? qParam.trim() : undefined;
  const settings = await getSiteSettings();

  let categories: Category[] = [];
  let products: Product[] = [];
  let total = 0;
  let page = parsePage(typeof pageParam === "string" ? pageParam : undefined);
  // B1 (U5) — live active-product count for the header fallback when
  // the paginated read returns nothing (empty catalog or unreachable
  // CMS). `getProductCount` never throws (0 on failure).
  const productCount = await getProductCount();
  try {
    [categories, { products, total }] = await Promise.all([
      getCategories(),
      getProducts({ page, pageSize: PAGE_SIZE, q }),
    ]);
  } catch (err) {
    console.warn("[catalogo] catalog fetch failed:", err);
  }

  // A `page` beyond the last one (stale URL, shrunken search results)
  // comes back as an empty payload with the real total — refetch the
  // last valid page instead of showing the empty state.
  if (total > 0 && products.length === 0) {
    page = Math.ceil(total / PAGE_SIZE);
    try {
      const result = await getProducts({ page, pageSize: PAGE_SIZE, q });
      products = result.products;
      total = result.total;
    } catch (err) {
      console.warn("[catalogo] catalog fetch failed:", err);
    }
  }

  const from = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <section aria-labelledby="catalogo-heading" className="bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-12 sm:px-10 sm:pt-28 sm:pb-16 lg:px-16 lg:pt-32">
          <header className="grid grid-cols-1 gap-8 border-b border-ink-line pb-12 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3">
                <span className="block h-px w-10 bg-taupe" aria-hidden />
                <span className="t-label text-taupe-text">
                  Catálogo institucional
                </span>
              </div>
              <h1
                id="catalogo-heading"
                className="t-h2 mt-6 max-w-[24ch] text-[clamp(2rem,1.2rem+3.2vw,3.75rem)] text-ink"
              >
                {/* B1 (U5): live count when the paginated read has data,
                    the standalone count helper when the read came back
                    empty but the CMS is up, and only then the static
                    "20" placeholder (both reads returned 0, i.e. Strapi
                    unreachable — never render "00" for a live count). */}
                {total > 0
                  ? `${total} productos certificados para instituciones.`
                  : productCount > 0
                    ? `${productCount} productos certificados para instituciones.`
                    : "20 productos certificados para instituciones."}
              </h1>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <p className="t-body text-base text-ink-mute">
                {/* B1 (U6): coverage reads from the site-setting
                    singleton so /catalogo stops contradicting the
                    hero/footer copy. */}
                {settings.dispatchCoverage ?? site.dispatchCoverageFallback}, descuentos por
                volumen y pago a 30, 60 o 90 días para instituciones. Cada producto
                se entrega con ficha técnica y declaración de materiales.
              </p>
              <div className="mt-6 space-y-6">
                {/* No `key`: remounting on every `?q=` change would drop
                    focus and make typing unusable. The component re-syncs
                    its value from `defaultValue` on URL changes. */}
                <CatalogSearch defaultValue={q} />
                <div>
                  <p className="t-overline text-ink-mute">
                    Filtrar por línea
                  </p>
                  <div className="mt-3">
                    <CategoryFilter categories={categories} q={q} />
                  </div>
                </div>
                {/* B1 (U1): the primary export CTA is now the printable
                    catalog; the JSON download stays as a secondary
                    technical link (the API route is unchanged). */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link
                    href={"/catalogo/imprimir" as never}
                    className="inline-flex items-center gap-3 bg-ink px-5 py-3 text-xs font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep"
                  >
                    Imprimir / PDF
                    <span aria-hidden>→</span>
                  </Link>
                  <a
                    href="/api/catalog/export"
                    download
                    className="t-overline text-ink-mute underline-offset-4 transition-colors hover:text-taupe-text hover:underline"
                  >
                    Exportar datos JSON
                  </a>
                </div>
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
          <>
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
              <p className="t-overline text-ink-mute">
                {q
                  ? `${total} resultado${total === 1 ? "" : "s"} para «${q}»`
                  : `${from}–${to} de ${total} productos`}
              </p>
              {q ? (
                <Link
                  href="/catalogo"
                  className="t-overline text-ink-mute underline-offset-4 hover:underline"
                >
                  Limpiar
                </Link>
              ) : null}
            </div>
            <ProductSubcategoryGroups
              products={products}
              whatsappNumber={settings.whatsappNumber}
            />
            <Pagination
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              basePath="/catalogo"
              q={q}
            />
          </>
        )}
      </section>

      <ContactCTA settings={settings} />
    </>
  );
}
