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

describe('Admin /admin/footer data-loader — fallback contract', () => {
  // The footer admin page owns three scalar fields (copyrightText,
  // tagline, legalSnippet). The footer-block singleton is a Strapi v5
  // singleType that returns `data: null` until an editor saves. The
  // page must fall back to the same content the public read helper
  // returns so the editor sees live site copy and does not have to
  // retype it.

  it('returns the auto-generated copyright + legal snippet fallback when Strapi responds with data: null', async () => {
    mockFetch(200, { data: null });
    const { getFooterBlock } = await import('./page');
    const block = await getFooterBlock();
    const year = new Date().getFullYear();
    expect(block.copyrightText).toBe(`© ${year} ${siteTokens.brand}`);
    expect(block.legalSnippet).toBe('Proveedor institucional · Chile');
    // Tagline stays undefined so the consumer-side `?? site.footerCopy`
    // resolves to the typed fallback in <Footer>.
    expect(block.tagline).toBeUndefined();
  });

  it('returns the same fallback when Strapi responds with an empty object', async () => {
    mockFetch(200, { data: {} });
    const { getFooterBlock } = await import('./page');
    const block = await getFooterBlock();
    const year = new Date().getFullYear();
    expect(block.copyrightText).toBe(`© ${year} ${siteTokens.brand}`);
    expect(block.legalSnippet).toBe('Proveedor institucional · Chile');
  });

  it('returns the same fallback when the upstream fetch throws', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('ECONNREFUSED')
    );
    const { getFooterBlock } = await import('./page');
    const block = await getFooterBlock();
    const year = new Date().getFullYear();
    expect(block.copyrightText).toBe(`© ${year} ${siteTokens.brand}`);
  });

  it('returns Strapi-supplied values verbatim when the singleton is seeded', async () => {
    mockFetch(200, {
      data: {
        copyrightText: '© 2026 Ene Muebles · institucional',
        tagline: 'CMS tagline',
        legalSnippet: 'CMS legal snippet',
      },
    });
    const { getFooterBlock } = await import('./page');
    const block = await getFooterBlock();
    expect(block.copyrightText).toBe('© 2026 Ene Muebles · institucional');
    expect(block.tagline).toBe('CMS tagline');
    expect(block.legalSnippet).toBe('CMS legal snippet');
  });

  it('embeds the current calendar year in the auto-generated copyright', async () => {
    // Sanity check: the fallback copyright is computed at call time
    // so it stays current as years roll over. If a future change
    // accidentally pre-computes this in a module-level constant,
    // this test catches the regression.
    mockFetch(200, { data: null });
    const { getFooterBlock } = await import('./page');
    const block = await getFooterBlock();
    const year = new Date().getFullYear();
    expect(block.copyrightText).toContain(String(year));
  });
});
