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
  const req = new Request('http://localhost/api/admin/contact-cta-section', {
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

describe('PUT /api/admin/contact-cta-section — validation', () => {
  it('rejects empty title / buttonLabel with 400', async () => {
    const res = await callPut({ title: '', buttonLabel: '' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { details?: { issues?: Array<{ path?: Array<string | number> }> } };
    const paths = (body.details?.issues ?? []).flatMap((i) => i.path ?? []);
    expect(paths).toContain('title');
    expect(paths).toContain('buttonLabel');
  });

  it('rejects whitespace-only title with 400', async () => {
    const res = await callPut({ title: '   ', buttonLabel: 'Hablar por WhatsApp' });
    expect(res.status).toBe(400);
  });

  it('forwards trimmed required fields and optional buttonHref', async () => {
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      title: '  Cotiza tu proyecto  ',
      body: '\tCuéntanos qué necesitas\n',
      buttonLabel: ' Hablar por WhatsApp ',
      buttonHref: '  https://wa.me/56912345678  ',
    });
    expect(res.status).toBe(200);
    const body = (await readSentBody()) as { data?: Record<string, unknown> };
    expect(body.data?.title).toBe('Cotiza tu proyecto');
    expect(body.data?.body).toBe('Cuéntanos qué necesitas');
    expect(body.data?.buttonLabel).toBe('Hablar por WhatsApp');
    expect(body.data?.buttonHref).toBe('https://wa.me/56912345678');
  });

  it('omits optional body/buttonHref when blank', async () => {
    mockFetch(200, { data: { ok: true } });
    await callPut({
      title: 'Cotiza',
      buttonLabel: 'Hablar',
      body: '   ',
      buttonHref: '',
    });
    const body = (await readSentBody()) as { data?: Record<string, unknown> };
    expect('body' in (body.data ?? {})).toBe(false);
    expect('buttonHref' in (body.data ?? {})).toBe(false);
  });

  it('forwards upstream 400 with its status', async () => {
    mockFetch(400, { error: { message: 'invalid' } });
    const res = await callPut({ title: 'X', buttonLabel: 'Y' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when the admin session is missing', async () => {
    const session = await import('@/lib/admin/session');
    (session.getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await callPut({ title: 'X', buttonLabel: 'Y' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/contact-cta-section — read-through proxy', () => {
  it('forwards the upstream payload to the admin page with status 200', async () => {
    const upstream = {
      data: {
        id: 1,
        title: 'Cotiza tu proyecto institucional.',
        body: 'Cuéntanos qué necesitas.',
        buttonLabel: 'Hablar por WhatsApp',
        buttonHref: null,
      },
    };
    mockFetch(200, upstream);
    const res = await callGet();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: Record<string, unknown> };
    expect(body.data?.title).toBe('Cotiza tu proyecto institucional.');
    expect(body.data?.buttonLabel).toBe('Hablar por WhatsApp');
    expect(body.data?.buttonHref).toBeNull();
  });

  it('targets /api/contact-cta-section on the upstream call', async () => {
    mockFetch(200, { data: null });
    await callGet();
    const url = await readSentUrl();
    expect(url).toContain('/api/contact-cta-section');
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
