import Link from 'next/link';
import Image from 'next/image';
import { getStrapiAdminToken } from '@/lib/admin/strapi-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'Categorías · Ene Muebles',
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');
const TOKEN = getStrapiAdminToken();
const STRAPI_PUBLIC = (process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:4781').replace(/\/+$/, '');

type CategoryImage = {
  id: number;
  url: string;
  formats?: { thumbnail?: { url?: string } };
  alternativeText?: string | null;
};

type CategoryRow = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  order: number;
  active: boolean;
  image?: CategoryImage | null;
  products?: { count?: number } | null;
};

type StrapiList = { data: CategoryRow[]; meta?: unknown };

function imageUrl(image: CategoryImage | null | undefined): string | null {
  if (!image?.url) return null;
  const path = image.formats?.thumbnail?.url ?? image.url;
  return path.startsWith('http') ? path : `${STRAPI_PUBLIC}${path}`;
}

async function listCategories(): Promise<CategoryRow[]> {
  const qs = new URLSearchParams();
  qs.set('pagination[pageSize]', '100');
  qs.set('sort', 'order:asc');
  qs.set('populate[image]', 'true');
  qs.set('populate[products][count]', 'true');
  qs.set('populate[products][fields][0]', 'id');
  qs.set('publicationState', 'preview');
  qs.set('locale', 'es');

  const res = await fetch(`${STRAPI}/api/categories?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as StrapiList | null;
  return json?.data ?? [];
}

export default async function AdminCategoriesPage() {
  // Auth + user lookup are owned by the shared admin layout.
  const categories = await listCategories();
  const activeCount = categories.filter((c) => c.active).length;

  return (
    <div
      aria-label="Listado de categorías"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div
        aria-label="Cabecera de categorías"
        className="flex flex-wrap items-end justify-between gap-6 border-b border-ink-line pb-8"
      >
        <div>
          <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
            Catálogo
          </p>
          <h1 className="t-display mt-3 text-4xl text-ink">Categorías</h1>
          <p className="t-mono mt-3 text-sm text-ink-mute">
            {categories.length} categorías · {activeCount} activas
          </p>
        </div>
        <Link
          href={'/admin/categorias/nuevo' as never}
          className="inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep"
        >
          + Nueva categoría
          <span aria-hidden>→</span>
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="mt-10 border border-ink-line p-12 text-center">
          <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
            Sin categorías
          </p>
          <p className="mt-3 text-ink-mute">
            Aún no hay categorías en el catálogo. Crea la primera con el botón superior.
          </p>
        </div>
      ) : (
        <div className="mt-10 border-t border-ink">
          <ul role="list" className="divide-y divide-ink-line">
            {categories.map((category) => {
              const thumb = imageUrl(category.image);
              const productCount = category.products?.count ?? 0;
              return (
                <li key={category.documentId}>
                  <Link
                    href={`/admin/categorias/${category.documentId}` as never}
                    className="group grid grid-cols-12 items-center gap-4 py-5 transition-colors duration-300 hover:bg-cream-soft/40 sm:gap-6"
                  >
                    <div className="img-zoom relative col-span-3 aspect-square overflow-hidden bg-cream-soft sm:col-span-2">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={category.image?.alternativeText ?? category.name}
                          fill
                          sizes="(min-width: 640px) 96px, 80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="t-mono text-[9px] uppercase tracking-[0.22em] text-ink-soft">
                            N/A
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="col-span-7 sm:col-span-5">
                      <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                        {category.slug}
                      </p>
                      <p className="t-h2 mt-1 text-base text-ink transition-colors duration-300 group-hover:text-taupe-deep sm:text-lg">
                        {category.name}
                      </p>
                      <p className="t-mono mt-1 text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                        Orden {category.order}
                      </p>
                    </div>

                    <div className="col-span-2 hidden text-right sm:col-span-2 sm:block">
                      <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                        Productos
                      </p>
                      <p className="t-mono mt-1 text-sm text-ink">
                        {productCount}
                      </p>
                    </div>

                    <div className="col-span-2 hidden text-right sm:col-span-2 sm:block">
                      <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                        Estado
                      </p>
                      <p
                        className={`t-mono mt-1 inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] ${
                          category.active
                            ? 'border border-ink text-ink'
                            : 'border border-taupe text-taupe-deep'
                        }`}
                      >
                        {category.active ? 'Activa' : 'Inactiva'}
                      </p>
                    </div>

                    <div className="col-span-12 -mt-2 flex items-center justify-between text-right sm:col-span-1 sm:mt-0 sm:justify-end">
                      <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft sm:hidden">
                        {category.active ? 'Activa' : 'Inactiva'}
                      </span>
                      <span
                        aria-hidden
                        className="inline-flex h-8 w-8 items-center justify-center border border-ink text-sm text-ink transition-all duration-300 group-hover:border-taupe-deep group-hover:bg-ink group-hover:text-paper"
                      >
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="t-mono mt-10 text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        {categories.length} {categories.length === 1 ? 'categoría' : 'categorías'} en total
      </p>
    </div>
  );
}