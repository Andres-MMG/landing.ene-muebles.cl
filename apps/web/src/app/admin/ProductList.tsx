import Link from 'next/link';
import Image from 'next/image';

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

const STRAPI_BASE = (process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:4781').replace(/\/+$/, '');

function coverUrl(p: Product): string | null {
  if (!p.cover?.url) return null;
  return p.cover.url.startsWith('http') ? p.cover.url : `${STRAPI_BASE}${p.cover.url}`;
}

const priceLabel = (p: Product) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: p.currency || 'CLP',
    maximumFractionDigits: 0,
  }).format(p.price);

const updatedLabel = (iso: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));

/**
 * Table-style list of products for the admin. We use a table
 * (rather than a card grid) so a catalogue of 20+ rows stays
 * scannable; the visual system stays consistent with the public
 * site (mono labels, ink borders, taupe accents).
 */
export function ProductList({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="border border-ink-line p-12 text-center">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
          Sin productos
        </p>
        <p className="mt-3 text-ink-mute">
          Aún no hay productos en el catálogo. Crea el primero con el botón
          superior.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 border-t border-ink">
      <ul role="list" className="divide-y divide-ink-line">
        {products.map((p) => {
          const cover = coverUrl(p);
          const isLive = Boolean(p.publishedAt);
          return (
            <li key={p.documentId}>
              <Link
                href={`/admin/productos/${p.documentId}` as never}
                className="group grid grid-cols-12 items-center gap-4 py-5 transition-colors duration-300 hover:bg-cream-soft/40 sm:gap-6"
              >
                <div className="img-zoom relative col-span-2 aspect-square overflow-hidden bg-cream-soft sm:col-span-1">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={p.name}
                      fill
                      sizes="(min-width: 640px) 80px, 64px"
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
                  <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-taupe-deep">
                    {p.category?.name ?? 'Sin categoría'}
                  </p>
                  <p className="t-h2 mt-1 text-base text-ink transition-colors duration-300 group-hover:text-taupe-deep sm:text-lg">
                    {p.name}
                  </p>
                  <p className="t-mono mt-1 text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                    {p.slug}
                  </p>
                </div>

                <div className="col-span-3 hidden text-right sm:col-span-3 sm:block">
                  <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                    Precio
                  </p>
                  <p className="t-mono mt-1 text-sm text-ink">
                    {priceLabel(p)}
                  </p>
                </div>

                <div className="col-span-3 hidden text-right sm:col-span-2 sm:block">
                  <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                    Estado
                  </p>
                  <p
                    className={`t-mono mt-1 inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] ${
                      isLive
                        ? 'border border-ink text-ink'
                        : 'border border-taupe text-taupe-deep'
                    }`}
                  >
                    {isLive ? 'Publicado' : 'Borrador'}
                  </p>
                </div>

                <div className="col-span-12 -mt-2 flex items-center justify-between text-right sm:col-span-1 sm:mt-0 sm:justify-end">
                  <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft sm:hidden">
                    {isLive ? 'Publicado' : 'Borrador'}
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
  );
}
