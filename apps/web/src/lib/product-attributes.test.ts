import { describe, it, expect } from 'vitest';
import {
  buildJsonLdAdditionalProperty,
  buildMetaDescription,
  buildProductJsonLd,
  buildSitemapImageTitle,
  buildSpecsStrip,
  META_DESCRIPTION_MAX,
  OG_DESCRIPTION_MAX,
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
      }).map((e) => e.label)
    ).toEqual(['Qué es', 'Subcategoría', 'Color', 'Material', 'Uso']);
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
