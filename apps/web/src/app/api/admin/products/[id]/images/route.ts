import { NextResponse, type NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getServerSession } from '@/lib/admin/session';
import { getStrapiAdminToken } from '@/lib/admin/strapi-admin';
import { STRAPI_CACHE_TAGS } from '@/lib/strapi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(
  /\/+$/,
  ''
);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGES_PER_PRODUCT = 8;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * POST /api/admin/products/[id]/images
 *
 * Multipart upload for a product's image gallery. Server validates
 * MIME / size / total count, then forwards each accepted file to
 * Strapi v5 `POST /api/upload?ref=api::product.product&refId=<id>&field=images`.
 * The product row is looked up with `publicationState=preview` so
 * drafts are visible (admin users can upload to a draft before
 * publishing).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: productDocumentId } = await params;

  const formData = await req.formData();
  const files = formData
    .getAll('files')
    .filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { error: 'No se enviaron archivos' },
      { status: 400 }
    );
  }

  // Validate MIME + per-file size up front.
  for (const f of files) {
    if (!ALLOWED_MIME.has(f.type)) {
      return NextResponse.json(
        { error: 'Solo se aceptan imágenes (JPEG, PNG, WebP).' },
        { status: 415 }
      );
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande (máx 5 MB).' },
        { status: 413 }
      );
    }
  }

  // Look up the current image count via Strapi so we can enforce
  // the 8-cap before any file leaves the server.
  const currentRes = await fetch(
    `${STRAPI}/api/products/${productDocumentId}?populate=images&publicationState=preview&locale=es`,
    {
      headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
      cache: 'no-store',
    }
  );
  if (!currentRes.ok) {
    return NextResponse.json(
      { error: 'No se pudo leer el producto.' },
      { status: 404 }
    );
  }
  const current = (await currentRes.json().catch(() => null)) as {
    data?: { id?: number; images?: unknown[] };
  } | null;
  const productId = current?.data?.id;
  if (typeof productId !== 'number') {
    return NextResponse.json(
      { error: 'El producto no tiene un identificador válido.' },
      { status: 404 }
    );
  }
  const currentCount = Array.isArray(current?.data?.images)
    ? current!.data!.images!.length
    : 0;
  if (currentCount + files.length > MAX_IMAGES_PER_PRODUCT) {
    return NextResponse.json(
      { error: `Máximo ${MAX_IMAGES_PER_PRODUCT} imágenes por producto.` },
      { status: 429 }
    );
  }

  // Forward the validated files to Strapi.
  const strapiForm = new FormData();
  for (const f of files) strapiForm.append('files', f);
  strapiForm.append('ref', 'api::product.product');
  // Strapi's upload relation table stores related_id as an INTEGER.
  // The route receives a documentId, so use the numeric entry id here.
  strapiForm.append('refId', String(productId));
  strapiForm.append('field', 'images');

  const uploadRes = await fetch(`${STRAPI}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
    body: strapiForm,
    cache: 'no-store',
  });
  const data = await uploadRes.json().catch(() => null);
  // ISR milestone: new gallery images change the product page —
  // purge catalog-tagged fetches on success.
  if (uploadRes.ok) revalidateTag(STRAPI_CACHE_TAGS.catalog, { expire: 0 });
  return NextResponse.json(data, { status: uploadRes.status });
}
