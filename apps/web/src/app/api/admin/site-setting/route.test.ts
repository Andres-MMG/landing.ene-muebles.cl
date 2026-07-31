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

const readJson = async (res: Response) => (await res.json()) as unknown;

const putBody = async (init: { body?: string }): Promise<unknown> => {
  const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
  const init0 = calls[0]?.[1] as RequestInit | undefined;
  const raw = init.body ?? (init0?.body as string | undefined);
  return raw ? JSON.parse(raw) : null;
};

const callPut = async (payload: unknown) => {
  const { PUT } = await import('./route');
  const req = new Request('http://localhost/api/admin/site-setting', {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
  return PUT(req as unknown as Parameters<typeof PUT>[0]);
};

describe('PUT /api/admin/site-setting — validation', () => {
  it('rejects empty siteName with 400 and structured Zod issues', async () => {
    const res = await callPut({ siteName: '', rut: '76.123.456-7', whatsappDefaultMessage: 'hi' });
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as {
      error?: string;
      details?: { issues?: Array<{ path?: string[]; message?: string }> };
    };
    expect(body.error).toBe('Datos inválidos');
    expect(Array.isArray(body.details?.issues)).toBe(true);
    const issueMessages = (body.details?.issues ?? []).map((i) => i.message ?? '');
    expect(issueMessages.join(' ')).toMatch(/sitio|vacío/i);
  });

  it('rejects whitespace-only siteName with 400', async () => {
    const res = await callPut({
      siteName: '   ',
      rut: '76.123.456-7',
      whatsappDefaultMessage: 'hi',
    });
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as { details?: { issues?: unknown[] } };
    expect((body.details?.issues ?? []).length).toBeGreaterThan(0);
  });

  it('rejects whitespace-only rut and whatsappDefaultMessage', async () => {
    const res = await callPut({
      siteName: 'Ene Muebles',
      rut: '   ',
      whatsappDefaultMessage: '\t\n ',
    });
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as {
      details?: { issues?: Array<{ path?: Array<string | number>; message?: string }> };
    };
    const paths = (body.details?.issues ?? []).flatMap((i) => i.path ?? []);
    expect(paths).toContain('rut');
    expect(paths).toContain('whatsappDefaultMessage');
  });

  it('forwards a trimmed body when input has surrounding whitespace', async () => {
    mockFetch(200, { data: { siteName: 'Ene Muebles' } });
    const res = await callPut({
      siteName: '  Ene Muebles  ',
      rut: '\t76.123.456-7\n',
      whatsappDefaultMessage: ' Hola ',
      tagline: '  Muebles a medida  ',
    });
    expect(res.status).toBe(200);
    const body = (await putBody({})) as { data?: Record<string, unknown> };
    expect(body.data).toBeDefined();
    expect(body.data?.siteName).toBe('Ene Muebles');
    expect(body.data?.rut).toBe('76.123.456-7');
    expect(body.data?.whatsappDefaultMessage).toBe('Hola');
    expect(body.data?.tagline).toBe('Muebles a medida');
  });

  it('always sends trimmed required fields and packed socialLinks', async () => {
    mockFetch(200, { data: { ok: true } });
    await callPut({
      siteName: 'Ene Muebles',
      rut: '76.123.456-7',
      whatsappDefaultMessage: 'Hola',
      socialLinks: {
        instagram: '  https://instagram.com/enemuebles  ',
        // Empty-after-trim handles are dropped by the route — the form
        // sends `null` to signal "clear this previously saved handle",
        // which is tested separately.
        facebook: '',
        linkedin: '',
        tiktok: '',
      },
    });
    const body = (await putBody({})) as { data?: { socialLinks?: Record<string, unknown> } };
    const social = body.data?.socialLinks as Record<string, unknown>;
    expect(social.instagram).toBe('https://instagram.com/enemuebles');
    expect('facebook' in social).toBe(false);
    expect('linkedin' in social).toBe(false);
    expect('tiktok' in social).toBe(false);
  });

  it('propagates an explicit null to Strapi for clearing a social field', async () => {
    mockFetch(200, { data: { ok: true } });
    await callPut({
      siteName: 'Ene Muebles',
      rut: '76.123.456-7',
      whatsappDefaultMessage: 'Hola',
      socialLinks: {
        instagram: null,
        facebook: 'https://facebook.com/enemuebles',
        linkedin: null,
        tiktok: null,
      },
    });
    const body = (await putBody({})) as { data?: { socialLinks?: Record<string, unknown> } };
    expect(body.data?.socialLinks).toEqual({
      instagram: null,
      facebook: 'https://facebook.com/enemuebles',
      linkedin: null,
      tiktok: null,
    });
  });

  it('omits optional scalar fields when blank', async () => {
    mockFetch(200, { data: { ok: true } });
    await callPut({
      siteName: 'Ene Muebles',
      rut: '76.123.456-7',
      whatsappDefaultMessage: 'Hola',
      tagline: '',
      contactPhone: '   ',
    });
    const body = (await putBody({})) as { data?: Record<string, unknown> };
    expect('tagline' in (body.data ?? {})).toBe(false);
    expect('contactPhone' in (body.data ?? {})).toBe(false);
  });

  it('forwards a non-OK Strapi response with the upstream status', async () => {
    mockFetch(400, {
      error: {
        status: 400,
        name: 'ValidationError',
        message: 'whatsappDefaultMessage must be a `string`',
        details: {
          errors: [
            { path: ['whatsappDefaultMessage'], message: 'must be a `string`' },
          ],
        },
      },
    });
    const res = await callPut({
      siteName: 'Ene Muebles',
      rut: '76.123.456-7',
      whatsappDefaultMessage: 'Hola',
    });
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as {
      error?: { message?: string; details?: { errors?: unknown[] } };
    };
    expect(body.error?.message).toMatch(/string/);
    expect(body.error?.details?.errors?.length).toBe(1);
  });

  it('forwards an upstream 500 with its status', async () => {
    mockFetch(500, { error: { message: 'cms down' } });
    const res = await callPut({
      siteName: 'Ene Muebles',
      rut: '76.123.456-7',
      whatsappDefaultMessage: 'Hola',
    });
    expect(res.status).toBe(500);
  });

  it('returns 401 when the admin session is missing', async () => {
    const session = await import('@/lib/admin/session');
    (session.getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await callPut({
      siteName: 'Ene Muebles',
      rut: '76.123.456-7',
      whatsappDefaultMessage: 'Hola',
    });
    expect(res.status).toBe(401);
  });

  it('accepts the full URL each social network expects (bug-report scenario)', async () => {
    // After the form normalizes handles → full URLs (see
    // `normalizeSocialHandle` in `SiteSettingForm.tsx`), the proxy
    // must accept them and forward them verbatim to Strapi. This
    // proves the "Invalid url" rejection no longer fires for the
    // exact input combo the operator typed in the bug screenshot.
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      siteName: 'Ene Muebles',
      rut: '76.123.456-7',
      whatsappDefaultMessage: 'Hola',
      socialLinks: {
        instagram: 'https://www.instagram.com/enemuebles',
        facebook: 'https://www.facebook.com/enemuebles.cl',
        linkedin: 'https://www.linkedin.com/in/ene-muebles',
        tiktok: 'https://tiktok.com/@enemuebles',
      },
    });
    expect(res.status).toBe(200);
    const body = (await putBody({})) as { data?: { socialLinks?: Record<string, unknown> } };
    expect(body.data?.socialLinks).toEqual({
      instagram: 'https://www.instagram.com/enemuebles',
      facebook: 'https://www.facebook.com/enemuebles.cl',
      linkedin: 'https://www.linkedin.com/in/ene-muebles',
      tiktok: 'https://tiktok.com/@enemuebles',
    });
  });

  it('accepts a bare social handle (route schema is permissive)', async () => {
    // The route's social-string schema is permissive by design: the
    // form normally does the URL prefix, but if a caller hands us a
    // handle directly we still forward it. Strapi may still reject
    // it; the route's job is to surface the request unchanged.
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      siteName: 'Ene Muebles',
      rut: '76.123.456-7',
      whatsappDefaultMessage: 'Hola',
      socialLinks: { instagram: 'enemuebles' },
    });
    expect(res.status).toBe(200);
    const body = (await putBody({})) as { data?: { socialLinks?: Record<string, unknown> } };
    expect(body.data?.socialLinks).toEqual({ instagram: 'enemuebles' });
  });

  it('rejects a social value with internal whitespace and names the field', async () => {
    // Whitespace inside a URL/handle is always a typo — surface a
    // clear Zod issue naming the offending path so the admin can
    // fix it instead of forwarding garbage to Strapi.
    const res = await callPut({
      siteName: 'Ene Muebles',
      rut: '76.123.456-7',
      whatsappDefaultMessage: 'Hola',
      socialLinks: { instagram: 'ene muebles' },
    });
    expect(res.status).toBe(400);
    const body = (await readJson(res)) as {
      error?: string;
      details?: { issues?: Array<{ path?: Array<string | number>; message?: string }> };
    };
    expect(body.error).toBe('Datos inválidos');
    const issues = body.details?.issues ?? [];
    expect(issues.length).toBeGreaterThan(0);
    const offending = issues.find(
      (i) => Array.isArray(i.path) && i.path.includes('instagram')
    );
    expect(offending?.message).toMatch(/espacios/i);
  });

  it('trims surrounding whitespace from a social URL', async () => {
    mockFetch(200, { data: { ok: true } });
    const res = await callPut({
      siteName: 'Ene Muebles',
      rut: '76.123.456-7',
      whatsappDefaultMessage: 'Hola',
      socialLinks: { instagram: '  https://instagram.com/enemuebles  ' },
    });
    expect(res.status).toBe(200);
    const body = (await putBody({})) as { data?: { socialLinks?: Record<string, unknown> } };
    expect(body.data?.socialLinks).toEqual({
      instagram: 'https://instagram.com/enemuebles',
    });
  });
});