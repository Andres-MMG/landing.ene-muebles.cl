# Tasks: Product-Aware Contact Form

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 600–750 (application, tests, staging notes) |
| 400-line budget risk | High |
| Review budget | 800 lines |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Domain policy and product lookup foundation | PR 1 | Direct to `main`; independently revertible helpers |
| 2 | Product CTA and shared selector UX | PR 2 | Direct to `main`; depends on PR 1 |
| 3 | Authoritative lead validation/attribution | PR 3 | Direct to `main`; depends on PRs 1–2 |
| 4 | Focused regression tests and staging proof | PR 4 | Direct to `main`; validates the integrated behavior |

## Phase 1: Backend/Domain Foundation (PR 1)

- [x] 1.1 Create `apps/web/src/lib/lead-policy.ts` with typed `SUPPORTED_REGIONS`, membership validation, and product-context normalization contracts; do not change CMS schema.
- [x] 1.2 Extend `apps/web/src/lib/strapi.ts` with typed lightweight product options and slug resolution using published/active filters, `fields=name,slug`, deterministic sort, page/pageSize traversal, `catalog` caching, and safe empty/error behavior.
- [x] 1.3 Acceptance: helpers return only `{ slug, name }`, stop at empty/total pagination, and map missing/stale context to `null`; rollback is limited to the new helper/policy changes.

## Phase 2: Frontend CTA and Form (PR 2)

- [x] 2.1 Modify `apps/web/src/app/(marketing)/producto/[slug]/page.tsx` so “Enviar correo” links to `/contacto?product=<encoded slug>` while WhatsApp remains unchanged.
- [x] 2.2 Modify `apps/web/src/app/(marketing)/contacto/page.tsx` to accept `searchParams`, resolve the slug server-side, load complete options, and pass general-first options plus normalized initial selection to `ContactForm`.
- [x] 2.3 Modify `apps/web/src/components/ContactForm.tsx` to accept typed options/initial value, render nine supported regions and enabled “Pregunta general”, preserve errors/state, and submit transient `productSlug`; rollback restores the prior CTA and form props.
- [x] 2.4 Acceptance: valid products preselect, malformed/stale URLs select general, general submits empty context, and no browser-to-Strapi request is introduced.

## Phase 3: API Validation and Attribution (PR 3)

- [x] 3.1 Modify `apps/web/src/app/api/leads/route.ts` to validate the region allowlist before persistence, accept transient `productSlug`, re-resolve it server-side, ignore client labels, and persist verified name or `product: null` without changing limits, honeypot, idempotency, or error shape.
- [x] 3.2 Verify only `apps/cms/src/api/lead/content-types/lead/schema.json`, `controllers/lead.ts`, `routes/lead.ts`, and `services/lead.ts`: nullable readable `product` and historical records remain unchanged; no CMS migration or route change.
- [x] 3.3 Acceptance: all nine regions can create leads; unsupported/malformed regions return field-level 400 with no Strapi create; tampered/stale products persist null; rollback reverts only route validation/attribution.

## Phase 4: Tests and Staging Verification (PR 4)

- [x] 4.1 Update `apps/web/src/lib/strapi.test.ts`, `apps/web/src/app/(marketing)/producto/[slug]/page.test.tsx`, and `apps/web/src/components/ContactForm.test.tsx` for pagination, URL encoding, WhatsApp preservation, general-first options, nine regions, fallback, and transient slug wiring.
- [x] 4.2 Extend `apps/web/src/app/api/leads/route.test.ts` for every allowlist boundary, unsupported region/no persistence, verified/general/stale/tampered attribution, exact payload, and regression controls.
- [x] 4.3 Run `pnpm test`, `pnpm typecheck`, `pnpm lint`; smoke-test staging product → preselected form → 201 lead, general inquiry, stale/tampered slug, all nine regions, unsupported region, and WhatsApp. Roll back PRs independently; Leads require no data rollback.
