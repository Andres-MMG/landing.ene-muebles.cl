import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/admin/session';
import { getStrapiAdminToken } from '@/lib/admin/strapi-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const qs = new URLSearchParams({
      'pagination[pageSize]': '100',
      sort: 'uploadedAt:desc',
    });
    const res = await fetch(`${STRAPI}/api/import-batches?${qs}`, {
      headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
      cache: 'no-store',
    });
    const payload = await res.json().catch(() => null);
    return NextResponse.json(payload ?? { data: [] }, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'No se pudo cargar el historial.' }, { status: 500 });
  }
}
