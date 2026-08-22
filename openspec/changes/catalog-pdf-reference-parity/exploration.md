## Exploration: catalog-pdf-reference-parity

### Current State

`/catalogo/imprimir` remains a request-time Server Component backed by one bounded, published/active `getCatalogSnapshot()` result. Its data flow is correct for dynamic CMS content: products are sorted by `order` then name, media URLs are normalized, data is cache-tagged for 60 seconds, and product changes can invalidate the `catalog` tag.

The document composition does not match the supplied reference. It is a single padded page flow with a text-only cover, one two-column category index, alphabetically grouped category sections, and a two-column card grid. It has no split black/beige cover with three-panel mosaic or logo block, legal/contact strip, two-page four-column index with ochre page dots, black ruler, fixed product order, alternating reference page templates, or fixed 4x2/eight-product grid. CSS `@page` margins and the root container padding also prevent the full-bleed page compositions required by the reference.

The archived `catalog-pdf-export` change established browser-print HTML intentionally and verified source/test behavior, but its verification report explicitly recorded that the text wordmark replaced the planned logo asset and that no browser print preview was performed. The prior change is already archived at `openspec/changes/archive/2026-08-21-catalog-pdf-export/`; this correction must be a new change. No reference PDF or reference images are tracked or otherwise accessible in this workspace, so final pixel-level comparison cannot be completed until the supplied assets are available to the implementation/verification environment.

### Affected Areas
- `apps/web/src/app/(marketing)/catalogo/imprimir/page.tsx` — replace the generic category/card flow and print CSS with the reference’s explicit cover, index, alternating layouts, fixed product grid, order, and footer system.
- `apps/web/src/app/(marketing)/catalogo/imprimir/page.test.tsx` — replace generic cover/index/card assertions with template, order, density, and parity-structure coverage.
- `apps/web/src/lib/strapi.ts` — preserve the existing snapshot contract; expose/use deterministic reference ordering metadata only if `catalogPage`, `order`, category, and image fields prove sufficient.
- `apps/cms/src/api/product/content-types/product/schema.json` — contains current dynamic fields, including `order`, `catalogPage`, category, type, descriptions, and multiple images; any missing reference-layout control must be added deliberately rather than hardcoded.
- `packages/ui-tokens/src/{tokens.css,colors.ts,site.ts}` — existing ENE palette and typography are reusable, but the reference calls for exact composition rather than the incumbent generic token treatment.
- `openspec/specs/{catalog-print-document,catalog-data-snapshot}/spec.md` — baseline requirements need a delta that makes reference parity, exact templates, product order, and print acceptance criteria normative.
- `openspec/changes/archive/2026-08-21-catalog-pdf-export/{design.md,verify-report.md}` — records the prior browser-print decision and unresolved logo/browser-validation warnings that the new change must close.

### Approaches
1. **Reference-template renderer backed by the existing snapshot** — build explicit print-page components for the split cover, legal strip, two index pages, alternating product-page families, and 4x2 grid; map dynamic snapshot products into those templates in a deterministic reference order.
   - Pros: directly implements the non-negotiable composition; preserves current browser-print, CMS, cache, and operational model; makes each page family testable.
   - Cons: requires a verified mapping from dynamic products to reference positions/templates and real reference assets for visual approval.
   - Effort: High.

2. **Generic responsive catalog refinement** — adjust the existing grouped cards, spacing, colors, and logo treatment without explicit page templates.
   - Pros: lower implementation cost and fewer data assumptions.
   - Cons: cannot satisfy the fixed alternating layouts, 4x2 density, index structure, or near-exact reference parity.
   - Effort: Medium.

### Recommendation

Use Approach 1. Keep browser print HTML and `getCatalogSnapshot()` unchanged as the data/runtime boundary, but model the reference as named, fixed print templates rather than a responsive category listing. Use CMS-backed products and images exclusively; use existing `order`/`catalogPage` only after validating their real values against the reference. If they cannot express the required sequence or page-template assignment, introduce explicit editorial metadata in a follow-up design/spec decision rather than deriving a fictional order. Require Chrome print-preview comparison against the actual reference before release.

### Risks
- The supplied reference PDF/images are not accessible in the repository, so exact visual measurement, logo selection, product mapping, and acceptance screenshots are presently blocked.
- Dynamic CMS data can conflict with a fixed reference layout: products may be missing images, exceed a page’s eight-item capacity, or lack reliable order/template metadata.
- Browser pagination can fragment intended fixed pages unless every reference page is an explicit A4 print unit with controlled dimensions and page breaks; source assertions alone cannot prove parity.
- The existing snapshot caps output at 200 products and four images per product; reference sequencing must remain within those documented bounds.

### Ready for Proposal

Yes, with one implementation gate: the proposal/design must record the supplied reference asset location or attach it to the change, define the CMS-to-reference ordering/template mapping, and require visual print verification. The orchestrator should tell the user that the current renderer is structurally generic, not a near-exact reference implementation, and that no replacement visual layout will be invented.
