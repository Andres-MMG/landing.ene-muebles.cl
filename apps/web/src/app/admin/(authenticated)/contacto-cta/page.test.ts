import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { site as siteTokens } from '@ene/ui-tokens';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  process.env.STRAPI_INTERNAL_URL = 'http://localhost:1337';
  process.env.STRAPI_API_TOKEN = 'test-token';
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

describe('Admin /admin/contacto-cta data-loader — fallback contract', () => {
  // The contact CTA is the dark block that closes both the home page
  // and the /contacto page. The form owns four scalar fields; the
  // fallback path must show the same site-tokens copy the public
  // site renders when the singleton has not been seeded yet.

  it('returns the ui-tokens fallback when Strapi responds with data: null', async () => {
    mockFetch(200, { data: null });
    const { getContactCtaSection } = await import('./page');
    const section = await getContactCtaSection();
    expect(section.title).toBe(siteTokens.contactHeading);
    expect(section.body).toBe(siteTokens.contactBody);
    expect(section.buttonLabel).toBe(siteTokens.whatsappCta);
  });

  it('returns the ui-tokens fallback when Strapi responds with an empty object', async () => {
    mockFetch(200, { data: {} });
    const { getContactCtaSection } = await import('./page');
    const section = await getContactCtaSection();
    expect(section.title).toBe(siteTokens.contactHeading);
    expect(section.body).toBe(siteTokens.contactBody);
  });

  it('returns the ui-tokens fallback when the upstream fetch throws', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('ECONNREFUSED')
    );
    const { getContactCtaSection } = await import('./page');
    const section = await getContactCtaSection();
    expect(section.title).toBe(siteTokens.contactHeading);
  });

  it('returns Strapi-supplied values verbatim when the singleton is seeded', async () => {
    mockFetch(200, {
      data: {
        title: 'Hablemos de tu proyecto',
        body: 'Cuerpo CMS',
        buttonLabel: 'Escríbenos',
        buttonHref: 'mailto:hola@ene-muebles.cl',
      },
    });
    const { getContactCtaSection } = await import('./page');
    const section = await getContactCtaSection();
    expect(section.title).toBe('Hablemos de tu proyecto');
    expect(section.body).toBe('Cuerpo CMS');
    expect(section.buttonLabel).toBe('Escríbenos');
    expect(section.buttonHref).toBe('mailto:hola@ene-muebles.cl');
  });
});
