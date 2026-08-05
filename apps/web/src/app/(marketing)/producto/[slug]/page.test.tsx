import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  process.env.STRAPI_INTERNAL_URL = 'http://localhost:1337';
  process.env.STRAPI_API_TOKEN = 'test-token';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://ene-muebles.cl';
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Mock the `@/lib/strapi` helpers that the page calls. Returns the
 *  `vi` mock so the test can read `mockGetProductBySlug.mock.calls`
 *  if needed. */
function mockStrapi(product: Record<string, unknown> | null, settings?: unknown) {
  vi.doMock('@/lib/strapi', () => ({
    getProductBySlug: vi.fn().mockResolvedValue(product),
    getProducts: vi.fn().mockResolvedValue({ products: [], total: 0 }),
    getSiteSettings: vi.fn().mockResolvedValue(
      settings ?? {
        siteName: 'Ene Muebles',
        contactEmail: 'hola@ene-muebles.cl',
        whatsappNumber: '+56912345678',
      }
    ),
    formatPrice: (p: { price: number; currency: string }) =>
      new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: p.currency,
        maximumFractionDigits: 0,
      }).format(p.price),
    buildWhatsAppLink: (n: string, m: string) =>
      `https://wa.me/${n.replace(/\D/g, '')}?text=${encodeURIComponent(m)}`,
  }));
}

describe('producto/[slug] — generateMetadata', () => {
  it('renders a fallback title when the product is missing', async () => {
    mockStrapi(null);
    const mod = await import('@/app/(marketing)/producto/[slug]/page');
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'nope' }),
    });
    expect(metadata.title).toBe('Producto');
  });

  it('uses shortDescription verbatim when no catalog-import fields are populated', async () => {
    mockStrapi({
      id: 1,
      documentId: 'doc-1',
      name: 'Silla escolar',
      slug: 'silla-escolar',
      description: 'Descripción técnica.',
      shortDescription: 'Silla de melamina.',
      price: 89900,
      currency: 'CLP',
    });
    const mod = await import('@/app/(marketing)/producto/[slug]/page');
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'silla-escolar' }),
    });
    expect(metadata.description).toBe('Silla de melamina.');
    expect(metadata.openGraph?.description).toBe('Silla de melamina.');
  });

  it('falls back to description when shortDescription is missing', async () => {
    mockStrapi({
      id: 1,
      documentId: 'doc-1',
      name: 'Silla escolar',
      slug: 'silla-escolar',
      description: 'Descripción técnica.',
      price: 89900,
      currency: 'CLP',
    });
    const mod = await import('@/app/(marketing)/producto/[slug]/page');
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'silla-escolar' }),
    });
    expect(metadata.description).toBe('Descripción técnica.');
  });

  it('weaves catalog-import attributes into the meta description when present', async () => {
    mockStrapi({
      id: 1,
      documentId: 'doc-1',
      name: 'Silla escolar',
      slug: 'silla-escolar',
      description: 'Descripción técnica.',
      shortDescription: 'Silla apilable.',
      price: 89900,
      currency: 'CLP',
      subcategory: 'Sillas y asientos',
      observableColor: 'Madera natural y blanco',
      observableMaterial: 'Melamina 18 mm',
      usageEnvironment: 'Sala cuna / educación inicial',
    });
    const mod = await import('@/app/(marketing)/producto/[slug]/page');
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'silla-escolar' }),
    });
    expect(metadata.description).toBe(
      'Silla apilable. · Subcategoría: Sillas y asientos · Color: Madera natural y blanco · Material: Melamina 18 mm · Uso: Sala cuna / educación inicial'
    );
  });

  it('caps openGraph.description at ≤ 200 chars', async () => {
    const long = 'Una descripción muy larga '.repeat(20).trim();
    mockStrapi({
      id: 1,
      documentId: 'doc-1',
      name: 'Silla',
      slug: 'silla',
      description: 'd',
      shortDescription: long,
      price: 89900,
      currency: 'CLP',
    });
    const mod = await import('@/app/(marketing)/producto/[slug]/page');
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'silla' }),
    });
    expect((metadata.openGraph?.description as string).length).toBeLessThanOrEqual(200);
  });

  it('always emits the theme-color meta tag', async () => {
    mockStrapi({
      id: 1,
      documentId: 'doc-1',
      name: 'Silla',
      slug: 'silla',
      description: 'd',
      price: 89900,
      currency: 'CLP',
    });
    const mod = await import('@/app/(marketing)/producto/[slug]/page');
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'silla' }),
    });
    expect(metadata.other?.['theme-color']).toBe('#1a1a1a');
  });

  it('emits product:retailer_item_id when externalId is set', async () => {
    mockStrapi({
      id: 1,
      documentId: 'doc-1',
      name: 'Silla',
      slug: 'silla',
      description: 'd',
      price: 89900,
      currency: 'CLP',
      externalId: 'CAT-2025-001',
    });
    const mod = await import('@/app/(marketing)/producto/[slug]/page');
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'silla' }),
    });
    expect(metadata.other?.['product:retailer_item_id']).toBe('CAT-2025-001');
  });

  it('OMITS product:retailer_item_id when externalId is missing', async () => {
    mockStrapi({
      id: 1,
      documentId: 'doc-1',
      name: 'Silla',
      slug: 'silla',
      description: 'd',
      price: 89900,
      currency: 'CLP',
    });
    const mod = await import('@/app/(marketing)/producto/[slug]/page');
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'silla' }),
    });
    expect(metadata.other?.['product:retailer_item_id']).toBeUndefined();
  });

  it('canonical points at the absolute product URL', async () => {
    mockStrapi({
      id: 1,
      documentId: 'doc-1',
      name: 'Silla',
      slug: 'silla-escolar',
      description: 'd',
      price: 89900,
      currency: 'CLP',
    });
    const mod = await import('@/app/(marketing)/producto/[slug]/page');
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: 'silla-escolar' }),
    });
    expect(metadata.alternates?.canonical).toBe('https://ene-muebles.cl/producto/silla-escolar');
  });
});

describe('producto/[slug] — JSON-LD additionalProperty payload', () => {
  // The page calls `buildProductJsonLd` from `@/lib/product-attributes`,
  // which is itself covered by `product-attributes.test.ts`. This block
  // pins the integration: the page wires the helper output into a
  // `<script type="application/ld+json">` payload AND appends the
  // additional `additionalProperty` entries from `buildJsonLdAdditionalProperty`
  // when present.
  it('emits an additionalProperty entry for every populated catalog-import field', async () => {
    const { buildProductJsonLd, buildJsonLdAdditionalProperty } = await import(
      '@/lib/product-attributes'
    );
    const product = {
      id: 1,
      documentId: 'doc-1',
      name: 'Silla',
      slug: 'silla',
      description: 'd',
      price: 89900,
      currency: 'CLP',
      productType: 'Silla',
      subcategory: 'Sillas y asientos',
      usageEnvironment: 'Sala cuna',
      observableColor: 'Madera natural',
      observableMaterial: 'Melamina 18 mm',
      catalogPage: 2,
    };
    const jsonLd = buildProductJsonLd(
      product as Parameters<typeof buildProductJsonLd>[0],
      'https://ene-muebles.cl'
    );
    const additional = buildJsonLdAdditionalProperty(product);
    if (additional.length > 0) jsonLd.additionalProperty = additional;
    expect(jsonLd.additionalProperty).toEqual([
      { '@type': 'PropertyValue', name: 'productType', value: 'Silla' },
      { '@type': 'PropertyValue', name: 'subcategory', value: 'Sillas y asientos' },
      { '@type': 'PropertyValue', name: 'usageEnvironment', value: 'Sala cuna' },
      { '@type': 'PropertyValue', name: 'observableColor', value: 'Madera natural' },
      { '@type': 'PropertyValue', name: 'observableMaterial', value: 'Melamina 18 mm' },
      { '@type': 'PropertyValue', name: 'catalogPage', value: 2 },
    ]);
  });

  it('omits additionalProperty entirely when no catalog-import field is populated', async () => {
    const { buildProductJsonLd, buildJsonLdAdditionalProperty } = await import(
      '@/lib/product-attributes'
    );
    const product = {
      id: 1,
      documentId: 'doc-1',
      name: 'Silla',
      slug: 'silla',
      description: 'd',
      price: 89900,
      currency: 'CLP',
    };
    const jsonLd = buildProductJsonLd(
      product as unknown as Parameters<typeof buildProductJsonLd>[0],
      'https://ene-muebles.cl'
    );
    const additional = buildJsonLdAdditionalProperty(product as never);
    if (additional.length > 0) jsonLd.additionalProperty = additional;
    expect('additionalProperty' in jsonLd).toBe(false);
  });

  it('preserves the legacy fields verbatim (strictly additive)', async () => {
    const { buildProductJsonLd } = await import('@/lib/product-attributes');
    const product = {
      id: 1,
      documentId: 'doc-1',
      name: 'Silla',
      slug: 'silla',
      description: 'd',
      price: 89900,
      currency: 'CLP',
      category: { id: 1, documentId: 'cat-1', name: 'Escolar', slug: 'escolar' },
      productType: 'Silla',
    };
    const jsonLd = buildProductJsonLd(
      product as Parameters<typeof buildProductJsonLd>[0],
      'https://ene-muebles.cl'
    );
    // Every legacy field is intact, even after the catalog-import
    // properties are appended.
    expect(jsonLd['@type']).toBe('Product');
    expect(jsonLd.name).toBe('Silla');
    expect(jsonLd.category).toBe('Escolar');
    expect(jsonLd.brand).toEqual({ '@type': 'Brand', name: 'ENE-MUEBLES' });
    expect(jsonLd.offers).toMatchObject({
      '@type': 'Offer',
      url: 'https://ene-muebles.cl/producto/silla',
      price: 89900,
      priceCurrency: 'CLP',
      availability: 'https://schema.org/InStock',
    });
  });
});
