import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

/**
 * Bug 2 — end-to-end value propagation from `/admin/ajustes` to the
 * public site. The data-loader used by the admin page is the
 * contract surface: when Strapi returns a populated `site-setting`
 * singleton the loader must surface its scalar fields verbatim,
 * which the page then wires into the form's `initial.rut`,
 * `initial.siteName`, etc. The form's onSubmit posts the same
 * fields back to `PUT /api/admin/site-setting`, which forwards
 * `data.rut` (not nested under another key) to Strapi. On the next
 * public request `getSiteSettings()` re-reads the singleton with
 * the flat v5 response shape (`data: { siteName, rut, ... }`) and
 * the Footer / Hero components render `RUT ${settings.rut}`.
 *
 * This test pins the first half of that chain: the admin
 * data-loader receives a populated payload and exposes its fields.
 * The form's wiring is verified by code inspection (see
 * `apps/web/src/app/admin/(authenticated)/ajustes/page.tsx`); the
 * Strapi PUT path is verified by `route.test.ts`; the public read
 * chain is verified by `apps/web/src/lib/strapi.test.ts`.
 */
describe('Admin /admin/ajustes data-loader — RUT end-to-end propagation', () => {
  it('returns the Strapi-supplied rut verbatim when the singleton is populated', async () => {
    // Strapi v5 singleType GET with `populate=*` returns the flat
    // shape: `{ data: { id, documentId, siteName, rut, ... } }` —
    // there is NO `attributes` wrapper (that's v4). The data-loader
    // returns the upstream object as-is so the admin form receives
    // every saved scalar field unchanged.
    mockFetch(200, {
      data: {
        id: 1,
        documentId: 'site-setting-1',
        siteName: 'Ene Muebles',
        rut: '76.123.456-7',
        tagline: 'Mobiliario institucional',
        contactEmail: 'hola@ene-muebles.cl',
        contactPhone: '+56 2 2898 4421',
        whatsappNumber: '+56912345678',
        whatsappDefaultMessage: 'Hola, cotización',
        address: 'Av. Apoquindo 4000',
        businessHours: 'Lun a Vie · 09:00–18:00',
        aboutText: 'Muebles artesanales',
        socialLinks: {
          facebook: 'https://facebook.com/enemuebles',
          instagram: 'https://instagram.com/enemuebles',
          tiktok: null,
          linkedin: null,
        },
      },
    });

    const { getSiteSetting } = await import('./page');
    const setting = await getSiteSetting();

    // The data-loader must surface every scalar field the form reads
    // so the operator sees their saved value (not blank) when they
    // re-open the editor. This pins the "no fallback mutation" rule
    // for site-setting — the public read helper throws on missing
    // siteName, and the admin form is required-by-domain too.
    expect(setting).not.toBeNull();
    if (!setting) return; // Narrow for the strict-mode type checker.
    expect(setting.rut).toBe('76.123.456-7');
    expect(setting.siteName).toBe('Ene Muebles');
    expect(setting.tagline).toBe('Mobiliario institucional');
    expect(setting.contactEmail).toBe('hola@ene-muebles.cl');
    expect(setting.whatsappNumber).toBe('+56912345678');
    expect(setting.whatsappDefaultMessage).toBe('Hola, cotización');
    expect(setting.socialLinks?.facebook).toBe('https://facebook.com/enemuebles');
    expect(setting.socialLinks?.instagram).toBe('https://instagram.com/enemuebles');
    // Optional keys may stay undefined when Strapi omits them — the
    // admin form renders blank inputs and the form's
    // `buildSubmitPayload` drops empty scalars from the PUT body.
    expect(setting.businessHours).toBe('Lun a Vie · 09:00–18:00');
  });

  it('returns null when the singleton has not been seeded yet', async () => {
    // Strapi v5 singleType GET responds with `data: null` when the
    // singleton has never been saved. The admin page handles this by
    // passing `null` through to the form, which renders blank inputs.
    // (There is no shared ui-tokens fallback for site-setting because
    // the public read helper requires `siteName` and throws otherwise.)
    mockFetch(200, { data: null });
    const { getSiteSetting } = await import('./page');
    const setting = await getSiteSetting();
    expect(setting).toBeNull();
  });

  it('returns null when the upstream fetch fails', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('ECONNREFUSED')
    );
    const { getSiteSetting } = await import('./page');
    const setting = await getSiteSetting();
    expect(setting).toBeNull();
  });
});

/**
 * Page → form wiring contract.
 *
 * The admin page renders the value at `data: { rut, siteName, ... }`
 * into the form's `initial` prop. The form is a `'use client'`
 * component that owns its `useState(initial)`. When the operator
 * clicks "Guardar ajustes" the form calls `buildSubmitPayload`
 * which puts `rut` at the top level of the body sent to
 * `PUT /api/admin/site-setting`. That proxy route forwards
 * `data.rut` (NOT nested under another key) to Strapi.
 *
 * Because the wiring is plain JSX we verify it by reading the
 * page source — see `apps/web/src/app/admin/(authenticated)/ajustes/page.tsx`
 * lines 71–86: every form field is wired via `setting?.X ?? ''`.
 *
 * Combined with the data-loader test above and the
 * `route.test.ts` PUT-body tests, this proves the full chain:
 *   1. Strapi stores `rut = '76.123.456-7'`
 *   2. GET returns the flat shape with `data.rut`
 *   3. Data-loader surfaces `setting.rut` unchanged
 *   4. Page passes `setting.rut` into the form's `initial.rut`
 *   5. Form `onSubmit` builds `{ rut, ... }` (no nested key)
 *   6. Route forwards `data: { rut }` to Strapi's PUT
 *
 * On the public side (Bug 2 verification):
 *   7. Next request → `getSiteSettings()` reads the same singleton
 *   8. <Hero settings={...}> and <Footer settings={...}> render
 *      `RUT ${settings.rut}` instead of the placeholder
 *   9. ISR (`revalidate: 60`) keeps the cost low; the new value
 *      reaches the public site on the next request after save.
 */
describe('Admin /admin/ajustes page — page → form wiring (static check)', () => {
  it('the page source wires setting?.rut into the form initial prop', async () => {
    // We import the page module and inspect its default export's
    // stringified source. This is a brittle pattern, but it pins the
    // wiring contract at the file level so a refactor that drops
    // `setting?.rut` from the form props breaks the test loudly
    // instead of silently producing blank inputs.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const pagePath = path.join(__dirname, 'page.tsx');
    const source = await fs.readFile(pagePath, 'utf8');
    expect(source).toContain('initial={');
    // The wiring must use the data-loader output (`setting?.rut`),
    // not a hardcoded empty string. This is the exact contract Bug 2
    // relies on: a saved RUT round-trips to the form's `initial.rut`.
    expect(source).toMatch(/rut:\s*setting\?\.rut/);
    expect(source).toMatch(/siteName:\s*setting\?\.siteName/);
  });
});
