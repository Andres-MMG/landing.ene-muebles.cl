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

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * POST   /api/admin/categories/[id]/image
 *   Upload a single image for a category and bind it to the
 *   `image` relation in one call.
 *
 * DELETE /api/admin/categories/[id]/image
 *   Clear the category's image relation and delete the media file
 *   from Strapi's Media Library in one call.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id: categoryDocumentId } = await params;

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'No se envió el archivo' },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'Solo se aceptan imágenes (JPEG, PNG, WebP).' },
      { status: 415 }
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Archivo demasiado grande (máx 2 MB).' },
      { status: 413 }
    );
  }

  // The public route uses documentId, but Strapi's upload relation table
  // stores related_id as an INTEGER. Resolve the numeric entry id before
  // sending refId to /api/upload.
  const categoryRes = await fetch(
    `${STRAPI}/api/categories/${categoryDocumentId}?fields[0]=id`,
    {
      headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
      cache: 'no-store',
    }
  );
  const categoryJson = (await categoryRes.json().catch(() => null)) as {
    data?: { id?: number };
  } | null;
  const categoryId = categoryJson?.data?.id;
  if (!categoryRes.ok || typeof categoryId !== 'number') {
    return NextResponse.json(
      { error: 'No se pudo leer la categoría.' },
      { status: 404 }
    );
  }

  // 1. Upload the file to Strapi's Media Library and bind to the
  //    category's single `image` field.
  const uploadForm = new FormData();
  uploadForm.append('files', file);
  uploadForm.append('ref', 'api::category.category');
  uploadForm.append('refId', String(categoryId));
  uploadForm.append('field', 'image');

  const uploadRes = await fetch(`${STRAPI}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
    body: uploadForm,
    cache: 'no-store',
  });
  const uploaded = (await uploadRes.json().catch(() => null)) as
    | Array<{ id: number }>
    | null;
  if (!uploadRes.ok || !uploaded?.[0]?.id) {
    return NextResponse.json(
      { error: 'No se pudo subir la imagen.' },
      { status: uploadRes.status || 502 }
    );
  }

  // 2. Persist the relation so it survives a Strapi restart (the
  //    `ref/refId/field` on upload binds for the current request
  //    only in some Strapi configurations).
  const bindRes = await fetch(`${STRAPI}/api/categories/${categoryDocumentId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getStrapiAdminToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: { image: uploaded[0].id } }),
    cache: 'no-store',
  });
  const bound = await bindRes.json().catch(() => null);
  // ISR milestone: the category image is rendered on home — purge
  // catalog-tagged fetches once the relation is persisted.
  if (bindRes.ok) revalidateTag(STRAPI_CACHE_TAGS.catalog, { expire: 0 });
  return NextResponse.json(bound ?? { ok: true }, { status: bindRes.status });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id: categoryDocumentId } = await params;

  // Read the current image id (numeric) so we can delete the media
  // row after clearing the relation.
  const read = await fetch(
    `${STRAPI}/api/categories/${categoryDocumentId}?populate=image&fields[0]=id`,
    {
      headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
      cache: 'no-store',
    }
  );
  const readJson = (await read.json().catch(() => null)) as {
    data?: { image?: { id: number } | null };
  } | null;
  const mediaId = readJson?.data?.image?.id;

  // Clear the relation (idempotent — succeeds even if there was no image).
  const unbind = await fetch(`${STRAPI}/api/categories/${categoryDocumentId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getStrapiAdminToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: { image: null } }),
    cache: 'no-store',
  });
  if (!unbind.ok) {
    const errBody = await unbind.json().catch(() => null);
    return NextResponse.json(errBody, { status: unbind.status });
  }

  // Best-effort media delete. Failure here is non-fatal — the row
  // is already orphaned in Strapi's Media Library.
  if (typeof mediaId === 'number') {
    await fetch(`${STRAPI}/api/upload/files/${mediaId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
      cache: 'no-store',
    });
  }

  // ISR milestone: the image was cleared — purge catalog-tagged
  // fetches so the placeholder renders immediately.
  revalidateTag(STRAPI_CACHE_TAGS.catalog, { expire: 0 });

  return new NextResponse(null, { status: 204 });
}
