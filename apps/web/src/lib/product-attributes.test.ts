import { describe, it, expect } from 'vitest';
import {
  buildJsonLdAdditionalProperty,
  buildMetaDescription,
  buildProductJsonLd,
  buildSitemapImageTitle,
  buildSpecsStrip,
  formatDimensions,
  hasVerifiedOffer,
  META_DESCRIPTION_MAX,
  OG_DESCRIPTION_MAX,
  parseDimensions,
  PRODUCT_CURRENCY_DEFAULT,
  THEME_COLOR,
} from './product-attributes';
import type { Product } from './strapi';

const baseProduct: Pick<
  Product,
  | 'id'
  | 'documentId'
  | 'name'
  | 'slug'
  | 'description'
  | 'price'
  | 'currency'
  | 'category'
  | 'images'
> = {
  id: 1,
  documentId: 'doc-1',
  name: 'Silla escolar',
  slug: 'silla-escolar',
  description: 'Silla de melamina.',
  price: 89900,
  currency: 'CLP',
  category: { id: 1, documentId: 'cat-1', name: 'Escolar', slug: 'escolar' },
  images: [],
};

describe('buildMetaDescription', () => {
  it('uses shortDescription as the lead when present', () => {
    const desc = buildMetaDescription({
      shortDescription: 'Silla apilable.',
      subcategory: 'Sillas y asientos',
      observableColor: 'Madera natural',
    });
    expect(desc).toBe('Silla apilable. · Subcategoría: Sillas y asientos · Color: Madera natural');
  });

  it('falls back to attribute-only string when shortDescription is empty', () => {
    const desc = buildMetaDescription({
      subcategory: 'Mesas',
      observableMaterial: 'Melamina 18 mm',
    });
    expect(desc).toBe('Subcategoría: Mesas · Material: Melamina 18 mm');
  });

  it('returns null when nothing is populated', () => {
    expect(buildMetaDescription({})).toBeNull();
  });

  it('skips empty / whitespace-only fields', () => {
    const desc = buildMetaDescription({
      shortDescription: '  ',
      subcategory: 'Mesas',
      observableColor: '',
      observableMaterial: undefined,
      usageEnvironment: 'Oficina',
    });
    expect(desc).toBe('Subcategoría: Mesas · Uso: Oficina');
  });

  it('caps length to ≤ 280 characters by default', () => {
    const long = 'Una descripción muy larga '.repeat(30).trim();
    const desc = buildMetaDescription(
      {
        shortDescription: long,
        subcategory: 'X',
        observableColor: 'Y',
        observableMaterial: 'Z',
        usageEnvironment: 'W',
      },
      META_DESCRIPTION_MAX
    );
    expect(desc).not.toBeNull();
    expect(desc!.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
  });

  it('honors the OG cap (200 chars) when supplied', () => {
    const long = 'Una descripción muy larga '.repeat(20).trim();
    const desc = buildMetaDescription({ shortDescription: long }, OG_DESCRIPTION_MAX);
    expect(desc!.length).toBeLessThanOrEqual(OG_DESCRIPTION_MAX);
  });

  it('drops a trailing partial word when truncating', () => {
    // 280 chars exact: builds a string where char 280 lands inside a
    // word; the helper must NOT leave "Ca" dangling at the end.
    const padding = 'a'.repeat(280);
    const desc = buildMetaDescription({ shortDescription: padding });
    expect(desc!.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(desc!.endsWith(' ')).toBe(false);
  });
});

describe('buildJsonLdAdditionalProperty', () => {
  it('emits a PropertyValue for each populated catalog-import field', () => {
    const props = buildJsonLdAdditionalProperty({
      productType: 'Silla',
      subcategory: 'Sillas y asientos',
      usageEnvironment: 'Sala cuna',
      observableColor: 'Madera natural',
      observableMaterial: 'Melamina 18 mm',
      catalogPage: 2,
    });
    expect(props).toEqual([
      { '@type': 'PropertyValue', name: 'productType', value: 'Silla' },
      { '@type': 'PropertyValue', name: 'subcategory', value: 'Sillas y asientos' },
      { '@type': 'PropertyValue', name: 'usageEnvironment', value: 'Sala cuna' },
      { '@type': 'PropertyValue', name: 'observableColor', value: 'Madera natural' },
      { '@type': 'PropertyValue', name: 'observableMaterial', value: 'Melamina 18 mm' },
      { '@type': 'PropertyValue', name: 'catalogPage', value: 2 },
    ]);
  });

  it('returns an empty array when nothing is populated', () => {
    expect(buildJsonLdAdditionalProperty({})).toEqual([]);
  });

  it('drops catalogPage when zero or negative', () => {
    expect(
      buildJsonLdAdditionalProperty({ catalogPage: 0 }).find((p) => p.name === 'catalogPage')
    ).toBeUndefined();
    expect(
      buildJsonLdAdditionalProperty({ catalogPage: -1 }).find((p) => p.name === 'catalogPage')
    ).toBeUndefined();
  });

  it('drops empty / whitespace-only string fields', () => {
    const props = buildJsonLdAdditionalProperty({
      productType: '   ',
      subcategory: '',
      observableColor: 'Madera',
    });
    expect(props.map((p) => p.name)).toEqual(['observableColor']);
  });
});

describe('buildSpecsStrip', () => {
  it('emits labels in the documented order', () => {
    expect(
      buildSpecsStrip({
        productType: 'Silla',
        subcategory: 'Sillas y asientos',
        observableColor: 'Madera natural',
        observableMaterial: 'Melamina 18 mm',
        usageEnvironment: 'Sala cuna',
        dimensions: { width: 49, height: 65, depth: 42 },
      }).map((e) => e.label)
    ).toEqual(['Qué es', 'Medidas', 'Subcategoría', 'Color', 'Material', 'Uso']);
  });

  it('emits a Medidas entry only when dimensions are parseable', () => {
    expect(
      buildSpecsStrip({ productType: 'Silla', dimensions: { width: 49, height: 65, depth: 42 } })
    ).toEqual([
      { label: 'Qué es', value: 'Silla' },
      { label: 'Medidas', value: '49 x 65 x 42 cm' },
    ]);
    expect(buildSpecsStrip({ productType: 'Silla' }).map((e) => e.label)).toEqual(['Qué es']);
  });

  it('skips blank fields entirely', () => {
    const entries = buildSpecsStrip({
      productType: 'Silla',
      observableMaterial: 'Melamina',
    });
    expect(entries).toEqual([
      { label: 'Qué es', value: 'Silla' },
      { label: 'Material', value: 'Melamina' },
    ]);
  });

  it('returns an empty array when nothing is populated', () => {
    expect(buildSpecsStrip({})).toEqual([]);
  });
});

describe('parseDimensions', () => {
  it('uses structured width/height/depth when present', () => {
    expect(parseDimensions({ width: 49, height: 65, depth: 42 })).toEqual({
      width: 49,
      height: 65,
      depth: 42,
    });
  });

  it('parses a raw source string like "49cm x 65cm x 42cm"', () => {
    expect(parseDimensions({ source: '49cm x 65cm x 42cm' })).toEqual({
      width: 49,
      height: 65,
      depth: 42,
    });
  });

  it('parses a bare "49x65x42" source string', () => {
    expect(parseDimensions({ source: '49x65x42' })).toEqual({
      width: 49,
      height: 65,
      depth: 42,
    });
  });

  it('parses source strings with loose spacing, ×, or cm suffixes', () => {
    expect(parseDimensions({ source: ' 49 cm × 65 cm × 42 cm ' })).toEqual({
      width: 49,
      height: 65,
      depth: 42,
    });
  });

  it('parses decimal values', () => {
    expect(parseDimensions({ source: '49,5 x 65 x 42' })).toEqual({
      width: 49.5,
      height: 65,
      depth: 42,
    });
  });

  it('falls back to source when the structured shape is present but empty', () => {
    expect(parseDimensions({ weight: 12, source: '49x65x42' })).toEqual({
      width: 49,
      height: 65,
      depth: 42,
    });
  });

  it('returns null when dimensions are missing entirely', () => {
    expect(parseDimensions(undefined)).toBeNull();
    expect(parseDimensions(null)).toBeNull();
    expect(parseDimensions({})).toBeNull();
  });

  it('returns null for malformed source strings', () => {
    expect(parseDimensions({ source: 'medidas varias' })).toBeNull();
    expect(parseDimensions({ source: '49 x 65' })).toBeNull();
    expect(parseDimensions({ source: '49x65x42x10' })).toBeNull();
    expect(parseDimensions({ source: '' })).toBeNull();
  });

  it('ignores non-positive structured values', () => {
    expect(parseDimensions({ width: 0, height: -5, depth: 42 })).toEqual({ depth: 42 });
  });
});

describe('formatDimensions', () => {
  it('formats a compact Spanish Ancho x Alto x Profundidad row', () => {
    expect(formatDimensions({ dimensions: { width: 49, height: 65, depth: 42 } })).toBe(
      '49 x 65 x 42 cm'
    );
  });

  it('formats from the raw source string', () => {
    expect(formatDimensions({ dimensions: { source: '49cm x 65cm x 42cm' } })).toBe(
      '49 x 65 x 42 cm'
    );
  });

  it('returns null when nothing is parseable', () => {
    expect(formatDimensions({ dimensions: undefined })).toBeNull();
    expect(formatDimensions({ dimensions: { source: 'nada' } })).toBeNull();
  });
});

describe('buildProductJsonLd', () => {
  it('preserves every previously-existing field verbatim (strictly additive)', () => {
    const jsonLd = buildProductJsonLd(
      {
        ...baseProduct,
        images: [
          {
            id: 10,
            documentId: 'img-1',
            url: 'https://cdn.example.com/silla.jpg',
            alternativeText: 'Silla escolar',
          },
        ],
      },
      'https://ene-muebles.cl'
    );
    expect(jsonLd['@context']).toBe('https://schema.org/');
    expect(jsonLd['@type']).toBe('Product');
    expect(jsonLd.name).toBe('Silla escolar');
    expect(jsonLd.description).toBe('Silla de melamina.');
    expect(jsonLd.image).toEqual(['https://cdn.example.com/silla.jpg']);
    expect(jsonLd.category).toBe('Escolar');
    expect(jsonLd.brand).toEqual({ '@type': 'Brand', name: 'ENE-MUEBLES' });
    expect(jsonLd.offers).toEqual({
      '@type': 'Offer',
      url: 'https://ene-muebles.cl/producto/silla-escolar',
      price: 89900,
      priceCurrency: 'CLP',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'ENE-MUEBLES' },
    });
  });

  it('does NOT include additionalProperty when no catalog-import field is populated', () => {
    const jsonLd = buildProductJsonLd(baseProduct, 'https://ene-muebles.cl');
    expect('additionalProperty' in jsonLd).toBe(false);
  });

  it('appends additionalProperty when at least one catalog-import field is populated', () => {
    const jsonLd = buildProductJsonLd(
      { ...baseProduct, productType: 'Silla' },
      'https://ene-muebles.cl'
    );
    expect(jsonLd.additionalProperty).toEqual([
      { '@type': 'PropertyValue', name: 'productType', value: 'Silla' },
    ]);
  });

  it('prefers shortDescription over description for the JSON-LD description', () => {
    const jsonLd = buildProductJsonLd(
      {
        ...baseProduct,
        shortDescription: 'Versión corta.',
        description: 'Descripción técnica completa.',
      },
      'https://ene-muebles.cl'
    );
    expect(jsonLd.description).toBe('Versión corta.');
  });
});

describe('buildProductJsonLd offers gating (B2/U12)', () => {
  it('omits offers entirely when the price is zero (UI hides it)', () => {
    const jsonLd = buildProductJsonLd(
      { ...baseProduct, price: 0 },
      'https://ene-muebles.cl'
    );
    expect('offers' in jsonLd).toBe(false);
    // availability must not leak without offers either.
    expect(jsonLd.availability).toBeUndefined();
  });

  it('omits offers when price is missing at runtime', () => {
    const jsonLd = buildProductJsonLd(
      { ...baseProduct, price: undefined as unknown as number },
      'https://ene-muebles.cl'
    );
    expect('offers' in jsonLd).toBe(false);
  });

  it('omits offers when price is NaN (importer garbage)', () => {
    const jsonLd = buildProductJsonLd(
      { ...baseProduct, price: Number.NaN },
      'https://ene-muebles.cl'
    );
    expect('offers' in jsonLd).toBe(false);
  });

  it('omits offers when price is negative or infinite', () => {
    expect(
      'offers' in
        buildProductJsonLd({ ...baseProduct, price: -1 }, 'https://ene-muebles.cl')
    ).toBe(false);
    expect(
      'offers' in
        buildProductJsonLd(
          { ...baseProduct, price: Number.POSITIVE_INFINITY },
          'https://ene-muebles.cl'
        )
    ).toBe(false);
  });

  it('emits a valid Offer for a positive CLP price', () => {
    const jsonLd = buildProductJsonLd(baseProduct, 'https://ene-muebles.cl');
    expect(jsonLd.offers).toEqual({
      '@type': 'Offer',
      url: 'https://ene-muebles.cl/producto/silla-escolar',
      price: 89900,
      priceCurrency: 'CLP',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'ENE-MUEBLES' },
    });
  });

  it('defaults a missing currency to CLP like formatPrice', () => {
    const jsonLd = buildProductJsonLd(
      { ...baseProduct, currency: '' },
      'https://ene-muebles.cl'
    );
    expect((jsonLd.offers as { priceCurrency: string }).priceCurrency).toBe('CLP');
  });

  it('omits offers when the currency is not CLP', () => {
    const jsonLd = buildProductJsonLd(
      { ...baseProduct, currency: 'USD' },
      'https://ene-muebles.cl'
    );
    expect('offers' in jsonLd).toBe(false);
  });

  it('never emits aggregateRating or Review', () => {
    const jsonLd = buildProductJsonLd(baseProduct, 'https://ene-muebles.cl');
    expect('aggregateRating' in jsonLd).toBe(false);
    expect('review' in jsonLd).toBe(false);
  });
});

describe('hasVerifiedOffer', () => {
  it('accepts a finite positive CLP price', () => {
    expect(hasVerifiedOffer({ price: 89900, currency: 'CLP' })).toBe(true);
    expect(hasVerifiedOffer({ price: 89900, currency: 'clp' })).toBe(true);
    expect(hasVerifiedOffer({ price: 89900, currency: '' })).toBe(true);
    expect(hasVerifiedOffer({ price: 89900, currency: undefined as unknown as string })).toBe(
      true
    );
    expect(PRODUCT_CURRENCY_DEFAULT).toBe('CLP');
  });

  it('rejects zero, negative, NaN, infinite and missing prices', () => {
    expect(hasVerifiedOffer({ price: 0, currency: 'CLP' })).toBe(false);
    expect(hasVerifiedOffer({ price: -5, currency: 'CLP' })).toBe(false);
    expect(hasVerifiedOffer({ price: Number.NaN, currency: 'CLP' })).toBe(false);
    expect(hasVerifiedOffer({ price: Number.POSITIVE_INFINITY, currency: 'CLP' })).toBe(false);
    expect(hasVerifiedOffer({ price: undefined as unknown as number, currency: 'CLP' })).toBe(
      false
    );
  });

  it('rejects non-CLP currencies', () => {
    expect(hasVerifiedOffer({ price: 89900, currency: 'USD' })).toBe(false);
    expect(hasVerifiedOffer({ price: 89900, currency: ' usd ' })).toBe(false);
  });
});

describe('buildSitemapImageTitle', () => {
  it('joins populated catalog-import fields with ·', () => {
    expect(
      buildSitemapImageTitle({
        name: 'Silla',
        productType: 'Silla',
        subcategory: 'Sillas y asientos',
        observableColor: 'Madera natural',
      })
    ).toBe('Silla · Sillas y asientos · Madera natural');
  });

  it('falls back to product name when no catalog-import field is populated', () => {
    expect(buildSitemapImageTitle({ name: 'Silla escolar' })).toBe('Silla escolar');
  });

  it('omits blank fields', () => {
    expect(
      buildSitemapImageTitle({
        name: 'Silla',
        productType: '',
        subcategory: '  ',
        observableColor: 'Madera',
      })
    ).toBe('Madera');
  });
});

describe('THEME_COLOR', () => {
  it('exposes a neutral ink tone matching the public palette', () => {
    expect(THEME_COLOR).toBe('#1a1a1a');
  });
});
