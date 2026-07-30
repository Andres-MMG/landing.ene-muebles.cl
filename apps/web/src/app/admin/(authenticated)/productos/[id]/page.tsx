import { notFound } from 'next/navigation';
import { getStrapiAdminToken } from '@/lib/admin/strapi-admin';
import { strapiMediaUrl } from '@/lib/strapi-media';
import { ProductForm } from '../ProductForm';
import { productToFormValues } from '../_lib/productFormData';
import { DeleteProductButton } from './DeleteProductButton';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'Editar producto · Ene Muebles',
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');
const TOKEN = getStrapiAdminToken();

type AdminProduct = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  currency: string;
  active: boolean;
  featured: boolean;
  publishedAt: string | null;
  category?: { documentId: string; name: string } | null;
  images?: {
    id: number;
    documentId: string;
    url: string;
    formats?: { thumbnail?: { url: string } };
    name: string;
  }[];
  /** Catalog-import (S1) — 10 optional fields. */
  externalId?: string;
  productType?: string;
  subcategory?: string;
  usageEnvironment?: string;
  observableColor?: string;
  observableMaterial?: string;
  catalogPage?: number;
  confidence?: string;
  source?: string;
  observation?: string;
  /** Catalog-import (S2b) — read-only provenance. */
  importSource?: 'manual' | 'imported';
  importBatch?: {
    documentId?: string;
    fileName?: string;
    uploadedAt?: string;
  } | null;
};

type AdminCategory = { documentId: string; name: string };

async function getProduct(
  documentId: string
): Promise<AdminProduct | null> {
  const res = await fetch(
    `${STRAPI}/api/products/${documentId}?populate[category]=true&populate[images]=true&populate[importBatch]=true&publicationState=preview&locale=es`,
    { headers: { Authorization: `Bearer ${TOKEN}` }, cache: 'no-store' }
  );
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as
    | { data: AdminProduct | null }
    | null;
  return json?.data ?? null;
}

async function listCategories(): Promise<AdminCategory[]> {
  const res = await fetch(
    `${STRAPI}/api/categories?pagination[pageSize]=100&sort=order:asc&locale=es`,
    { headers: { Authorization: `Bearer ${TOKEN}` }, cache: 'no-store' }
  );
  const json = (await res.json().catch(() => null)) as
    | { data: AdminCategory[] }
    | null;
  return json?.data ?? [];
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Auth + user lookup are owned by the shared admin layout.
  // The page focuses on the product + category list for the editor.
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProduct(id),
    listCategories(),
  ]);
  if (!product) notFound();

  return (
    <div
      aria-label={`Editar producto ${product.name}`}
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div
        aria-label="Cabecera de edición"
        className="border-b border-paper-line-on-ink pb-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe">
              Editar producto
            </p>
            <h1 className="t-display mt-3 text-4xl text-paper">{product.name}</h1>
            <p className="t-mono mt-3 text-sm text-paper-mute-on-ink">
              {product.publishedAt ? 'Publicado' : 'Borrador (pendiente de publicar)'} ·{' '}
              {product.category?.name ?? 'Sin categoría'}
            </p>
          </div>
          <DeleteProductButton id={product.documentId} />
        </div>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <ProductForm
          mode="edit"
          categories={categories}
          productDocumentId={product.documentId}
          images={(product.images ?? []).map((image) => {
            const url = strapiMediaUrl(image.url) ?? '';
            const thumb = strapiMediaUrl(image.formats?.thumbnail?.url) ?? url;
            return {
              id: image.id,
              documentId: image.documentId,
              url,
              thumbnailUrl: thumb,
              name: image.name,
            };
          })}
          initial={productToFormValues(product)}
        />
      </div>
    </div>
  );
}
