# Design: Catalog PDF Export

## Technical Approach

Keep `/catalogo/imprimir` as a request-time Server Component that returns semantic HTML. The browser remains responsible for Print/Save as PDF; no PDF engine, binary endpoint, stored artifact, or new dependency is introduced. Refactor `getAllProducts()` into a named catalog snapshot seam that returns one coherent active/published dataset with normalized public media, bounded pagination, and the existing `catalog` cache tag. The public catalog exposes only `Imprimir PDF`; retain `/api/catalog/export` unlinked and tested during this change for compatibility, with removal requiring a separately verified consumer audit.

## Architecture Decisions

| Decision | Choice | Alternatives / rationale |
|---|---|---|
| PDF generation | Browser print HTML | Reject server PDF/headless Chromium: no existing runtime, higher CPU/memory and deployment risk, and no need for binary bytes. |
| Snapshot boundary | One `getCatalogSnapshot()` call; derive category groups and index from that result | Reject separate category/product requests: they can disagree and duplicate CMS load. |
| Freshness | `force-dynamic` page plus Strapi `revalidate: 60`, tag `catalog`, and existing admin invalidation | Reject `no-store` CMS reads: it would defeat the established modest-traffic cache. Direct CMS edits may remain stale for 60 seconds. |
| JSON compatibility | Remove the visible link; keep the route unlinked and preserve its contract for now | Route deletion is a breaking API decision even when repository references are absent. |

## Data Flow

```text
Browser → /catalogo/imprimir → getCatalogSnapshot()
                              → Next data cache (60s, catalog tag)
                              → Strapi published + active pages
                              → normalize media URLs / bounded fields
                              → cover + index + grouped product HTML
Browser loads absolute image URLs → Print dialog → Save as PDF
```

The snapshot query MUST use `status=published`, `filters[active][$eq]=true`, stable `order` sorting, explicit page size (100), and a hard maximum product count. Request only fields/relations needed by the print document, including category and selected image formats; do not use a second uncached `populate=*` export path. A ceiling (implemented as a named constant) prevents an unexpectedly large catalog from creating an unbounded response; the page shows a non-claiming completeness notice if the ceiling is reached.

## Document Composition and Print CSS

`imprimir/page.tsx` renders a print root with a no-print toolbar, then:

1. **Cover**: verified horizontal Ene Muebles logo asset, `site` brand/year tokens, short catalog label, print date, and restrained cream/ink/taupe identity treatment.
2. **Index**: ordered categories with product counts and anchor links. Category order is deterministic; uncategorized products appear as “Catálogo general”.
3. **Category sections**: one heading/description block followed by product cards in a two-column A4 portrait grid.
4. **Product cards**: direct `<img>` using the normalized absolute URL and `pickMediaFormat(..., "medium")` where available, alt fallback to product name, bounded description, category/type, dimensions, materials, observable attributes, and price only when valid CMS data exists. Missing images render an intentional “Sin imagen” placeholder.

Use existing `tokens.css` palette and typography (`ink`, `paper`, `cream`, `taupe`, Hanken Grotesk, Source Serif 4); select and dimension-check the tracked logo during implementation rather than inventing a variant. Use semantic classes/data hooks: `.print-cover`, `.print-index`, `.print-category`, `.print-product`, `.print-page`, and `.page-number`.

Print rules set A4 portrait margins, hide marketing chrome/toolbar, preserve colors, remove link decoration, use `break-before: page` for cover/index/categories, `break-inside: avoid` for cards, and avoid splitting headings from the first card. Page numbers use a CSS page counter in a print footer hook (`counter(page)`), with an explicit `data-page-number`/footer structure for browser verification; identical pagination across engines is not promised. Screen HTML remains readable when printing is unavailable.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/app/(marketing)/catalogo/imprimir/page.tsx` | Modify | Branded cover/index/category/card document, graceful states, semantic print hooks and CSS. |
| `apps/web/src/app/(marketing)/catalogo/page.tsx` | Modify | Expose only `Imprimir PDF`. |
| `apps/web/src/app/(marketing)/catalogo/imprimir/PrintButton.tsx` | Modify | Exact toolbar label and browser-print affordance. |
| `apps/web/src/lib/strapi.ts` | Modify | Named bounded snapshot, published filter, field/media normalization; preserve cache/tag boundary. |
| `apps/web/src/app/api/catalog/export/route.ts` | Modify | Keep unlinked JSON compatibility and update helper documentation, unless audit authorizes removal. |
| `apps/web/src/app/(marketing)/catalogo/*.test.tsx`, `apps/web/src/lib/strapi.test.ts`, `apps/web/src/app/api/catalog/export/route.test.ts` | Modify | Regression and contract coverage. |

## Interfaces / Contracts

```ts
type CatalogSnapshot = {
  products: Product[];
  truncated: boolean;
  fetchedAt: string;
};
export async function getCatalogSnapshot(): Promise<CatalogSnapshot>;
```

The JSON route may continue returning its existing `Product[]` attachment shape. The print page consumes only `CatalogSnapshot`; no client-side CMS token or internal Strapi hostname is exposed.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Pagination ceiling, published/active query, cache tags, URL normalization, format fallback, grouping and truncation | Extend `strapi.test.ts`; mock `fetch` and assert query/options. |
| Component/server | Cover, index counts/order, cards/images/alt fallbacks, descriptions, no-products, CMS failure, toolbar label, print hooks/CSS, JSON link absence | Extend existing Vitest render tests; retain JSON route tests if route remains. |
| Browser verification | A4 print preview, image reachability, page breaks, counter visibility, Chrome representative catalog | Use existing Playwright dependency as a focused manual/one-shot check; do not add a PDF engine. |

## Migration / Rollout

No CMS migration or new dependency. Deploy the Next.js changes independently; existing `catalog` tag invalidation remains the freshness path. Roll back the print/UI/helper commit independently. Keep JSON compatibility until an owner-approved consumer audit authorizes removal.

## Open Questions

- [ ] Confirm the final tracked logo file and whether institutional print catalogs should display prices.
- [ ] Confirm the hard maximum product count after observing the real catalog size.
- [ ] Confirm whether the owner later wants actual binary PDF delivery; that would require a separate load-tested design.
