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
  const req = new Request('http://localhost/api/admin/hero-section', {
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

describe('PUT /api/admin/hero-section — validation', () => {
  it('rejects empty eyebrow / title / primaryCtaLabel with 400', async () => {
    const res = await callPut({
      eyebrow: '',
      title: '',
      primaryCtaLabel: '',
      primaryCtaHref: '/catalogo',
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details?: { issues?: Array<{ path?: Array<string | number> }> } };
    const paths = (body.details?.issues ?? []).flatMap((i) => i.path ?? []);
    expect(paths).toContain('eyebrow');
    expect(paths).toContain('title');
    expect(paths).toContain('primaryCtaLabel');
  });

  it('rejects whitespace-only primaryCtaHref with 400', async () => {
    const res = await callPut({
      eyebrow: 'Ene Muebles · Proveedor institucional',
      title: 'Mobiliario resistente',
      primaryCtaLabel: 'Ver catálogo',
      primaryCtaHref: '   ',
    });
    expect(res.status).toBe(400);
  });

  it('forwards trimmed required fields and dropped optionals', async () => {
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      eyebrow: '  Ene Muebles  ',
      title: '\tMobiliario resistente\n',
      subtitle: '  Sillas, escritorios...  ',
      primaryCtaLabel: '  Ver catálogo  ',
      primaryCtaHref: '  /catalogo  ',
      secondaryCtaLabel: '   ',
      secondaryCtaHref: '',
    });
    expect(res.status).toBe(200);
    const body = (await readSentBody()) as { data?: Record<string, unknown> };
    expect(body.data?.eyebrow).toBe('Ene Muebles');
    expect(body.data?.title).toBe('Mobiliario resistente');
    expect(body.data?.subtitle).toBe('Sillas, escritorios...');
    expect(body.data?.primaryCtaLabel).toBe('Ver catálogo');
    expect(body.data?.primaryCtaHref).toBe('/catalogo');
    expect('secondaryCtaLabel' in (body.data ?? {})).toBe(false);
    expect('secondaryCtaHref' in (body.data ?? {})).toBe(false);
  });

  it('forwards an explicit null for clearing the secondary CTA', async () => {
    mockFetch(200, { data: { ok: true } });
    await callPut({
      eyebrow: 'Ene Muebles',
      title: 'Mobiliario',
      primaryCtaLabel: 'Ver',
      primaryCtaHref: '/catalogo',
      secondaryCtaLabel: null,
      secondaryCtaHref: null,
    });
    const body = (await readSentBody()) as { data?: Record<string, unknown> };
    expect(body.data?.secondaryCtaLabel).toBeNull();
    expect(body.data?.secondaryCtaHref).toBeNull();
  });

  it('forwards upstream 400 with its status', async () => {
    mockFetch(400, {
      error: { name: 'ValidationError', message: 'title must be a string' },
    });
    const res = await callPut({
      eyebrow: 'X',
      title: 'Y',
      primaryCtaLabel: 'Z',
      primaryCtaHref: '/a',
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 when the admin session is missing', async () => {
    const session = await import('@/lib/admin/session');
    (session.getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await callPut({
      eyebrow: 'X',
      title: 'Y',
      primaryCtaLabel: 'Z',
      primaryCtaHref: '/a',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/hero-section — read-through proxy', () => {
  it('forwards the upstream payload to the admin page with status 200', async () => {
    const upstream = {
      data: {
        id: 1,
        eyebrow: 'Ene Muebles · Proveedor institucional',
        title: 'Mobiliario resistente',
        subtitle: 'Sillas, escritorios, estanterías…',
        primaryCtaLabel: 'Ver catálogo',
        primaryCtaHref: '/catalogo',
        secondaryCtaLabel: 'Solicitar cotización',
        secondaryCtaHref: '#contacto',
      },
    };
    mockFetch(200, upstream);
    const res = await callGet();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: Record<string, unknown> };
    expect(body.data?.title).toBe('Mobiliario resistente');
    expect(body.data?.primaryCtaHref).toBe('/catalogo');
    expect(body.data?.secondaryCtaLabel).toBe('Solicitar cotización');
  });

  it('uses the populate=* query on the upstream call', async () => {
    mockFetch(200, { data: null });
    await callGet();
    const url = await readSentUrl();
    expect(url).toContain('/api/hero-section');
    expect(url).toContain('populate=*');
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
