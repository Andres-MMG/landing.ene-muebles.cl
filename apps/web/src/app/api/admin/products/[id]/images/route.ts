import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from '@/lib/admin/session';
import { getStrapiAdminToken } from '@/lib/admin/strapi-admin';

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
    data?: { images?: unknown[] };
  } | null;
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
  strapiForm.append('refId', productDocumentId);
  strapiForm.append('field', 'images');

  const uploadRes = await fetch(`${STRAPI}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
    body: strapiForm,
    cache: 'no-store',
  });
  const data = await uploadRes.json().catch(() => null);
  return NextResponse.json(data, { status: uploadRes.status });
}