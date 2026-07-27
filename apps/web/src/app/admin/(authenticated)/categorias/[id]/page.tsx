import { notFound } from 'next/navigation';
import { getStrapiAdminToken } from '@/lib/admin/strapi-admin';
import { CategoryForm } from '../CategoryForm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'Editar categoría · Ene Muebles',
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');
const TOKEN = getStrapiAdminToken();
const STRAPI_PUBLIC = (process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:4781').replace(/\/+$/, '');

type ExistingCategory = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  order: number;
  active: boolean;
  image?: {
    id: number;
    documentId: string;
    url: string;
    formats?: { thumbnail?: { url?: string } };
    alternativeText?: string | null;
    name?: string;
  } | null;
};

async function getCategory(documentId: string): Promise<ExistingCategory | null> {
  const res = await fetch(
    `${STRAPI}/api/categories/${documentId}?populate[image][fields][0]=id&populate[image][fields][1]=documentId&populate[image][fields][2]=url&populate[image][fields][3]=alternativeText&populate[image][fields][4]=name&populate[image][populate]=*`,
    {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: 'no-store',
    }
  );
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as
    | { data: ExistingCategory | null }
    | null;
  return json?.data ?? null;
}

function imageSrc(image: ExistingCategory['image']): string | null {
  if (!image?.url) return null;
  const path = image.formats?.thumbnail?.url ?? image.url;
  return path.startsWith('http') ? path : `${STRAPI_PUBLIC}${path}`;
}

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Auth + user lookup are owned by the shared admin layout.
  const { id } = await params;
  const category = await getCategory(id);
  if (!category) notFound();

  return (
    <div
      aria-label={`Editar categoría ${category.name}`}
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div
        aria-label="Cabecera de edición de categoría"
        className="border-b border-ink-line pb-8"
      >
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Editar categoría
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">{category.name}</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          {category.active ? 'Activa' : 'Inactiva'} · orden {category.order}
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <CategoryForm
          mode="edit"
          documentId={category.documentId}
          currentImageUrl={imageSrc(category.image)}
          currentImageAlt={category.image?.alternativeText ?? category.name}
          initial={{
            name: category.name,
            slug: category.slug,
            description: category.description ?? '',
            order: category.order,
            active: category.active,
          }}
        />
      </div>
    </div>
  );
}