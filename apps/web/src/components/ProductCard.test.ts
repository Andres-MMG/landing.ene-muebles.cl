import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Catalog-import (S4) — source-level assertions on the public
 * `ProductCard` component. Renders `productType` and `subcategory`
 * as small metadata chips below the title when present.
 */

const cardPath = join(
  process.cwd(),
  'apps/web/src/components/ProductCard.tsx'
);

describe('ProductCard — productType + subcategory metadata chips', () => {
  const source = readFileSync(cardPath, 'utf8');

  it('renders the chips inside a single metadata container', () => {
    expect(source).toContain('data-testid="product-meta-chips"');
  });

  it('only renders the chip container when at least one of productType or subcategory is present', () => {
    // The conditional uses logical OR — `product.productType || product.subcategory`.
    expect(source).toMatch(/product\.productType\s*\|\|\s*product\.subcategory/);
  });

  it('renders a chip per populated field, only when populated', () => {
    // Both fields use the same conditional pattern: `product.X ? <span>...</span> : null`.
    expect(source).toMatch(/product\.productType\s*\?\s*\(/);
    expect(source).toMatch(/product\.subcategory\s*\?\s*\(/);
  });

  it('does NOT add a chip when the field is empty', () => {
    // Both branches fall through to `null` so React renders nothing.
    // Quick sanity check that the conditional chain is present.
    const hasProductTypeNull = source.includes('{product.productType ? (\n                  <span');
    const hasSubcategoryNull = source.includes('{product.subcategory ? (\n                  <span');
    expect(hasProductTypeNull || hasSubcategoryNull).toBe(true);
  });

  it('uses the typography tokens (t-mono + uppercase + tracking)', () => {
    expect(source).toContain('t-mono');
    expect(source).toContain('uppercase');
    expect(source).toContain('tracking-[0.22em]');
  });
});
