import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/admin/session';
import { findAdminUserByDocumentId } from '@/lib/admin/strapi-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const user = await findAdminUserByDocumentId(session.sub);
  if (!user || !user.active) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
