/**
 * Catalog-import (S1) — minimal coverage for `mapExcelRowToProduct`.
 *
 * Tests the three pieces of logic that downstream slices (S2 batch
 * route and S3 admin UI) will rely on without re-implementing them:
 *
 *   1. `confidence` mapping for the three documented Excel values
 *      plus the catch-all `revision-manual` sink.
 *   2. `slug` derivation (`slugify(name) + '-' + externalId`) when
 *      both pieces are present; absent slug when either is missing.
 *   3. `price` default + warning when the Excel cell is empty.
 *
 * Spanish headers (`Producto`, `ID`, `Certeza`, `Precio`) are used
 * because the importer reads the real-world Excel file. The English
 * aliases are also accepted because S2 / S3 may emit camelCase for
 * tests and manual JSON payloads.
 */

import { describe, it, expect } from 'vitest';

import {
  mapExcelRowToProduct,
  deriveCatalogSlug,
  slugify,
  confidenceFromCerteza,
} from './parseExcelRow';

describe('confidenceFromCerteza', () => {
  it('maps "alta" verbatim', () => {
    expect(confidenceFromCerteza('alta')).toEqual({
      value: 'alta',
      isKnown: true,
    });
  });

  it('maps "media - variante visual" to the kebab-case enum value', () => {
    expect(confidenceFromCerteza('media - variante visual')).toEqual({
      value: 'media-variante-visual',
      isKnown: true,
    });
  });

  it('maps "media - nombre genérico en PDF" to the kebab-case enum value', () => {
    expect(confidenceFromCerteza('media - nombre genérico en PDF')).toEqual({
      value: 'media-nombre-generico-pdf',
      isKnown: true,
    });
  });

  it('maps unknown / empty values to revision-manual', () => {
    expect(confidenceFromCerteza('')).toEqual({
      value: 'revision-manual',
      isKnown: false,
    });
    expect(confidenceFromCerteza('no estoy seguro')).toEqual({
      value: 'revision-manual',
      isKnown: false,
    });
    expect(confidenceFromCerteza(undefined)).toEqual({
      value: 'revision-manual',
      isKnown: false,
    });
  });
});

describe('slugify / deriveCatalogSlug', () => {
  it('lowercases input and strips accents', () => {
    expect(slugify('Silla Escolar Sala Cuna')).toBe('silla-escolar-sala-cuna');
    expect(slugify('Mesa de Reunión')).toBe('mesa-de-reunion');
  });

  it('derives slug from name + externalId', () => {
    expect(deriveCatalogSlug('Silla escolar', 'CAT-2025-001')).toBe(
      'silla-escolar-cat-2025-001'
    );
  });

  it('returns empty slug when name or externalId is missing', () => {
    expect(deriveCatalogSlug('', 'CAT-2025-001')).toBe('');
    expect(deriveCatalogSlug('Silla escolar', '')).toBe('');
  });
});

describe('mapExcelRowToProduct', () => {
  it('maps a fully populated Spanish-header row without warnings', () => {
    const { values, warnings } = mapExcelRowToProduct({
      Producto: 'Silla Escolar',
      ID: 'CAT-2025-001',
      Descripción: 'Silla escolar sala cuna.',
      'Descripción corta': 'Silla sala cuna.',
      Precio: 89000,
      Tipo: 'Silla',
      Subcategoría: 'Sillas y asientos',
      'Ambiente de uso': 'Sala de clases',
      Color: 'Azul',
      Material: 'Madera',
      Página: 12,
      Certeza: 'alta',
      Fuente: 'catalogo_productos_202.xlsx p.12',
      Observación: '',
    });

    expect(warnings).toEqual([]);
    expect(values).toMatchObject({
      name: 'Silla Escolar',
      externalId: 'CAT-2025-001',
      slug: 'silla-escolar-cat-2025-001',
      description: 'Silla escolar sala cuna.',
      shortDescription: 'Silla sala cuna.',
      price: 89000,
      productType: 'Silla',
      subcategory: 'Sillas y asientos',
      usageEnvironment: 'Sala de clases',
      observableColor: 'Azul',
      observableMaterial: 'Madera',
      catalogPage: 12,
      confidence: 'alta',
      source: 'catalogo_productos_202.xlsx p.12',
    });
    expect(values.observation).toBeUndefined();
  });

  it('flags unknown Certeza as revision-manual and surfaces a warning', () => {
    const { values, warnings } = mapExcelRowToProduct({
      Producto: 'Mesa de Reunión',
      ID: 'CAT-2025-002',
      Descripción: 'Mesa institucional.',
      Precio: 150000,
      Certeza: 'no estoy seguro',
    });

    expect(values.confidence).toBe('revision-manual');
    expect(warnings).toContain('certeza faltante o desconocida');
  });

  it('defaults price to 0 and warns when the cell is empty', () => {
    const { values, warnings } = mapExcelRowToProduct({
      Producto: 'Escritorio',
      ID: 'CAT-2025-003',
      Descripción: 'Escritorio institucional.',
      Precio: '',
      Certeza: 'alta',
    });

    expect(values.price).toBe(0);
    expect(warnings).toContain('precio faltante');
  });

  it('falls back to revision-manual and warns when Certeza is empty', () => {
    const { values, warnings } = mapExcelRowToProduct({
      Producto: 'Banca',
      ID: 'CAT-2025-004',
      Descripción: 'Banca escolar.',
      Precio: 45000,
      Certeza: '',
    });

    expect(values.confidence).toBe('revision-manual');
    expect(warnings).toContain('certeza faltante o desconocida');
  });
});
