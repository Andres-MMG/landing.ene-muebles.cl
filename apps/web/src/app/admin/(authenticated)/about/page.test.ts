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

describe('Admin /admin/about data-loader — fallback contract', () => {
  // The about section form has twelve scalar fields plus four value
  // rows. When Strapi returns `data: null` the form must show the
  // shared ui-tokens fallback (eyebrow / title / mission / vision /
  // values) so the editor sees the live site copy and does not have
  // to retype it. The contract here mirrors the hero section test.

  it('returns the ui-tokens fallback when Strapi responds with data: null', async () => {
    mockFetch(200, { data: null });
    const { getAboutSection } = await import('./page');
    const section = await getAboutSection();
    expect(section.eyebrow).toBe(siteTokens.aboutOverline);
    expect(section.title).toBe(siteTokens.aboutHeading);
    expect(section.intro).toBe(siteTokens.aboutIntro);
    expect(section.missionLabel).toBe(siteTokens.missionLabel);
    expect(section.missionHeading).toBe(siteTokens.missionHeading);
    expect(section.visionLabel).toBe(siteTokens.visionLabel);
    expect(section.visionHeading).toBe(siteTokens.visionHeading);
    expect(section.valuesLabel).toBe(siteTokens.valuesLabel);
    expect(section.valuesHeading).toBe(siteTokens.valuesHeading);
    // Four `values` rows come from the same site-tokens copy the
    // public site renders.
    expect(Array.isArray(section.values)).toBe(true);
    expect(section.values?.length).toBe(siteTokens.values.length);
    expect(section.values?.[0]?.title).toBe(siteTokens.values[0]?.title);
  });

  it('returns the ui-tokens fallback when Strapi responds with an empty object', async () => {
    mockFetch(200, { data: {} });
    const { getAboutSection } = await import('./page');
    const section = await getAboutSection();
    // `Object.keys(data).length === 0` triggers the fallback even when
    // Strapi returns 200 with `{}` — same rule as the hero section.
    expect(section.title).toBe(siteTokens.aboutHeading);
    expect(section.missionHeading).toBe(siteTokens.missionHeading);
  });

  it('returns the ui-tokens fallback when the upstream fetch throws', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('ECONNREFUSED')
    );
    const { getAboutSection } = await import('./page');
    const section = await getAboutSection();
    expect(section.title).toBe(siteTokens.aboutHeading);
  });

  it('returns Strapi-supplied values verbatim when the singleton is seeded', async () => {
    mockFetch(200, {
      data: {
        eyebrow: 'Sobre nosotros',
        title: 'Una empresa con historia',
        intro: 'Intro CMS',
        missionHeading: 'Heading CMS',
        values: [{ title: 'CMS value', body: 'CMS body' }],
      },
    });
    const { getAboutSection } = await import('./page');
    const section = await getAboutSection();
    expect(section.eyebrow).toBe('Sobre nosotros');
    expect(section.title).toBe('Una empresa con historia');
    expect(section.intro).toBe('Intro CMS');
    expect(section.missionHeading).toBe('Heading CMS');
    expect(section.values?.[0]?.title).toBe('CMS value');
    expect(section.values?.[0]?.body).toBe('CMS body');
  });
});
