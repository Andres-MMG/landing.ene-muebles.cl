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

describe('Admin /admin/hero data-loader — fallback contract', () => {
  // Batch 2 fix: when Strapi v5 has not saved a `hero-section`
  // singleton yet, it responds with `data: null`. Before this fix the
  // admin page rendered blank inputs because the page fell back to
  // `setting?.X ?? ''`. The shared `sectionFallbacks.hero()` +
  // `resolveSection` helpers must return the same fallback content
  // the public site renders, so the editor sees the live site copy
  // instead of empty fields.

  it('returns the ui-tokens fallback when Strapi responds with data: null', async () => {
    mockFetch(200, { data: null });
    const { getHeroSection } = await import('./page');
    const section = await getHeroSection();
    expect(section.title).toBe(siteTokens.promise);
    expect(section.eyebrow).toBe(`${siteTokens.brand} · Proveedor institucional`);
    expect(section.primaryCtaLabel).toBe(siteTokens.catalogAll);
    expect(section.primaryCtaHref).toBe('/catalogo');
    expect(section.secondaryCtaLabel).toBe(siteTokens.quoteCta);
    expect(section.secondaryCtaHref).toBe('#contacto');
  });

  it('returns the ui-tokens fallback when Strapi responds with an empty object', async () => {
    mockFetch(200, { data: {} });
    const { getHeroSection } = await import('./page');
    const section = await getHeroSection();
    // The admin page must show the same copy the public site renders,
    // not blank inputs. `Object.keys(data).length === 0` triggers the
    // fallback even when Strapi returns 200 with `{}`.
    expect(section.title).toBe(siteTokens.promise);
    expect(section.primaryCtaLabel).toBe(siteTokens.catalogAll);
  });

  it('returns the ui-tokens fallback when Strapi responds with non-200 status', async () => {
    mockFetch(500, { error: 'oops' });
    const { getHeroSection } = await import('./page');
    const section = await getHeroSection();
    expect(section.title).toBe(siteTokens.promise);
  });

  it('returns the ui-tokens fallback when the upstream fetch throws', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('ECONNREFUSED')
    );
    const { getHeroSection } = await import('./page');
    const section = await getHeroSection();
    expect(section.title).toBe(siteTokens.promise);
  });

  it('returns the Strapi-supplied values verbatim when the singleton is seeded', async () => {
    mockFetch(200, {
      data: {
        eyebrow: 'CMS eyebrow',
        title: 'CMS title',
        subtitle: 'CMS subtitle',
        primaryCtaLabel: 'Ver',
        primaryCtaHref: '/catalogo',
        secondaryCtaLabel: 'COTIZAR',
        secondaryCtaHref: '#contacto',
      },
    });
    const { getHeroSection } = await import('./page');
    const section = await getHeroSection();
    expect(section.eyebrow).toBe('CMS eyebrow');
    expect(section.title).toBe('CMS title');
    expect(section.subtitle).toBe('CMS subtitle');
    expect(section.primaryCtaLabel).toBe('Ver');
    expect(section.primaryCtaHref).toBe('/catalogo');
    expect(section.secondaryCtaLabel).toBe('COTIZAR');
    expect(section.secondaryCtaHref).toBe('#contacto');
  });

  it('keeps Strapi-supplied fields verbatim (partial payload contract)', async () => {
    // Strapi v5 returns only the fields that have been saved; the rest
    // are absent (not null, not empty string). The data-loader must
    // return the upstream object verbatim so the admin form shows the
    // saved value where Strapi provided one AND a blank input where
    // Strapi did not. The form is the layer that decides how to render
    // missing fields (today: blank input). The fallback contract only
    // applies when the upstream payload is null/empty — never as a
    // partial-payload merge.
    mockFetch(200, { data: { title: 'CMS title only' } });
    const { getHeroSection } = await import('./page');
    const section = await getHeroSection();
    expect(section.title).toBe('CMS title only');
    // Missing fields stay undefined so the form's `?? ''` renders blank.
    expect(section.eyebrow).toBeUndefined();
    expect(section.primaryCtaLabel).toBeUndefined();
  });
});
