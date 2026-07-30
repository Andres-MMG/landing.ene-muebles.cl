import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/admin/session', () => ({ getServerSession: vi.fn().mockResolvedValue({ role: 'owner' }) }));
vi.mock('@/lib/admin/strapi-admin', () => ({ getStrapiAdminToken: vi.fn().mockReturnValue('token') }));

const session = await import('@/lib/admin/session');

beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', vi.fn()); });

describe('GET /api/admin/import-batches', () => {
  it('returns 401 without a session', async () => {
    (session.getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const { GET } = await import('./route');
    expect((await GET()).status).toBe(401);
  });

  it('returns Strapi batches for the owner', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 1, fileName: 'x.xlsx' }] }), { status: 200 }));
    const { GET } = await import('./route');
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).data[0].fileName).toBe('x.xlsx');
  });

  it('passes through a Strapi failure', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'upstream' }), { status: 500 }));
    const { GET } = await import('./route');
    expect((await GET()).status).toBe(500);
  });

  it('returns 403 for a client', async () => {
    (session.getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ role: 'client' });
    const { GET } = await import('./route');
    expect((await GET()).status).toBe(403);
  });
});
