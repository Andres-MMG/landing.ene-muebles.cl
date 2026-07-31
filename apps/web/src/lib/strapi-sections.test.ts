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

const mockFetchError = () => {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
    new Error('ECONNREFUSED')
  );
};

describe('Batch 2 read helpers — fallback semantics', () => {
  it('getAboutSection returns the ui-tokens fallback when Strapi returns null', async () => {
    mockFetch(200, { data: null });
    const { getAboutSection } = await import('./strapi');
    const section = await getAboutSection();
    expect(section.title).toBe(siteTokens.aboutHeading);
    expect(section.eyebrow).toBe(siteTokens.aboutOverline);
    expect(section.intro).toBe(siteTokens.aboutIntro);
    expect(section.missionHeading).toBe(siteTokens.missionHeading);
    expect(section.visionHeading).toBe(siteTokens.visionHeading);
    expect(Array.isArray(section.values)).toBe(true);
  });

  it('getHeroSection returns the ui-tokens fallback when Strapi 404s', async () => {
    mockFetch(404, { data: null });
    const { getHeroSection } = await import('./strapi');
    const section = await getHeroSection();
    expect(section.title).toBe(siteTokens.promise);
    expect(section.primaryCtaLabel).toBe(siteTokens.catalogAll);
    expect(section.primaryCtaHref).toBe('/catalogo');
    expect(section.secondaryCtaLabel).toBe(siteTokens.quoteCta);
  });

  it('getContactCTASection returns the ui-tokens fallback on network failure', async () => {
    mockFetchError();
    const { getContactCTASection } = await import('./strapi');
    const section = await getContactCTASection();
    expect(section.title).toBe(siteTokens.contactHeading);
    expect(section.body).toBe(siteTokens.contactBody);
    expect(section.buttonLabel).toBe(siteTokens.whatsappCta);
  });

  it('getFooterBlock returns the auto-generated copyright fallback on empty data', async () => {
    mockFetch(200, { data: null });
    const { getFooterBlock } = await import('./strapi');
    const block = await getFooterBlock();
    const year = new Date().getFullYear();
    expect(block.copyrightText).toBe(`© ${year} ${siteTokens.brand}`);
    expect(block.legalSnippet).toBe('Proveedor institucional · Chile');
  });
});

// B2 batch 2 fix: contract tests for the 200-with-empty-data and
// 200-with-partial-data paths. The public consumers always read
// `section?.X ?? site.X`, so an empty data object (`data: {}`) and a
// partial object missing required fields MUST leave the missing
// field as `undefined` in the helper output so the consumer-side
// `??` resolves to the typed fallback. Locking the contract here
// makes a regression where Strapi returns an empty object visible
// at unit time.
describe('Batch 2 read helpers — empty/partial 200 contract', () => {
  it('getAboutSection returns undefined fields for 200 with empty data so consumers fall back', async () => {
    mockFetch(200, { data: {} });
    const { getAboutSection } = await import('./strapi');
    const section = await getAboutSection();
    // Every known field is `undefined`, so `section.X ?? site.X`
    // resolves to the typed fallback.
    expect(section.eyebrow).toBeUndefined();
    expect(section.title).toBeUndefined();
    expect(section.intro).toBeUndefined();
    expect(section.missionLabel).toBeUndefined();
    expect(section.missionHeading).toBeUndefined();
    expect(section.visionLabel).toBeUndefined();
    expect(section.visionHeading).toBeUndefined();
    expect(section.valuesLabel).toBeUndefined();
    expect(section.valuesHeading).toBeUndefined();
    // Simulate the consumer-side `??` resolution:
    expect(section.eyebrow ?? siteTokens.aboutOverline).toBe(siteTokens.aboutOverline);
    expect(section.title ?? siteTokens.aboutHeading).toBe(siteTokens.aboutHeading);
    expect(section.missionLabel ?? siteTokens.missionLabel).toBe(siteTokens.missionLabel);
    expect(section.missionHeading ?? siteTokens.missionHeading).toBe(siteTokens.missionHeading);
    expect(section.valuesLabel ?? siteTokens.valuesLabel).toBe(siteTokens.valuesLabel);
  });

  it('getAboutSection exposes the present fields and undefined for missing ones', async () => {
    mockFetch(200, { data: { title: 'CMS title', missionBody: 'only body' } });
    const { getAboutSection } = await import('./strapi');
    const section = await getAboutSection();
    // The CMS-supplied field wins.
    expect(section.title).toBe('CMS title');
    expect(section.missionBody).toBe('only body');
    // Missing fields stay undefined so the consumer's `??` falls back.
    expect(section.eyebrow).toBeUndefined();
    expect(section.missionHeading).toBeUndefined();
    expect(section.valuesLabel).toBeUndefined();
    expect(section.eyebrow ?? siteTokens.aboutOverline).toBe(siteTokens.aboutOverline);
    expect(section.missionHeading ?? siteTokens.missionHeading).toBe(siteTokens.missionHeading);
    expect(section.title ?? siteTokens.aboutHeading).toBe('CMS title');
  });

  it('getHeroSection returns undefined fields for 200 with empty data', async () => {
    mockFetch(200, { data: {} });
    const { getHeroSection } = await import('./strapi');
    const section = await getHeroSection();
    expect(section.eyebrow).toBeUndefined();
    expect(section.title).toBeUndefined();
    expect(section.primaryCtaLabel).toBeUndefined();
    expect(section.primaryCtaHref).toBeUndefined();
    expect(section.title ?? siteTokens.promise).toBe(siteTokens.promise);
    expect(section.primaryCtaLabel ?? siteTokens.catalogAll).toBe(siteTokens.catalogAll);
    expect(section.primaryCtaHref ?? '/catalogo').toBe('/catalogo');
  });

  it('getHeroSection keeps the present subtitle and undefineds the rest', async () => {
    mockFetch(200, { data: { subtitle: 'Subtítulo CMS' } });
    const { getHeroSection } = await import('./strapi');
    const section = await getHeroSection();
    expect(section.subtitle).toBe('Subtítulo CMS');
    expect(section.title).toBeUndefined();
    expect(section.primaryCtaLabel).toBeUndefined();
    expect(section.subtitle).toBe('Subtítulo CMS');
    expect(section.title ?? siteTokens.promise).toBe(siteTokens.promise);
  });

  it('getContactCTASection returns undefined fields for 200 with empty data', async () => {
    mockFetch(200, { data: {} });
    const { getContactCTASection } = await import('./strapi');
    const section = await getContactCTASection();
    expect(section.title).toBeUndefined();
    expect(section.body).toBeUndefined();
    expect(section.buttonLabel).toBeUndefined();
    expect(section.title ?? siteTokens.contactHeading).toBe(siteTokens.contactHeading);
    expect(section.buttonLabel ?? siteTokens.whatsappCta).toBe(siteTokens.whatsappCta);
  });

  it('getContactCTASection keeps the present buttonHref and undefineds the rest', async () => {
    mockFetch(200, { data: { buttonHref: 'https://wa.me/56912345678' } });
    const { getContactCTASection } = await import('./strapi');
    const section = await getContactCTASection();
    expect(section.buttonHref).toBe('https://wa.me/56912345678');
    expect(section.title).toBeUndefined();
    expect(section.title ?? siteTokens.contactHeading).toBe(siteTokens.contactHeading);
  });

  it('getFooterBlock returns undefined fields for 200 with empty data so consumers fall back', async () => {
    mockFetch(200, { data: {} });
    const { getFooterBlock } = await import('./strapi');
    const block = await getFooterBlock();
    const year = new Date().getFullYear();
    // The consumer in `<Footer>` uses `block?.X ?? default`, so the
    // contract is "undefined in → default out". The auto-generated
    // copyright is the consumer's default, not the helper's job.
    expect(block.copyrightText).toBeUndefined();
    expect(block.legalSnippet).toBeUndefined();
    expect(block.tagline).toBeUndefined();
    // Simulate the consumer-side `??` resolution:
    expect(block.copyrightText ?? `© ${year} ${siteTokens.brand}`).toBe(
      `© ${year} ${siteTokens.brand}`
    );
    expect(block.legalSnippet ?? 'Proveedor institucional · Chile').toBe(
      'Proveedor institucional · Chile'
    );
  });

  it('getFooterBlock keeps the present tagline and undefineds the rest', async () => {
    mockFetch(200, { data: { tagline: 'Línea custom' } });
    const { getFooterBlock } = await import('./strapi');
    const block = await getFooterBlock();
    expect(block.tagline).toBe('Línea custom');
    expect(block.copyrightText).toBeUndefined();
    expect(block.legalSnippet).toBeUndefined();
    const year = new Date().getFullYear();
    expect(block.copyrightText ?? `© ${year} ${siteTokens.brand}`).toBe(
      `© ${year} ${siteTokens.brand}`
    );
  });
});
