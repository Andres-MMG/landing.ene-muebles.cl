import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogSearch } from "@/components/CatalogSearch";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ContactCTA } from "@/components/ContactCTA";
import { Pagination } from "@/components/Pagination";
import { ProductSubcategoryGroups } from "@/components/ProductSubcategoryGroups";
import {
  getCategories,
  getProducts,
  getSiteSettings,
} from "@/lib/strapi";

export const revalidate = 60;

const PAGE_SIZE = 12;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
};

const parsePage = (raw: string | undefined): number => {
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Math.max(1, Number.isNaN(parsed) ? 1 : parsed);
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

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam, q: qParam } = await searchParams;
  // Duplicate query params arrive as `string[]` (e.g. `?q=a&q=b`) —
  // a non-string value is not a usable search term.
  const q = typeof qParam === "string" ? qParam.trim() : undefined;
  const pageParamValue = typeof pageParam === "string" ? pageParam : undefined;
  const [settings, categories, result] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    // B1 (U2): the search term now flows into the category query so
    // `?q=` on /categoria/[slug] filters within the line.
    getProducts({ categorySlug: slug, page: parsePage(pageParamValue), pageSize: PAGE_SIZE, q }),
  ]);

  const current = categories.find((c) => c.slug === slug);
  if (!current) notFound();

  let page = parsePage(pageParamValue);
  let products = result.products;
  let total = result.total;
  // Stale `?page=` beyond the last page: refetch the last valid page
  // instead of rendering the empty state with products available.
  if (total > 0 && products.length === 0) {
    page = Math.ceil(total / PAGE_SIZE);
    const result = await getProducts({ categorySlug: slug, page, pageSize: PAGE_SIZE, q });
    products = result.products;
    total = result.total;
  }

  const from = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <section aria-labelledby="linea-heading" className="bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-12 sm:px-10 sm:pt-28 sm:pb-16 lg:px-16 lg:pt-32">
          <header className="grid grid-cols-1 gap-8 border-b border-ink-line pb-12 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3">
                <span className="block h-px w-10 bg-taupe" aria-hidden />
                <span className="t-label text-taupe-text">
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
              {/* B1 (U2): the same debounced search input as /catalogo.
                  It builds its push URL from the current pathname, so
                  searching here searches within this line. */}
              <CatalogSearch key={q ?? ""} defaultValue={q} />
              <div className="mt-6">
                <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                  Filtrar por línea
                </p>
                <div className="mt-3">
                  <CategoryFilter categories={categories} activeSlug={current.slug} q={q} />
                </div>
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
          <>
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
              <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
                {q
                  ? `${total} resultado${total === 1 ? "" : "s"} para «${q}»`
                  : `${from}–${to} de ${total} productos`}
              </p>
              {q ? (
                <Link
                  href={`/categoria/${slug}`}
                  className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-text underline-offset-4 hover:underline"
                >
                  Limpiar
                </Link>
              ) : null}
            </div>
            <ProductSubcategoryGroups
              products={products}
              whatsappNumber={settings.whatsappNumber}
            />
            {/* B1 (U2): pagination preserves the search term within the
                line, exactly like /catalogo. */}
            <Pagination
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              basePath={`/categoria/${slug}`}
              q={q}
            />
          </>
        )}
      </section>

      <ContactCTA settings={settings} />
    </>
  );
}
