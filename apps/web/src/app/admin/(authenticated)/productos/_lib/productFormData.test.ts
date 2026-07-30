import { describe, it, expect } from 'vitest';
import {
  buildProductSubmitPayload,
  emptyProductFormValues,
  productToFormValues,
} from './productFormData';

const baseValues = {
  documentId: 'doc-1',
  name: 'Silla escolar',
  slug: 'silla-escolar',
  shortDescription: 'Silla apilable de melamina.',
  description: 'Silla apilable de melamina 18 mm con estructura metálica.',
  price: '89900',
  currency: 'CLP',
  category: 'cat-doc-1',
  active: true,
  featured: false,
  externalId: '',
  productType: '',
  subcategory: '',
  usageEnvironment: '',
  observableColor: '',
  observableMaterial: '',
  catalogPage: '',
  confidence: '',
  source: '',
  observation: '',
  importSource: '' as '' | 'manual' | 'imported',
  importBatchFileName: '',
  importBatchUploadedAt: '',
};

describe('ProductForm.buildProductSubmitPayload — required fields', () => {
  it('always sends trimmed required fields', () => {
    const payload = buildProductSubmitPayload({
      ...baseValues,
      name: '  Silla escolar  ',
      description: '\tSilla de melamina\n',
      price: '89900',
    });
    expect(payload.name).toBe('Silla escolar');
    expect(payload.description).toBe('Silla de melamina');
    expect(payload.price).toBe(89900);
    expect(payload.currency).toBe('CLP');
    expect(payload.active).toBe(true);
    expect(payload.featured).toBe(false);
  });

  it('falls back to CLP when currency is blank', () => {
    const payload = buildProductSubmitPayload({ ...baseValues, currency: '' });
    expect(payload.currency).toBe('CLP');
  });

  it('coerces price to a number', () => {
    const payload = buildProductSubmitPayload({ ...baseValues, price: '199000' });
    expect(payload.price).toBe(199000);
    expect(typeof payload.price).toBe('number');
  });

  it('passes through active and featured booleans', () => {
    const payload = buildProductSubmitPayload({
      ...baseValues,
      active: false,
      featured: true,
    });
    expect(payload.active).toBe(false);
    expect(payload.featured).toBe(true);
  });

  it('sends the slug when present and trimmed', () => {
    const payload = buildProductSubmitPayload({ ...baseValues, slug: '  silla-escolar  ' });
    expect(payload.slug).toBe('silla-escolar');
  });

  it('omits the slug when blank so Strapi keeps the existing one', () => {
    const payload = buildProductSubmitPayload({ ...baseValues, slug: '' });
    expect('slug' in payload).toBe(false);
  });
});

describe('ProductForm.buildProductSubmitPayload — catalog-import fields', () => {
  it('forwards all 10 catalog-import fields when populated', () => {
    const payload = buildProductSubmitPayload({
      ...baseValues,
      externalId: 'CAT-2025-001',
      productType: 'Silla',
      subcategory: 'Sillas y asientos',
      usageEnvironment: 'Sala cuna / educación inicial',
      observableColor: 'Madera natural y blanco',
      observableMaterial: 'Melamina 18 mm',
      catalogPage: '2',
      confidence: 'alta',
      source: 'CATOLOGO PRODUCTOS- 2025.pdf, página 2',
      observation: 'Color revisado visualmente.',
    });
    expect(payload.externalId).toBe('CAT-2025-001');
    expect(payload.productType).toBe('Silla');
    expect(payload.subcategory).toBe('Sillas y asientos');
    expect(payload.usageEnvironment).toBe('Sala cuna / educación inicial');
    expect(payload.observableColor).toBe('Madera natural y blanco');
    expect(payload.observableMaterial).toBe('Melamina 18 mm');
    expect(payload.catalogPage).toBe(2);
    expect(payload.confidence).toBe('alta');
    expect(payload.source).toBe('CATOLOGO PRODUCTOS- 2025.pdf, página 2');
    expect(payload.observation).toBe('Color revisado visualmente.');
  });

  it('omits every catalog-import field when blank', () => {
    const payload = buildProductSubmitPayload(baseValues);
    for (const key of [
      'externalId',
      'productType',
      'subcategory',
      'usageEnvironment',
      'observableColor',
      'observableMaterial',
      'catalogPage',
      'confidence',
      'source',
      'observation',
    ]) {
      expect(key in payload).toBe(false);
    }
  });

  it('coerces catalogPage to a positive integer', () => {
    const payload = buildProductSubmitPayload({ ...baseValues, catalogPage: '5' });
    expect(payload.catalogPage).toBe(5);
  });

  it('drops catalogPage when zero or negative (would violate Strapi min: 1)', () => {
    expect('catalogPage' in buildProductSubmitPayload({ ...baseValues, catalogPage: '0' })).toBe(false);
    expect('catalogPage' in buildProductSubmitPayload({ ...baseValues, catalogPage: '-2' })).toBe(false);
  });

  it('drops catalogPage when not a finite number', () => {
    expect(
      'catalogPage' in buildProductSubmitPayload({ ...baseValues, catalogPage: 'not-a-number' })
    ).toBe(false);
  });

  it('trims whitespace on string catalog-import fields', () => {
    const payload = buildProductSubmitPayload({
      ...baseValues,
      externalId: '  CAT-2025-001  ',
      subcategory: '  Sillas y asientos  ',
      source: '  pdf, página 2  ',
      observation: '  notas  ',
    });
    expect(payload.externalId).toBe('CAT-2025-001');
    expect(payload.subcategory).toBe('Sillas y asientos');
    expect(payload.source).toBe('pdf, página 2');
    expect(payload.observation).toBe('notas');
  });

  it('NEVER sends importSource or importBatch (read-only metadata)', () => {
    const payload = buildProductSubmitPayload({
      ...baseValues,
      importSource: 'imported',
      importBatchFileName: 'catalogo.xlsx',
      importBatchUploadedAt: '2026-07-28T10:00:00.000Z',
    });
    expect('importSource' in payload).toBe(false);
    expect('importBatch' in payload).toBe(false);
  });

  it('forwards confidence verbatim even if it is not a known enum value', () => {
    // Strapi v5 ships the enum server-side; the route's zod schema is
    // the single source of truth for valid values. The form forwards
    // whatever the operator selected.
    const payload = buildProductSubmitPayload({
      ...baseValues,
      confidence: 'revision-manual',
    });
    expect(payload.confidence).toBe('revision-manual');
  });

  it('forwards productType as-is (no enum coercion in the form layer)', () => {
    const payload = buildProductSubmitPayload({ ...baseValues, productType: 'Silla' });
    expect(payload.productType).toBe('Silla');
  });
});

describe('ProductForm.emptyProductFormValues', () => {
  it('returns sensible defaults for the create page', () => {
    const empty = emptyProductFormValues();
    expect(empty.documentId).toBeNull();
    expect(empty.name).toBe('');
    expect(empty.slug).toBe('');
    expect(empty.currency).toBe('CLP');
    expect(empty.active).toBe(true);
    expect(empty.featured).toBe(false);
    // Every catalog-import field is blank.
    expect(empty.externalId).toBe('');
    expect(empty.productType).toBe('');
    expect(empty.subcategory).toBe('');
    expect(empty.usageEnvironment).toBe('');
    expect(empty.observableColor).toBe('');
    expect(empty.observableMaterial).toBe('');
    expect(empty.catalogPage).toBe('');
    expect(empty.confidence).toBe('');
    expect(empty.source).toBe('');
    expect(empty.observation).toBe('');
    expect(empty.importSource).toBe('');
    expect(empty.importBatchFileName).toBe('');
    expect(empty.importBatchUploadedAt).toBe('');
  });

  it('returns a fresh object on every call (no shared reference)', () => {
    const a = emptyProductFormValues();
    const b = emptyProductFormValues();
    expect(a).not.toBe(b);
    a.name = 'mutated';
    expect(b.name).toBe('');
  });
});

describe('ProductForm.productToFormValues', () => {
  it('seeds every catalog-import field from the upstream product', () => {
    const values = productToFormValues({
      documentId: 'doc-1',
      name: 'Silla escolar',
      slug: 'silla-escolar',
      description: 'd',
      price: 89900,
      currency: 'CLP',
      active: true,
      featured: false,
      externalId: 'CAT-2025-001',
      productType: 'Silla',
      subcategory: 'Sillas y asientos',
      usageEnvironment: 'Sala cuna',
      observableColor: 'Madera y blanco',
      observableMaterial: 'Melamina',
      catalogPage: 2,
      confidence: 'alta',
      source: 'pdf',
      observation: 'obs',
      importSource: 'imported',
      importBatch: { fileName: 'catalogo.xlsx', uploadedAt: '2026-07-28T10:00:00.000Z' },
    });
    expect(values.externalId).toBe('CAT-2025-001');
    expect(values.productType).toBe('Silla');
    expect(values.subcategory).toBe('Sillas y asientos');
    expect(values.usageEnvironment).toBe('Sala cuna');
    expect(values.observableColor).toBe('Madera y blanco');
    expect(values.observableMaterial).toBe('Melamina');
    expect(values.catalogPage).toBe('2');
    expect(values.confidence).toBe('alta');
    expect(values.source).toBe('pdf');
    expect(values.observation).toBe('obs');
    expect(values.importSource).toBe('imported');
    expect(values.importBatchFileName).toBe('catalogo.xlsx');
    expect(values.importBatchUploadedAt).toBe('2026-07-28T10:00:00.000Z');
  });

  it('seeds price as a string so the form input renders verbatim', () => {
    const values = productToFormValues({ name: 'X', slug: 'x', description: 'd', price: 199000 });
    expect(values.price).toBe('199000');
  });

  it('falls back to empty string when catalogPage is missing or zero', () => {
    expect(productToFormValues({ name: 'X', slug: 'x', description: 'd' }).catalogPage).toBe('');
    expect(
      productToFormValues({ name: 'X', slug: 'x', description: 'd', catalogPage: 0 }).catalogPage
    ).toBe('');
  });

  it('tolerates missing importBatch', () => {
    const values = productToFormValues({ name: 'X', slug: 'x', description: 'd', importSource: 'manual' });
    expect(values.importBatchFileName).toBe('');
    expect(values.importBatchUploadedAt).toBe('');
  });
});
