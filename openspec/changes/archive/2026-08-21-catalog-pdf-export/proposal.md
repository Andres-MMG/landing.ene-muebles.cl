# Proposal: Catalog PDF Export

## Intent

Replace the catalog's ambiguous export experience with one branded, print-ready catalog flow. “PDF” means request-time print HTML saved through the visitor's browser, not a server-generated binary PDF. The result must remain editable, CMS-backed, and safe for the site's modest traffic.

## Scope

### In Scope
- Keep `/catalogo/imprimir` request-time and render a branded cover, index, ordered category sections, image-backed product cards, descriptions, corporate identity, and print page-number hooks.
- Use one bounded active/published catalog snapshot, normalized public media URLs, existing `catalog` tags, and the current 60-second cache/invalidation strategy.
- Replace the public export area with only `Imprimir PDF`; audit the JSON route before implementation and retain it unlinked only when a verified non-UI consumer exists. Repository references currently show no such consumer, so removal is the default.
- Define graceful empty/error/image-missing states and browser-print limitations.

### Out of Scope
- Any PDF renderer, headless browser, binary PDF endpoint, background job, stored artifact, or new production dependency.
- New CMS fields, product editing workflows, redesign of the regular catalog page, or invented product claims/prices.
- Guaranteed identical pagination across Chrome, Firefox, and Safari.

## Capabilities

### New Capabilities
- `catalog-print-document`: Branded browser-print catalog with cover, index, categories, images, metadata, identity, page-break hooks, and documented print limitations.
- `catalog-data-snapshot`: Coherent bounded active/published catalog snapshot with normalized media, tagged caching, and freshness behavior.

### Modified Capabilities
- None; no existing catalog capability spec defines these requirements.

## Approach

Refactor the shared Strapi helper into a catalog snapshot seam rather than adding a second uncached fetch. Render semantic print sections with stable CSS break/counter hooks, bounded descriptions and media, existing tokens/fonts/logo assets, and explicit “current as of request/cache” behavior. Admin `catalog` tag invalidation remains the fast freshness path; direct CMS edits may remain stale for up to 60 seconds. Before deleting `/api/catalog/export`, verify deployment/integration inventory; preserve and test it only if an external consumer is confirmed.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/.../catalogo` | Modified | Single print CTA and branded print document |
| `apps/web/src/lib/strapi.ts` | Modified | Shared bounded snapshot, publication/media semantics |
| `apps/web/src/app/api/catalog/export` | Removed/retained | Conditional technical compatibility route |
| `packages/ui-tokens`, public assets, tests | Modified | Identity, regression, print coverage |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Browser pagination differs | High | A4 print CSS, semantic breaks, representative browser verification |
| Large catalog/media payload | Med | Bounded fields, pagination, selected image formats, cache tags |
| Stale direct CMS edits | Med | Document 60-second bound and preserve mutation invalidation |

## Rollback Plan

Revert the print template/helper/UI commit independently; restore the prior CTA and JSON route if a verified consumer is discovered. No schema, stored artifact, or deployment dependency changes are required.

## Dependencies

- Existing Strapi product/category publication state, `catalog` tag invalidation, public media origin, brand tokens, and browser print support.

## Success Criteria

- [ ] Catalog exposes only `Imprimir PDF` and produces a branded cover, index, categories, images, metadata, and page-number hooks.
- [ ] Output uses one bounded cached/tagged current snapshot and never introduces a server PDF engine.
- [ ] JSON route is removed only when no non-UI consumer is verified; otherwise it remains unlinked and tested.
- [ ] Missing data/images and browser-print limitations are handled without invented content.
