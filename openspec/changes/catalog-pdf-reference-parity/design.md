# Design: Catalog PDF Reference Parity

## Technical Approach

Keep `/catalogo/imprimir` as a request-time Server Component and render browser-print HTML from exactly one `getCatalogSnapshot()` result. Replace the generic category-driven flow with explicit A4-landscape page components: cover, index, and category product pages. The resolver preserves dynamic CMS product facts and deterministic order; it never creates products, copy, images, prices, or ordering.

## Architecture Decisions

| Decision            | Options / trade-off                                                                          | Decision and rationale                                                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page model          | Responsive category/card grid adapts but reflows; fixed A4 templates require explicit layout | Use fixed landscape page components. Print pages always contain four equal card columns and no more than two rows; partial pages retain blank body space instead of changing density.                                                          |
| Placement authority | Infer from categories/names; CMS `order`/`catalogPage`; static product mapping               | Preserve the bounded snapshot's deterministic `order` then name sequence, grouped by current CMS category. `catalogPage` may be displayed only when present; the renderer must not require, invent, or override a static slug-to-slot mapping. |
| Runtime/data        | New export fetch or PDF service; existing snapshot                                           | Preserve the single bounded, normalized, tagged 60-second snapshot. It remains `force-dynamic`; no server PDF runtime, client token, or second uncached fetch.                                                                                 |
| Images              | Generic first image; slot-aware reference selection                                          | Use the current product image selected by the existing renderer with `pickMediaFormat(image, "large")`, then the original normalized URL. Missing/unusable selected media renders an accessible placeholder.                                   |

## Data Flow

```text
Strapi published/active products
  -> getCatalogSnapshot() [order,name; 60s catalog tag; bounded]
  -> group current CMS categories and chunk products by eight
  -> Cover / Index / CategoryProductPage pages
  -> Chrome print preview / Save as PDF
```

`catalogPage`, `order`, category, product fields, and normalized media are read only from the snapshot. Visible reference evidence constrains the page grammar, not a static product mapping: current CMS names, descriptions, categories, and images are rendered as-is. A truncated snapshot receives its existing truthful notice and cannot claim complete reference parity.

## Page Boundaries and Layout

- `PrintCatalogDocument`: page sequence and no-print toolbar.
- `PrintCoverPage`: ~56% charcoal / ~44% warm-taupe split, `CATÁLOGO 2026`, editorial wordmark, Spanish brand statement, contact block, and large ENE mark low/right. No mosaic is rendered.
- `PrintIndexPage`: one white/off-white landscape index with two category columns, alternating ochre/green count bullets, a lower charcoal contact card, and a hairline footer.
- `PrintCategoryPage`: black header with an ochre left accent, category title, centered white ENE wordmark/subtitle, current page/category count, and a fixed four-column by two-row maximum grid.
- `PrintProductSlot`: owns image, title, current CMS category label, description, and fallback. A final page with fewer than eight products leaves its unused grid positions blank.

Use print-scoped CSS constants: `--a4-width: 297mm`, `--a4-height: 210mm`, `--page-bleed: 0mm`, and named millimetre constants derived from the visible reference evidence. Use charcoal near `#292929`, warm taupe near `#B49D7C`, warm off-white near `#F5F1E8`, ochre, muted green, and the existing Hanken Grotesk tokens. The ENE mark remains typographic until an approved served logo asset is available.

`@page` is A4 landscape with zero margin. Each `.print-page` is `297mm × 210mm`, `break-after: page`, `break-inside: avoid`, and overflow-managed; the final page suppresses its trailing break. Print CSS hides site chrome/tooling, preserves color, uses a page-local footer/ruler, and avoids CSS running-header/counter behavior that Chrome does not reliably repeat. Screen preview may scale pages, but print geometry must not use responsive breakpoints.

## File Changes

| File                                                                        | Action                             | Description                                                                                                                           |
| --------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/(marketing)/catalogo/imprimir/page.tsx`                   | Modify                             | Compose named fixed landscape pages and print CSS; remove generic grouping/grid flow.                                                 |
| `apps/web/src/app/(marketing)/catalogo/imprimir/reference-manifest.ts`      | Create                             | Reference-evidence metadata plus pure validation helpers that cap a page at eight products and permit a non-empty partial final page. |
| `apps/web/src/app/(marketing)/catalogo/imprimir/page.test.tsx`              | Modify                             | Assert page sequence, four-by-two maximum density, factual fallbacks, and print hooks.                                                |
| `apps/web/src/app/(marketing)/catalogo/imprimir/reference-manifest.test.ts` | Create                             | Assert duplicate/missing/stale mapping rejection and partial-page support.                                                            |
| `apps/web/src/lib/strapi.ts`                                                | Modify only if required            | Retain snapshot guarantees; expose no new data unless an already-supported field is needed.                                           |
| `apps/web/src/lib/strapi.test.ts`                                           | Modify only if `strapi.ts` changes | Lock preserved query, cache, bounds, and normalized-media behavior.                                                                   |

## Interfaces / Contracts

```ts
type ReferenceSlot = {
  slug: string;
  sourcePage: number;
  slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  imageIndex: number;
};
type ResolvedPrintPage = {
  sourcePage: number;
  products: Array<ReferenceSlot & { product: Product }>;
};
```

The resolver MUST cap each product page at eight slots. A non-empty final page MAY contain fewer than eight products and MUST preserve blank positions; it MUST NOT reflow into a ninth card or invent a generic appendix.

## Testing Strategy

| Layer                     | What to test                                                                                                     | Approach                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Unit                      | Reference helper limits, sequence, slots, image-index fallback, and partial final page                           | Vitest pure-helper fixtures.                                                                                                |
| Server component          | Exact page components, four columns/two rows maximum, CMS facts, empty/error/truncated states, and print classes | `renderToStaticMarkup` with snapshot fixtures.                                                                              |
| Browser/render comparison | Landscape A4 dimensions, breaks, backgrounds, typographic mark/media, and visible parity                         | Playwright Chromium print-to-PDF and page screenshots compared to supplied visual evidence; manual Chrome preview sign-off. |

## Migration / Rollout

No CMS migration or dependency is required. Release only after Chrome comparison against the supplied visual evidence; otherwise retain the current renderer. Roll back the Next.js template slice independently; the snapshot/cache contract remains unchanged.

## Open Questions

- [ ] Supply an approved served ENE logo asset and exact print measurements if the typographic mark or measured values need replacement.
- [ ] Confirm the contact strings and exact category page-number convention to use when CMS category counts change.
