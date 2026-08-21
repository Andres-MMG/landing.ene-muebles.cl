# Proposal: Product-Aware Contact Form

## Intent

Replace the product-detail `mailto:` handoff with the shared contact form so visitors can submit qualified inquiries with product context. Preserve general inquiries, reject unsupported regions server-side, handle stale references, and retain the Lead contract.

## Scope

### In Scope
- Make product-detail “Enviar correo” open `/contacto` with a product slug.
- Resolve active, published products server-side and provide a complete selector with “Pregunta general” first.
- Reuse the nullable Lead `product` string as a readable snapshot; general selection persists as `null`.
- Restrict new submissions to Valparaíso, Metropolitana, O’Higgins, Maule, Ñuble, Biobío, La Araucanía, Los Ríos, and Los Lagos.
- Add tests for routing, fallback, payloads, and region validation.

### Out of Scope
- Lead-to-Product relations, durable product identity, migrations, backfills, or analytics.
- CMS-managed region policy or form-copy editorial controls.
- Changes to WhatsApp, consent, rate limiting, authentication, delivery, or historical leads.

## Capabilities

### New Capabilities
- `product-contact-form`: product-context routing, selection, general inquiry, and safe attribution fallback.

### Modified Capabilities
- `lead-capture`: enforce the supported-region allowlist while preserving the nullable product snapshot.

## Approach

Extend the product page, contact page, reusable form, Strapi helper, and `/api/leads` route. Fetch published products with explicit pagination and bounded fields. Use the slug to resolve context; persist the selected published name for readability. Normalize `Pregunta general` and invalid context to `null`. Keep Strapi schemas, CRUD, admin views, and credentials unchanged.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/src/app/(marketing)/producto/[slug]/` | Modified | CTA routes to form. |
| Contact page and `ContactForm.tsx` | Modified | Product options and selection. |
| `strapi.ts` and `/api/leads/` | Modified | Pagination and validation. |
| Focused frontend/API tests | Modified | Acceptance coverage. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Large catalog makes selector unwieldy | Medium | Paginate explicitly; defer searchable control. |
| Client submits arbitrary product or region values | High | Resolve product context and allowlist regions server-side. |
| CTA change disrupts navigation | Medium | Cover query parsing and fallback. |

## Rollback Plan

Revert the Next.js CTA, selector, query handling, and API validation changes. No Strapi migration or data rollback is required; existing Lead records remain readable.

## Dependencies

- Active published Product entries and the existing server-side Strapi access path.

## Success Criteria

- [ ] Valid product CTA opens the form with that product selected; invalid context becomes “Pregunta general”.
- [ ] “Pregunta general” is first and enabled, and only the nine approved regions can create new leads.
- [ ] Existing Lead/admin and WhatsApp behavior remain compatible.
- [ ] Tests cover the stated acceptance boundaries without production data.
