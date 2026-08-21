# Tasks: Catalog PDF Export

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650–800 total; each stacked PR ≤200–240 |
| Review budget | 800 changed lines (additions + deletions) |
| 400-line budget risk | High for one PR; controlled by four slices |
| Chained PRs recommended | Yes |
| Forecast mode | auto-forecast |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Bounded coherent snapshot and JSON policy | PR 1 | Base: main; rollback helper/policy only |
| 2 | Branded print document | PR 2 | Base: main after PR 1; depends on snapshot |
| 3 | Print CSS, accessibility, CTA cleanup | PR 3 | Base: main after PR 2; UI-only rollback |
| 4 | Focused tests and operational verification | PR 4 | Base: main after PR 3; verification-only rollback |

## Phase 1: Snapshot Foundation and Compatibility Policy (PR 1)

- [x] 1.1 In `apps/web/src/lib/strapi.ts`, add typed `CatalogSnapshot`, bounded page/media constants, `getCatalogSnapshot()`, published/active filters, deterministic ordering, selected fields, normalized public media, `truncated`, and `fetchedAt`; retain `revalidate: 60` and `catalog` tag.
- [x] 1.2 In `apps/web/src/app/api/catalog/export/route.ts`, keep the unlinked JSON contract on the snapshot-compatible helper; record the deployment/integration audit result and do not delete the route without verified owner approval.
- [x] 1.3 Acceptance: one request supplies all print data, bounds are explicit, drafts/inactive records are excluded, cache invalidation remains effective, and no PDF engine, binary artifact, uncached fetch, schema, or dependency is added. Rollback: revert `strapi.ts` and route changes.

## Phase 2: Branded Print Document (PR 2)

- [x] 2.1 In `apps/web/src/app/(marketing)/catalogo/imprimir/page.tsx`, consume one snapshot and render semantic `.print-cover`, `.print-index`, `.print-category`, `.print-product`, `.print-page`, and `.page-number` hooks with verified logo/tokens, request/cache freshness, deterministic category index, product counts, descriptions, dimensions/materials, valid prices only, image formats, and “Sin imagen” fallback.
- [x] 2.2 Acceptance: complete, bounded, truncated, empty, CMS-error, and missing-image states remain truthful and readable; browser print/Save as PDF is the only generation path. Rollback: revert the print page while leaving snapshot helper intact.

## Phase 3: Print CSS, Accessibility, and UI Cleanup (PR 3)

- [x] 3.1 Update `PrintButton.tsx`, `catalogo/page.tsx`, and print styles in `imprimir/page.tsx` for exactly `Imprimir PDF`, no visible JSON action, A4 portrait, preserved colors, hidden marketing chrome, link-safe output, page counters/footer hooks, category/card break rules, meaningful headings/alt/status text, and documented cross-browser pagination limits.
- [x] 3.2 Acceptance: keyboard/screen-reader order and index anchors are meaningful; regular catalog behavior is unchanged. Rollback: revert these three UI/style files independently.

## Phase 4: Focused Tests and Verification (PR 4)

- [x] 4.1 Extend `apps/web/src/lib/strapi.test.ts`, `catalogo/imprimir/page.test.tsx`, `catalogo/page.test.tsx`, and `api/catalog/export/route.test.ts` for bounds, query filters, tags, URL/format fallback, grouping, truncation, states, CTA absence, print hooks, and JSON compatibility.
- [x] 4.2 Run focused Vitest, `tsc --noEmit`, production build, and a representative Playwright/Chrome print check; verify image reachability, A4/page breaks/counters, repeated-request cache reuse, `catalog` invalidation, load ceiling, and no regression in catalog navigation. Rollback: revert only the failing PR slice.
