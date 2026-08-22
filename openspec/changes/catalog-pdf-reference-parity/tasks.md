# Tasks: Catalog PDF Reference Parity

## Review Workload Forecast

| Field                   | Value                                |
| ----------------------- | ------------------------------------ |
| Estimated changed lines | 760–980                              |
| 400-line budget risk    | High                                 |
| Chained PRs recommended | Yes                                  |
| Suggested split         | PR 1 → PR 2 → PR 3 (stacked to main) |
| Delivery strategy       | force-chained                        |
| Chain strategy          | stacked-to-main                      |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                         | Likely PR     | Notes                                                  |
| ---- | -------------------------------------------- | ------------- | ------------------------------------------------------ |
| 1    | Capture reference evidence and resolve slots | PR 1 → `main` | Reference contract plus unit tests; no page rewrite.   |
| 2    | Render fixed print document                  | PR 2 → `main` | Depends on PR 1; templates, CSS, component tests.      |
| 3    | Prove and tune visual parity                 | PR 3 → `main` | Depends on PR 2; Chromium evidence and isolated fixes. |

## Phase 1: Reference Foundation (PR 1)

- [x] 1.1 Record the supplied visual reference evidence, identify any approved served logo asset and exact measurements still required, and keep immutable asset paths/checksums pending until those files are supplied.
- [x] 1.2 Create `reference-manifest.ts` with versioned reference evidence and pure validation/resolution helpers that reject missing, duplicate, stale, or out-of-range mappings without inventing content, cap pages at eight products, and allow a non-empty partial final page.
- [x] 1.3 Add `reference-manifest.test.ts` fixtures for deterministic order, image indexes, partial final pages, invalid coverage, and bounded/truncated snapshots.
- [x] 1.4 Confirm `apps/web/src/lib/strapi.ts` and `strapi.test.ts` need no change: the existing bounded tagged 60-second snapshot already exposes current categories, deterministic order, and normalized media.

## Phase 2: Deterministic Print Templates (PR 2)

- [x] 2.1 Replace generic category grouping in `page.tsx` with named cover, index, category-page, and product-slot components driven by one snapshot and fixed four-by-two maximum pages.
- [x] 2.2 Implement the ~56/44 cover, typographic ENE marks, two-column index, alternating ochre/green bullets, charcoal contact card, category headers, factual product fields, and page-local ruler/footer hooks in `page.tsx`.
- [x] 2.3 Add print-scoped A4-landscape full-bleed CSS (`@page`, fixed mm dimensions, unsplittable `.print-page`, color preservation, hidden tooling) and screen-only scaling without responsive print geometry.
- [x] 2.4 Render slot-selected `large` media with original fallback; expose accessible image, missing-media, mapping-error, empty, and truncated states in `page.tsx`.
- [x] 2.5 Rewrite `page.test.tsx` to assert page sequence, one index page, four-by-two maximum grids with partial-page blanks, current CMS facts, fallbacks, semantic links, and print hooks.

## Review Blocker Remediation (PR 2 follow-up)

- [x] 2.6 Keep the bounded-snapshot truncation notice inside the first defined index print unit so it cannot create an orphan print page, expand beyond its print unit, or overlap the index contact panel; add focused truncated-catalog regressions.
- [x] 2.7 Paginate category index entries at a deterministic per-page capacity so every current CMS category remains visible; add an over-capacity index regression test.
- [x] 2.8 Preserve the marketing layout's single main landmark and assign each paginated index page a unique heading ID with a matching `aria-labelledby` reference; add focused semantic regressions.

## Phase 3: Rendered PDF Parity (PR 3)

- [x] 3.0 Apply the user-supplied deployed-output refinement: group current CMS products by category then optional `subcategory`, use the full ENE MUEBLES header wordmark, and enforce compact card text budgets with focused regressions. This is source-level evidence only; production visual validation remains pending.
- [ ] 3.1 Add `apps/web/e2e/catalog-print-reference.spec.ts` to print representative mapped data in Chromium and assert A4 page boundaries, page-family count, required assets, and no split pages.
- [ ] 3.2 Compare Chromium PDFs/screenshots against the supplied visual evidence at documented tolerance; save reviewed evidence under `apps/web/test-results/catalog-print-reference/` without committing generated output unless project policy requires it.
- [ ] 3.3 Apply only comparison-confirmed adjustments to `page.tsx`, `reference-manifest.ts`, and their tests; rerun the visual comparison after each fix.
- [ ] 3.4 Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter web build`, and manual Chrome preview sign-off; block replacement of the typographic ENE mark if an approved served logo asset remains unavailable.

### PR 3 Validation Status (2026-08-21)

- Blocked before visual comparison: `docker compose -f infrastructure/docker-compose.local.yml up -d --build --force-recreate` cannot start because `infrastructure/.env.local` is absent.
- The already-running stale web container returns `404` for `http://localhost:4780/catalogo/imprimir`; Playwright evidence is recorded under `apps/web/test-results/catalog-print-reference/`.
- The supplied reference PDF/images and an approved served ENE logo remain unavailable in the workspace. Tasks 3.1–3.4 remain unchecked until a rebuilt runtime and reference material are available.
