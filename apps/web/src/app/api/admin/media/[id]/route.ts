import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from '@/lib/admin/session';
import { getStrapiAdminToken } from '@/lib/admin/strapi-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(
  /\/+$/,
  ''
);

/**
 * DELETE /api/admin/media/[id]
 *
 * Delete a media file from Strapi's Media Library. Used by the
 * product image gallery and the category single-image uploader.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const res = await fetch(`${STRAPI}/api/upload/files/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
    cache: 'no-store',
  });
  // 204 = deleted, 200 = Strapi sometimes returns 200 with a body;
  // pass through. Client treats both as success.
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { ok: true }, { status: res.status });
}