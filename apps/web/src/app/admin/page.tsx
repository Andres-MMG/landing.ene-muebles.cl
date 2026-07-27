import Link from 'next/link';
import { ProductList } from './ProductList';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'Panel · Ene Muebles',
  robots: { index: false, follow: false },
};

type Product = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  publishedAt: string | null;
  updatedAt?: string;
  category?: { documentId?: string; name: string; slug: string } | null;
  cover?: { url: string } | null;
};

type CategoryRow = {
  documentId: string;
  name: string;
  active: boolean;
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');
const TOKEN = process.env.STRAPI_API_TOKEN ?? '';

async function listProducts(): Promise<Product[]> {
  const qs = new URLSearchParams();
  qs.set('pagination[pageSize]', '50');
  qs.set('sort', 'updatedAt:desc');
  qs.set('populate[category]', 'true');
  qs.set('populate[images]', 'true');
  qs.set('publicationState', 'preview');
  qs.set('locale', 'es');
  const res = await fetch(`${STRAPI}/api/products?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as { data: Product[] } | null;
  return json?.data ?? [];
}

async function listCategories(): Promise<CategoryRow[]> {
  const qs = new URLSearchParams();
  qs.set('pagination[pageSize]', '100');
  qs.set('fields[0]', 'documentId');
  qs.set('fields[1]', 'name');
  qs.set('fields[2]', 'active');
  qs.set('publicationState', 'preview');
  qs.set('locale', 'es');
  const res = await fetch(`${STRAPI}/api/categories?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as { data: CategoryRow[] } | null;
  return json?.data ?? [];
}

export default async function AdminDashboardPage() {
  // Auth + user lookup are owned by the shared admin layout.
  const [products, categories] = await Promise.all([
    listProducts(),
    listCategories(),
  ]);
  const liveCount = products.filter((p) => p.publishedAt).length;
  const draftCount = products.length - liveCount;
  const activeCategories = categories.filter((c) => c.active).length;

  return (
    <div
      aria-label="Listado de productos"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div
        aria-label="Cabecera del panel"
        className="flex flex-wrap items-end justify-between gap-6 border-b border-ink-line pb-8"
      >
        <div>
          <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
            Catálogo
          </p>
          <h1 className="t-display mt-3 text-4xl text-ink">Productos</h1>
        </div>
        <Link
          href={'/admin/productos/nuevo' as never}
          className="inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep"
        >
          + Nuevo producto
          <span aria-hidden>→</span>
        </Link>
      </div>

      <dl
        aria-label="Resumen del catálogo"
        className="mt-8 grid grid-cols-2 gap-px border border-ink-line bg-ink-line sm:grid-cols-4"
      >
        <StatTile label="Total" value={products.length} />
        <StatTile label="Publicados" value={liveCount} />
        <StatTile label="Borradores" value={draftCount} />
        <StatTile label="Categorías" value={activeCategories} />
      </dl>

      <ProductList
        products={products}
        categories={categories.map((c) => ({
          documentId: c.documentId,
          name: c.name,
          active: c.active,
        }))}
      />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-2 bg-paper-pure px-5 py-6">
      <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        {label}
      </dt>
      <dd className="t-display text-3xl text-ink">{value}</dd>
    </div>
  );
}