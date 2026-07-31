import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Catalog-import (S4) — source-level assertions on the admin product
 * form. The form's render path uses DOM (`useState`, controlled
 * inputs), which is not testable without a DOM environment in this
 * project; see `productFormData.test.ts` for the wire-shape contract
 * and the pure `buildProductSubmitPayload` helper. This block pins
 * the form's *structural* contract — i.e. that the new
 * "Atributos del catálogo" section and the read-only badge survive
 * a future refactor.
 *
 * Read the source via `fs.readFileSync` so the assertions don't
 * require a build step.
 */

const formPath = join(
  process.cwd(),
  'apps/web/src/app/admin/(authenticated)/productos/ProductForm.tsx'
);

describe('ProductForm — "Atributos del catálogo" section', () => {
  const source = readFileSync(formPath, 'utf8');

  it('renders the section legend "Atributos del catálogo"', () => {
    expect(source).toContain('Atributos del catálogo');
  });

  it('renders an input bound to externalId with a CAT-style placeholder', () => {
    expect(source).toMatch(/externalId/);
    expect(source).toContain('CAT-2025-001');
  });

  it('renders the productType select with all 6 enum options', () => {
    // The form uses `PRODUCT_TYPE_OPTIONS.map(...)` to render each
    // option. The constant is imported from `_lib/productFormData.ts`.
    // Verify the constant contains every required value.
    const dataPath = join(
      process.cwd(),
      'apps/web/src/app/admin/(authenticated)/productos/_lib/productFormData.ts'
    );
    const dataSource = readFileSync(dataPath, 'utf8');
    for (const opt of ['Silla', 'Mesa', 'Escritorio', 'Banca', 'Piso', 'Cuna']) {
      expect(dataSource).toMatch(new RegExp(`['"]${opt}['"]`));
      expect(source).toContain('PRODUCT_TYPE_OPTIONS');
    }
  });

  it('renders the confidence select with all 5 enum options', () => {
    const dataPath = join(
      process.cwd(),
      'apps/web/src/app/admin/(authenticated)/productos/_lib/productFormData.ts'
    );
    const dataSource = readFileSync(dataPath, 'utf8');
    for (const opt of [
      'alta',
      'media-variante-visual',
      'media-nombre-generico-pdf',
      'baja',
      'revision-manual',
    ]) {
      expect(dataSource).toMatch(new RegExp(`['"]${opt}['"]`));
      expect(source).toContain('CONFIDENCE_OPTIONS');
    }
  });

  it('renders inputs for subcategory, usageEnvironment, observableColor, observableMaterial, source, observation', () => {
    for (const field of [
      'subcategory',
      'usageEnvironment',
      'observableColor',
      'observableMaterial',
      'source',
      'observation',
    ]) {
      expect(source).toContain(`update('${field}'`);
    }
  });

  it('renders the catalogPage number input', () => {
    expect(source).toMatch(/type="number"[\s\S]*catalogPage/);
  });

  it('NEVER ships importSource or importBatch in the submit body', () => {
    // The buildProductSubmitPayload helper already guarantees this; this
    // assertion duplicates the check at the form-call-site for defense in
    // depth. The helper import is the only place these names should appear.
    expect(source).not.toMatch(/payload\.importSource\s*=/);
    expect(source).not.toMatch(/payload\.importBatch\s*=/);
  });
});

describe('ProductForm — read-only import badge', () => {
  const source = readFileSync(formPath, 'utf8');

  it('renders an "Importado desde Excel" badge with the batch file name and date', () => {
    expect(source).toContain('Importado desde Excel');
    expect(source).toContain('form.importBatchFileName');
    expect(source).toContain('form.importBatchUploadedAt');
  });

  it('only renders the badge when importSource === "imported" AND a batch field is present', () => {
    // The condition guards against manual products showing the badge.
    expect(source).toMatch(/importSource\s*===\s*['"]imported['"]/);
    expect(source).toMatch(/importBatchFileName/);
    expect(source).toMatch(/importBatchUploadedAt/);
  });

  it('marks the badge with data-testid="import-badge" for the matching test', () => {
    expect(source).toContain('data-testid="import-badge"');
  });
});
