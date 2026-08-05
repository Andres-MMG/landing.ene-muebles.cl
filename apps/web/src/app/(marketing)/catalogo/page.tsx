import Link from "next/link";
import { CategoryFilter } from "@/components/CategoryFilter";
import { CatalogSearch } from "@/components/CatalogSearch";
import { ContactCTA } from "@/components/ContactCTA";
import { Pagination } from "@/components/Pagination";
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
  const q = qParam?.trim();
  const settings = await getSiteSettings();

  let categories: Category[] = [];
  let products: Product[] = [];
  let total = 0;
  let page = parsePage(pageParam);
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
              <div className="mt-6 space-y-6">
                <CatalogSearch defaultValue={q} />
                <div>
                  <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                    Filtrar por línea
                  </p>
                  <div className="mt-3">
                    <CategoryFilter categories={categories} />
                  </div>
                </div>
                <a
                  href="/api/catalog/export"
                  download
                  className="inline-flex border border-ink px-5 py-3 text-xs font-medium uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink hover:text-paper"
                >
                  Descargar catálogo JSON
                </a>
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
              <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
                {q
                  ? `${total} resultado${total === 1 ? "" : "s"} para «${q}»`
                  : `${from}–${to} de ${total} productos`}
              </p>
              {q ? (
                <Link
                  href="/catalogo"
                  className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep underline-offset-4 hover:underline"
                >
                  Limpiar
                </Link>
              ) : null}
            </div>
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
