import { getStrapiAdminToken } from '@/lib/admin/strapi-admin';
import { ProductForm } from '../ProductForm';
import { emptyProductFormValues } from '../_lib/productFormData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'Nuevo producto · Ene Muebles',
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');
const TOKEN = getStrapiAdminToken();

async function listCategories(): Promise<{ documentId: string; name: string }[]> {
  const res = await fetch(
    `${STRAPI}/api/categories?pagination[pageSize]=100&sort=order:asc&locale=es`,
    { headers: { Authorization: `Bearer ${TOKEN}` }, cache: 'no-store' }
  );
  const json = (await res.json().catch(() => null)) as
    | { data: { documentId: string; name: string }[] }
    | null;
  return json?.data ?? [];
}

export default async function NewProductPage() {
  // Auth + user lookup are owned by the shared admin layout.
  // The page focuses on the category list + product form.
  const categories = await listCategories();

  return (
    <div
      aria-label="Crear nuevo producto"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div
        aria-label="Cabecera de nuevo producto"
        className="border-b border-paper-line-on-ink pb-8"
      >
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe">
          Nuevo producto
        </p>
        <h1 className="t-display mt-3 text-4xl text-paper">Crear producto</h1>
        <p className="t-mono mt-3 text-sm text-paper-mute-on-ink">
          Quedará como borrador hasta que el owner lo publique.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <ProductForm
          mode="create"
          categories={categories}
          productDocumentId={null}
          images={[]}
          initial={emptyProductFormValues()}
        />
      </div>
    </div>
  );
}
