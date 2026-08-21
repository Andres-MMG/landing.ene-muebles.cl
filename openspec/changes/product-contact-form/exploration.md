# Exploration: Product-aware contact form

> SDD exploration artifact for `product-contact-form`. OpenSpec is the authoritative filesystem store; the Engram proposal mirror is maintained with `artifact_store.mode=both`. Technical artifact language: English.

## Current State

The product detail route at `apps/web/src/app/(marketing)/producto/[slug]/page.tsx` has a WhatsApp CTA and an `Enviar correo` `mailto:` CTA. The shared form is rendered by `apps/web/src/app/(marketing)/contacto/page.tsx` and submits through `POST /api/leads`.

`apps/web/src/components/ContactForm.tsx` already captures identity, contact, region, message, consent, honeypot, and idempotency data. It does not render a product selector, although the API and Strapi Lead schema already support an optional `product` string. The form currently exposes all 16 Chilean regions; the approved service area is the contiguous nine-region set from Valparaíso through Los Lagos:

- Valparaíso
- Metropolitana
- O’Higgins
- Maule
- Ñuble
- Biobío
- La Araucanía
- Los Ríos
- Los Lagos

`apps/web/src/app/api/leads/route.ts` already rate-limits, validates with Zod, handles the honeypot, deduplicates idempotency keys, and forwards to Strapi. Its `region` validation is too permissive for the approved business rule. The Strapi Lead schema at `apps/cms/src/api/lead/content-types/lead/schema.json` already contains nullable `product` and `region` strings. Existing admin lead views already expose `product`; no CMS schema migration is required for the approved slice.

Product data is available through `getProducts` in `apps/web/src/lib/strapi.ts`, but the helper is paginated. A contact selector must not silently stop at the first page.

## Options Considered

1. **Query-driven form reuse with the existing Lead snapshot (recommended).** Product pages navigate to `/contacto?product=<slug>`. The contact page resolves the slug against active, published products, supplies the complete selector, and preselects the product. The form submits the selected product name as the existing `product` snapshot; `Pregunta general` submits `null`.
2. **Add durable product identity.** Submit and persist `productSlug` or `productDocumentId` alongside the snapshot. This improves attribution but adds a schema/data contract migration and deletion policy.
3. **Create a Lead-to-Product relation.** This adds CMS coupling, privileged relation handling, migration, and historical ambiguity when products change.

The approved scope selects option 1. Durable identity and relations remain deferred.

## Recommended Direction

Replace only the email CTA handoff, not the WhatsApp flow. Use the product slug only as navigation context; resolve it server-side against active, published catalog entries. Missing, invalid, inactive, unpublished, or deleted references fall back to the first enabled `Pregunta general` option. Persist only the human-readable selected product name for compatibility, and normalize empty/general selection to `null`.

Enforce the nine-region allowlist in the public API as well as the UI. This applies only to new submissions; historical leads remain readable even if they contain an out-of-area value.

## Affected Areas

- Next.js product page, contact page, reusable form, Strapi client, lead route, and their focused tests.
- Existing admin lead display: verification only; no expected contract change.
- Strapi Lead model/controllers/services/routes: unchanged for the minimal path.

## Risks and Decision Boundaries

- A native selector may become unwieldy as the catalog grows; pagination and bounded fields are required, with searchable UI deferred.
- Client-side product options are not trusted; server-side resolution must prevent arbitrary labels from becoming confirmed attribution.
- Changing `mailto:` behavior affects browser navigation and refresh/back flows; query parsing must remain safe and SSR-compatible.
- No production credentials, live CMS data, or live submissions are used for verification.

## Ready for Proposal

Yes. The product snapshot, general inquiry fallback, nine-region policy, server-side validation, and no-migration boundary are approved and sufficiently defined for proposal/spec work.
