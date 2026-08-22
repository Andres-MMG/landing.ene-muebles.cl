# Proposal: Catalog PDF Reference Parity

## Intent

Replace the generic printable catalog flow with deterministic, reference-faithful print templates while retaining current, bounded CMS snapshot data. The existing card/category document cannot meet the supplied catalog’s fixed editorial composition.

## Scope

### In Scope

- Build an A4-landscape cover with a ~56% charcoal / ~44% warm-taupe split, editorial wordmark, Spanish brand statement, and contact block.
- Build one landscape category index with two columns, alternating ochre/green count bullets, a lower charcoal contact card, and a hairline footer.
- Render fixed landscape category pages in deterministic CMS-backed order, with exactly four cards per row and at most two rows. Partial pages keep remaining positions blank rather than inventing products.
- Apply the reference charcoal/ochre/green/warm-paper palette, headings, footer/rulers, A4 landscape sizing, and controlled print pagination.
- Preserve `getCatalogSnapshot()` publication, cache, bounds, normalized-media, empty, and error behavior; validate the CMS order/template mapping against the reference assets.

### Out of Scope

- Server-side PDF generation, a binary endpoint, or a new rendering dependency.
- Redesigning the public catalog, changing CMS product content, or inventing product data/order where editorial metadata is absent.
- Unrelated JSON export compatibility changes or cross-browser pixel-parity guarantees.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `catalog-print-document`: Replace generic category/card print composition with normative reference templates, density, order, and visual acceptance criteria.
- `catalog-data-snapshot`: Preserve the snapshot contract while defining deterministic reference placement metadata validation.

## Approach

Use explicit A4-landscape page components for the cover, index, and category product pages. Populate them only from one existing CMS snapshot; retain its deterministic order and do not manufacture product facts or assets. Make each page an unsplittable print unit with explicit breaks and testable template hooks.

## Affected Areas

| Area                                                                    | Impact             | Description                                                                |
| ----------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------- |
| `apps/web/src/app/(marketing)/catalogo/imprimir/page.tsx`               | Modified           | Replace generic flow with reference templates and print rules.             |
| `apps/web/src/app/(marketing)/catalogo/imprimir/page.test.tsx`          | Modified           | Verify templates, order, density, and print hooks.                         |
| `apps/web/src/lib/strapi.ts`                                            | Modified if needed | Validate reference ordering metadata without changing snapshot guarantees. |
| `openspec/specs/{catalog-print-document,catalog-data-snapshot}/spec.md` | Modified           | Define delta requirements.                                                 |

## Risks

| Risk                                 | Likelihood | Mitigation                                                                   |
| ------------------------------------ | ---------- | ---------------------------------------------------------------------------- |
| Reference assets/mapping unavailable | High       | Gate release on attached source and Chrome print comparison.                 |
| CMS data cannot fill fixed templates | Medium     | Validate metadata; specify editorial fields rather than fabricate placement. |
| Browser page fragmentation           | Medium     | Use fixed A4 units and preview representative multi-page output.             |

## Rollback Plan

Deploy and revert the Next.js print-template change independently; retain the existing CMS schema/snapshot contract unless separately migrated. Restore the prior generic renderer if validation fails.

## Dependencies

- Accessible source reference PDF/images, approved logo asset, and CMS-to-reference product/template mapping.

## Success Criteria

- [ ] Chrome print preview matches the supplied visible evidence: ~56/44 cover, one index, category pages with an exact 4×2 maximum grid, blank partial-page positions, palette, headings, footer/rulers, and pagination.
- [ ] Automated tests prove deterministic CMS-backed placement, no invented data, accessible fallbacks, and stable snapshot/cache behavior.
