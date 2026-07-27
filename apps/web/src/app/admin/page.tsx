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
  category?: { name: string; slug: string } | null;
  cover?: { url: string } | null;
};

type StrapiList = { data: Product[]; meta?: unknown };

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
  const json = (await res.json().catch(() => null)) as StrapiList | null;
  return json?.data ?? [];
}

export default async function AdminDashboardPage() {
  // Auth + user lookup are owned by the shared admin layout.
  // The page focuses on the product catalogue for the signed-in user.
  const products = await listProducts();
  const draftCount = products.filter((p) => !p.publishedAt).length;
  const liveCount = products.length - draftCount;

  return (
    <div
      aria-label="Listado de productos"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-ink-line pb-8">
        <div>
          <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
            Catálogo
          </p>
          <h1 className="t-display mt-3 text-4xl text-ink">Productos</h1>
          <p className="t-mono mt-3 text-sm text-ink-mute">
            {products.length} productos · {liveCount} publicados ·{' '}
            {draftCount} en borrador
          </p>
        </div>
        <Link
          href={'/admin/productos/nuevo' as never}
          className="inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep"
        >
          + Nuevo producto
          <span aria-hidden>→</span>
        </Link>
      </header>

      <ProductList products={products} />
    </div>
  );
}
