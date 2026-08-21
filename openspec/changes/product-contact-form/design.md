# Design: Product-Aware Contact Form

## Technical Approach

Replace the product-detail `mailto:` CTA with `/contacto?product=<encoded-slug>`. The server-rendered contact page resolves that slug against active, published Strapi products, loads a complete lightweight selector, and passes normalized options plus the initial selection to the existing client `ContactForm`. The form preserves its current uncontrolled submission lifecycle and posts to `/api/leads`; the route verifies the transient slug again and persists only the existing nullable, human-readable `product` snapshot. General inquiries and invalid context persist `null`.

## Architecture Decisions

| Decision | Alternatives / tradeoff | Choice and rationale |
|---|---|---|
| Product identity | Add slug/document relation; requires schema migration and historical deletion policy | Reuse `Lead.product` as a readable snapshot. Existing admin views already render it and renamed/deleted products do not break historical readability. |
| Query trust boundary | Trust URL/client label; resolve only in browser | Resolve on the server against active, published products, then verify at submission. A client can select an option for UX, but cannot forge attribution. |
| Selector loading | Existing page-sized `getProducts`; remote search | Add a purpose-specific helper with explicit fields and page-based pagination until `meta.pagination.total`. This follows the repository's `getAllProducts` loop and Strapi REST v5 contract without media payloads. Native selection remains bounded enough for this slice; search is deferred. |
| Region ownership | Duplicate constants; CMS-managed setting | Create server-safe `lead-policy.ts` with the nine approved regions. The form consumes it for rendering, while `/api/leads` owns authoritative validation. This is business policy, not editorial content. |
| CMS customization | Strapi controller/service validation; Next.js proxy validation | Keep generated Strapi Lead CRUD and schema unchanged. The private Strapi endpoint is reached only through the Next.js server route with the existing admin token; the proxy remains the normalization, verification, and abuse-control boundary. |

## Data Flow

```text
ProductDetailPage --link--> /contacto?product=slug
                                  |
                         ContactoPage (RSC)
                           |             |
                 product options      initial slug/name
                           \             /
                         ContactForm (client)
                                  |
                       POST /api/leads (JSON)
                                  |
       limits -> honeypot -> Zod -> region/product verification
                                  |
                    Strapi POST /api/leads (admin token)
                                  |
                     private Lead/admin inbox
```

`ContactoPage` accepts Next.js App Router `searchParams: Promise<...>`, treats missing or malformed values as general inquiry, and renders `Pregunta general` first with an enabled empty value. The selector's submitted name is never authoritative; the route accepts a transient `productSlug`, resolves it with active/published filters, and maps stale, inactive, unpublished, deleted, or tampered references to `product: null` rather than rejecting an otherwise valid lead. Existing WhatsApp behavior is unchanged.

Strapi requests use REST v5 flat responses, `status=published` (or the published default), explicit `fields` for `name`/`slug`, deterministic `sort`, and `pagination[page]`/`pagination[pageSize]`; page traversal stops on an empty batch or when the accumulated count reaches `meta.pagination.total`. Cached catalog reads use the existing `catalog` tag and 60-second revalidation. Lead reads, idempotency checks, and writes remain `cache: no-store`. The existing internal Strapi URL, bearer token, and private Lead permissions remain unchanged; no browser-to-CMS CORS exposure is introduced.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/app/(marketing)/producto/[slug]/page.tsx` | Modify | Route email CTA to encoded contact query; retain product-aware WhatsApp. |
| `apps/web/src/app/(marketing)/contacto/page.tsx` | Modify | Resolve query and load complete options server-side; pass form props. |
| `apps/web/src/components/ContactForm.tsx` | Modify | Accept options/initial value, render product selector and approved regions, submit transient slug. |
| `apps/web/src/lib/strapi.ts` | Modify | Add typed lightweight option/slug helpers with bounded fields and pagination. |
| `apps/web/src/lib/lead-policy.ts` | Create | Own `SUPPORTED_REGIONS` and related types. |
| `apps/web/src/app/api/leads/route.ts` | Modify | Validate allowlist, verify slug, normalize general selection, preserve existing controls and payload. |
| Focused `*.test.ts(x)` files for page, form, Strapi helper, and route | Modify | Cover flow, pagination, payload, security, and compatibility. |
| `apps/cms/src/api/lead/content-types/lead/schema.json`, generated CRUD, admin lead files | Verify only | No contract or UI migration; nullable product remains readable as before. |

## Interfaces / Contracts

```ts
export const SUPPORTED_REGIONS = [
  "Valparaíso", "Metropolitana", "O'Higgins", "Maule", "Ñuble",
  "Biobío", "La Araucanía", "Los Ríos", "Los Lagos",
] as const;

type ContactProductOption = { slug: string; name: string };
type LeadRequest = ExistingLeadFields & { productSlug?: string | null };
// Strapi receives ExistingLeadFields with product: verifiedName | null.
// productSlug is transient and is never persisted.
```

Historical Leads, including legacy out-of-area records and nullable/empty products, remain readable because no schema, relation, backfill, or admin rendering contract changes. “Pregunta general” is represented by `null`, while a verified product stores its current name snapshot.

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Unit/helper | Allowlist membership, option normalization, URL encoding, pagination termination | Vitest pure tests and mocked Strapi envelopes. |
| Route integration | Valid/invalid regions; verified, general, stale, and tampered products; exact Strapi payload; body limits, honeypot, rate limit, idempotency regression | Extend `route.test.ts` with fetch mocks; assert no persistence on invalid input. |
| Page/component | CTA target and no `mailto:`, query initialization/fallback, general-first selector, nine regions, transient slug wiring | Existing Node Vitest static-render and source-level patterns; no jsdom assumption. |
| Compatibility/E2E | Existing admin product snapshot display; product CTA → preselected form → successful lead | Focused admin render test plus optional Playwright staging smoke test without production data. |

## Migration / Rollout

No migration required. Deploy the Next.js changes together and verify staging with a published product, general inquiry, stale query, tampered slug, each allowlisted boundary, and an unsupported region. Keep Strapi unchanged and independently rollbackable. Rollback restores the `mailto:` CTA and removes selector/query/API policy behavior; existing Leads remain intact. Monitor route 400/429/503 rates and CMS catalog fetch failures after release.

## Open Questions

- [ ] Confirm whether catalog size later requires a searchable/remote selector; pagination is the approved interim boundary.
- [ ] Durable product analytics (`productSlug` or relation) remains a future change, not part of this rollout.
