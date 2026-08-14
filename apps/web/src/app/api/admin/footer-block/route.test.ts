import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'mock-session-token' }),
  }),
}));

vi.mock('@/lib/admin/session', () => ({
  getServerSession: vi.fn().mockResolvedValue({ sub: 'admin-1', role: 'owner' }),
}));

vi.mock('@/lib/admin/strapi-admin', () => ({
  getStrapiAdminToken: vi.fn().mockReturnValue('mock-strapi-token'),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  process.env.STRAPI_INTERNAL_URL = 'http://localhost:1337';
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = ORIGINAL_ENV;
});

const mockFetch = (status: number, body: unknown) => {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
};

const callPut = async (payload: unknown) => {
  const { PUT } = await import('./route');
  const req = new Request('http://localhost/api/admin/footer-block', {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
  return PUT(req as unknown as Parameters<typeof PUT>[0]);
};

const callGet = async () => {
  const { GET } = await import('./route');
  return GET();
};

const readSentBody = async (): Promise<unknown> => {
  const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
  const init0 = calls[0]?.[1] as RequestInit | undefined;
  return init0?.body ? JSON.parse(init0.body as string) : null;
};

const readSentUrl = async (): Promise<string> => {
  const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
  return String(calls[0]?.[0] ?? '');
};

describe('PUT /api/admin/footer-block — validation', () => {
  it('rejects empty copyrightText with 400 and structured Zod issues', async () => {
    const res = await callPut({ copyrightText: '' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details?: { issues?: unknown[] } };
    expect((body.details?.issues ?? []).length).toBeGreaterThan(0);
  });

  it('rejects whitespace-only copyrightText with 400', async () => {
    const res = await callPut({ copyrightText: '\n\t ' });
    expect(res.status).toBe(400);
  });

  it('forwards trimmed copyrightText and drops optional blanks', async () => {
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      copyrightText: '  © 2026 Ene Muebles  ',
      tagline: '\tProveedor de mobiliario\n',
      legalSnippet: '   ',
    });
    expect(res.status).toBe(200);
    const body = (await readSentBody()) as { data?: Record<string, unknown> };
    expect(body.data?.copyrightText).toBe('© 2026 Ene Muebles');
    expect(body.data?.tagline).toBe('Proveedor de mobiliario');
    expect('legalSnippet' in (body.data ?? {})).toBe(false);
  });

  it('forwards an explicit null for clearing tagline', async () => {
    mockFetch(200, { data: { ok: true } });
    await callPut({
      copyrightText: '©',
      tagline: null,
    });
    const body = (await readSentBody()) as { data?: Record<string, unknown> };
    expect(body.data?.tagline).toBeNull();
  });

  it('forwards upstream 500 with its status', async () => {
    mockFetch(500, { error: { message: 'cms down' } });
    const res = await callPut({ copyrightText: '©' });
    expect(res.status).toBe(500);
  });

  it('returns 401 when the admin session is missing', async () => {
    const session = await import('@/lib/admin/session');
    (session.getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await callPut({ copyrightText: '©' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/footer-block — read-through proxy', () => {
  it('forwards the upstream payload to the admin page with status 200', async () => {
    const upstream = {
      data: {
        id: 1,
        copyrightText: '© 2026 Ene Muebles',
        tagline: 'Proveedor de mobiliario escolar y de oficina en Chile.',
        legalSnippet: 'Proveedor institucional · Chile',
      },
    };
    mockFetch(200, upstream);
    const res = await callGet();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: Record<string, unknown> };
    expect(body.data?.copyrightText).toBe('© 2026 Ene Muebles');
    expect(body.data?.tagline).toBe('Proveedor de mobiliario escolar y de oficina en Chile.');
    expect(body.data?.legalSnippet).toBe('Proveedor institucional · Chile');
  });

  it('targets /api/footer-block on the upstream call', async () => {
    mockFetch(200, { data: null });
    await callGet();
    const url = await readSentUrl();
    expect(url).toContain('/api/footer-block');
  });

  it('returns 401 when the admin session is missing', async () => {
    const session = await import('@/lib/admin/session');
    (session.getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await callGet();
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('Unauthorized');
  });
});
