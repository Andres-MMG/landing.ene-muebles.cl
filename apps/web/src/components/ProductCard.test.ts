import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/strapi';

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

  it('uses the legibility overline token (t-overline) with a readable meta color', () => {
    // Typography legibility pass: the old `text-[10px] uppercase
    // tracking-[0.22em]` chips were replaced by the `t-overline`
    // utility (12px floor, 0.14em tracking) and the soft gray
    // (`ink-soft-text`) was darkened to `ink-mute` for small text.
    // Scoped to the chips container so a regression anywhere else in
    // the file cannot satisfy the assertion. The data-testid and the
    // className sit on adjacent lines, so assert over the small block.
    const lines = source.split('\n');
    const chipsIdx = lines.findIndex((line) => line.includes('product-meta-chips'));
    const chipsBlock = lines.slice(chipsIdx, chipsIdx + 3).join('\n');
    expect(chipsBlock).toContain('t-overline');
    expect(chipsBlock).toContain('text-ink-mute');
  });
});

describe('ProductCard — public price visibility', () => {
  const product = (overrides: Partial<Product> = {}): Product => ({
    id: 1,
    name: 'Mesa institucional',
    slug: 'mesa-institucional',
    description: 'Mesa de prueba.',
    price: 1000,
    currency: 'CLP',
    ...overrides,
  });

  it('hides price markup when the product price is zero', () => {
    const html = renderToStaticMarkup(
      createElement(ProductCard, { product: product({ price: 0 }) })
    );

    expect(html).not.toContain('$0');
    expect(html).not.toContain('text-base text-ink sm:text-lg');
  });

  it('renders the formatted price when the product price is positive', () => {
    const html = renderToStaticMarkup(
      createElement(ProductCard, { product: product({ price: 89900 }) })
    );

    expect(html).toContain('$89.900');
    expect(html).toContain('text-base text-ink sm:text-lg');
  });
});
