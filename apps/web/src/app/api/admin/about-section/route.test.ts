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
  const req = new Request('http://localhost/api/admin/about-section', {
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

describe('PUT /api/admin/about-section — validation', () => {
  it('rejects empty eyebrow with 400 and structured Zod issues', async () => {
    const res = await callPut({ eyebrow: '', title: 'Sobre nosotros' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details?: { issues?: unknown[] } };
    expect((body.details?.issues ?? []).length).toBeGreaterThan(0);
  });

  it('rejects whitespace-only title with 400', async () => {
    const res = await callPut({ eyebrow: 'Datos', title: '   ' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details?: { issues?: unknown[] } };
    expect((body.details?.issues ?? []).length).toBeGreaterThan(0);
  });

  it('returns 400 with a useful message when eyebrow is omitted entirely', async () => {
    const res = await callPut({ title: 'Sobre nosotros' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error?: string;
      details?: { issues?: Array<{ path?: Array<string | number>; message?: string }> };
    };
    expect(body.error).toBe('Datos inválidos');
    const paths = (body.details?.issues ?? []).flatMap((i) => i.path ?? []);
    expect(paths).toContain('eyebrow');
    const eyebrowIssue = (body.details?.issues ?? []).find((i) =>
      Array.isArray(i.path) && i.path[0] === 'eyebrow'
    );
    expect(eyebrowIssue?.message).toBeTruthy();
  });

  it('returns 400 with a useful message when title is omitted entirely', async () => {
    const res = await callPut({ eyebrow: 'Datos' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      details?: { issues?: Array<{ path?: Array<string | number> }> };
    };
    const paths = (body.details?.issues ?? []).flatMap((i) => i.path ?? []);
    expect(paths).toContain('title');
  });

  it('forwards trimmed fields and drops omitted ones', async () => {
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      eyebrow: '  Datos  ',
      title: '\tSobre nosotros\n',
      intro: '  Intro text  ',
      body: '   ',
    });
    expect(res.status).toBe(200);
    const body = (await readSentBody()) as { data?: Record<string, unknown> };
    expect(body.data?.eyebrow).toBe('Datos');
    expect(body.data?.title).toBe('Sobre nosotros');
    expect(body.data?.intro).toBe('Intro text');
    expect('body' in (body.data ?? {})).toBe(false);
  });

  it('forwards the new missionLabel / valuesHeading / valuesLabel fields when present', async () => {
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      eyebrow: 'Datos',
      title: 'Sobre nosotros',
      missionLabel: '  Misión  ',
      valuesLabel: ' Valores ',
      valuesHeading: '  Cuatro compromisos por escrito.  ',
    });
    expect(res.status).toBe(200);
    const body = (await readSentBody()) as { data?: Record<string, unknown> };
    expect(body.data?.missionLabel).toBe('Misión');
    expect(body.data?.valuesLabel).toBe('Valores');
    expect(body.data?.valuesHeading).toBe('Cuatro compromisos por escrito.');
  });

  it('forwards an explicit null for clearing', async () => {
    mockFetch(200, { data: { ok: true } });
    await callPut({
      eyebrow: 'Datos',
      title: 'Sobre nosotros',
      missionBody: null,
    });
    const body = (await readSentBody()) as { data?: Record<string, unknown> };
    expect(body.data?.missionBody).toBeNull();
  });

  it('forwards upstream 500 with its status', async () => {
    mockFetch(500, { error: { message: 'cms down' } });
    const res = await callPut({ eyebrow: 'Datos', title: 'X' });
    expect(res.status).toBe(500);
  });

  it('returns 401 when the admin session is missing', async () => {
    const session = await import('@/lib/admin/session');
    (session.getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await callPut({ eyebrow: 'Datos', title: 'X' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/about-section — read-through proxy', () => {
  it('forwards the upstream payload to the admin page with status 200', async () => {
    const upstream = {
      data: {
        id: 1,
        eyebrow: 'Datos',
        title: 'Sobre nosotros',
        missionLabel: 'Misión',
        missionHeading: 'Suministrar…',
        valuesLabel: 'Valores',
        valuesHeading: 'Cuatro compromisos por escrito.',
      },
    };
    mockFetch(200, upstream);
    const res = await callGet();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: Record<string, unknown> };
    expect(body.data?.eyebrow).toBe('Datos');
    expect(body.data?.missionLabel).toBe('Misión');
    expect(body.data?.valuesHeading).toBe('Cuatro compromisos por escrito.');
  });

  it('uses the populate=* query on the upstream call so the admin page receives the full record', async () => {
    mockFetch(200, { data: null });
    await callGet();
    const url = await readSentUrl();
    expect(url).toContain('/api/about-section');
    expect(url).toContain('populate=*');
  });

  it('passes the upstream status through for 404 / empty records', async () => {
    mockFetch(200, { data: null });
    const res = await callGet();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: unknown };
    expect(body.data).toBeNull();
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
