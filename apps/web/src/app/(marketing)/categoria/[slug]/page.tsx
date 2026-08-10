import { notFound } from "next/navigation";
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
export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
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
  const { page: pageParam } = await searchParams;
  const [settings, categories, result] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getProducts({ categorySlug: slug, page: parsePage(pageParam), pageSize: PAGE_SIZE }),
  ]);

  const current = categories.find((c) => c.slug === slug);
  if (!current) notFound();

  let page = parsePage(pageParam);
  let products = result.products;
  let total = result.total;
  // Stale `?page=` beyond the last page: refetch the last valid page
  // instead of rendering the empty state with products available.
  if (total > 0 && products.length === 0) {
    page = Math.ceil(total / PAGE_SIZE);
    const result = await getProducts({ categorySlug: slug, page, pageSize: PAGE_SIZE });
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
          <>
            <p className="t-mono mb-8 text-[11px] uppercase tracking-[0.22em] text-ink-mute">
              {from}–{to} de {total} productos
            </p>
            <ProductSubcategoryGroups
              products={products}
              whatsappNumber={settings.whatsappNumber}
            />
            <Pagination
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              basePath={`/categoria/${slug}`}
            />
          </>
        )}
      </section>

      <ContactCTA settings={settings} />
    </>
  );
}
