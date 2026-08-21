## Verification Report

**Change**: `product-contact-form`
**Mode**: Standard
**Artifact store**: OpenSpec authoritative; report mirrored to Engram

### Executive Summary

Implementation and regression evidence cover the core product-aware contact flow: encoded product CTA routing, active/published server-side product resolution, general inquiry normalization, the nine-region allowlist, tamper-resistant snapshots, preserved WhatsApp behavior, and existing lead controls. All 13 tasks are complete, and the full test suite, typecheck, lint, and diff checks pass.

The change is not archive-ready without qualification: no safe staging runtime was available for the requested end-to-end smoke path, and the repository-wide Prettier check remains red against a pre-existing baseline. A few server-rendered page and historical-lead scenarios have only partial/static coverage rather than a dedicated runtime acceptance test.

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 13 acceptance/implementation tasks (1.1–4.3) |
| Tasks complete | 13 |
| Tasks incomplete | 0 |
| Changed application lines | 384 additions/deletions in the implementation diff; within the 800-line review budget |
| Delivery strategy | stacked-to-main; Phase 4 / Work Unit 4 boundary |

### Build & Tests Execution

**Build/typecheck**: ✅ Passed

```text
pnpm typecheck
web: tsc --noEmit — passed
```

**Lint**: ✅ Passed

```text
pnpm lint
web: eslint . — passed
```

**Full tests**: ✅ 551 passed, 0 failed

```text
pnpm test
54 test files passed; 551 tests passed
```

**Focused change tests**: ✅ 119 passed, 0 failed

```text
pnpm exec vitest run \
  apps/web/src/lib/lead-policy.test.ts \
  apps/web/src/lib/strapi.test.ts \
  'apps/web/src/app/(marketing)/producto/[slug]/page.test.tsx' \
  apps/web/src/components/ContactForm.test.tsx \
  apps/web/src/app/api/leads/route.test.ts --reporter=basic
5 test files passed; 119 tests passed
```

**Diff hygiene**: ✅ Passed

```text
git diff --check — passed
```

**Formatting**: ⚠️ Repository baseline failure

```text
pnpm format:check
failed: 226 files reported, including pre-existing files and files outside this change
```

No broad formatting rewrite was made. The current Node runtime is `v22.18.0` while the repository requests Node `20.x`; all commands passed with the existing engine warning. Vitest also emits the existing Vite CJS API deprecation warning.

**Coverage**: ➖ Not available; no coverage threshold is configured for this change.

**Staging smoke**: ⚠️ Not executed. No safe staging URL/runtime was configured, and starting production services or writing real leads would violate the scope boundary.

### Spec Compliance Matrix

| Requirement | Scenario / boundary | Runtime evidence | Result |
|-------------|---------------------|------------------|--------|
| Product CTA opens shared form | Product email CTA uses `/contacto?product=<encoded slug>` and no product-page `mailto:` | `producto/[slug]/page.test.tsx` — CTA routing | ✅ COMPLIANT |
| Product CTA opens shared form | Slugs containing spaces, slash, and Unicode are URL encoded | `producto/[slug]/page.test.tsx` — encoded slug | ✅ COMPLIANT |
| WhatsApp remains available | Existing product WhatsApp CTA remains rendered and behavior is covered by existing WhatsApp tests | `producto/[slug]/page.test.tsx`; `whatsapp.test.ts` | ✅ COMPLIANT |
| Shared form choices | `Pregunta general` is first and enabled; active published product options follow | `ContactForm.test.tsx`; `strapi.test.ts` helper pagination | ✅ COMPLIANT |
| Shared form choices | Selected product is submitted as transient `productSlug` | `ContactForm.test.tsx` source wiring; route persistence test | ⚠️ PARTIAL — no browser interaction runtime test |
| General inquiry | General context and client label persist `product: null` | `route.test.ts` — exact general payload | ✅ COMPLIANT |
| Server product verification | Product lookup requires published + active filters and returns only `{slug,name}` | `strapi.test.ts` — request filters and lightweight shape | ✅ COMPLIANT |
| Server product verification | Verified current product name is persisted as snapshot | `route.test.ts` — verified snapshot and ignored label | ✅ COMPLIANT |
| Safe fallback | Malformed/general/tampered/stale context resolves to null | `lead-policy.test.ts`; `route.test.ts`; Strapi helper tests | ✅ COMPLIANT |
| Safe fallback | Server-rendered contact page normalizes query and preselects only verified product | Static inspection of `contacto/page.tsx` plus helper/form tests | ⚠️ PARTIAL — no dedicated ContactoPage runtime test |
| Recoverable validation | Invalid data returns field-addressable errors without persistence | `route.test.ts`; form ARIA/error source assertions | ✅ COMPLIANT |
| Unexpected failure behavior | 503 is recoverable and existing form preserves state/pending lifecycle | `route.test.ts`; `ContactForm.test.tsx` source assertions | ⚠️ PARTIAL — client failure path lacks DOM runtime coverage |
| Region allowlist | Exactly Valparaíso, Metropolitana, O’Higgins, Maule, Ñuble, Biobío, La Araucanía, Los Ríos, Los Lagos | `lead-policy.test.ts`; `ContactForm.test.tsx` | ✅ COMPLIANT |
| Region allowlist | All nine supported regions can create leads | `route.test.ts` parameterized nine-region acceptance | ✅ COMPLIANT |
| Region validation | Unsupported, malformed, empty, and case-variant values reject before Strapi persistence | `route.test.ts` — 400 and fetch not called | ✅ COMPLIANT |
| Tamper resistance | Arbitrary client label is ignored; stale/tampered slug persists null | `route.test.ts` — verified, general, stale/tampered cases | ✅ COMPLIANT |
| Historical compatibility | Existing nullable string snapshot remains readable; CMS schema/controller/routes/services unchanged | `leadsQuery.test.ts` maps legacy product/region values; diff inspection confirms no CMS changes | ⚠️ PARTIAL — no dedicated out-of-area historical display test |
| Historical compatibility | Product rename/unpublish/delete does not rewrite stored snapshot | Design/schema inspection only | ❌ UNTESTED — no runtime historical-record test |
| Existing controls | Consent, body limit, honeypot, rate limit, idempotency, delivery/error contract remain compatible | Existing and extended `route.test.ts` suite | ✅ COMPLIANT |
| Accessibility/UX | Field labels, consent link, live status, field errors, ARIA invalid/described-by, focus behavior | `ContactForm.test.tsx` source/static assertions | ⚠️ PARTIAL — no browser accessibility interaction test |

**Compliance summary**: 15/20 scenario/boundary rows fully compliant; 4 partial; 1 untested. Core security and persistence boundaries are fully covered. The partial/untested rows are test-evidence gaps, not observed implementation failures.

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Product-aware routing | ✅ Implemented | Product detail always links to encoded shared-form context; WhatsApp branch is untouched. |
| Product options | ✅ Implemented | Dedicated Strapi helper uses explicit fields, active/published filters, deterministic sorting, page traversal, and catalog caching. |
| Product attribution | ✅ Implemented | `/api/leads` ignores `product`, re-resolves `productSlug`, and persists only the verified current name or null. |
| General inquiry | ✅ Implemented | `Pregunta general` is represented by empty transient context and null persisted product. |
| Region policy | ✅ Implemented | Shared typed constant renders the nine options; Zod refinement is authoritative at the API boundary. |
| Historical Lead contract | ✅ Implemented | No CMS schema, CRUD, admin rendering, relation, migration, or backfill changes. |
| Existing abuse controls | ✅ Preserved | Rate limit, body size, honeypot, idempotency, token handling, and error responses remain in the route. |

### Design Coherence

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Reuse nullable readable `Lead.product` snapshot | ✅ Yes | No relation or migration was introduced. |
| Resolve product on server at page load and submission | ✅ Yes | Contact page and lead route both use active/published server-side lookup. |
| Explicit bounded Strapi REST query | ✅ Yes | `fields`, `sort`, `status`, active filter, and pagination are explicit; no media payload is requested. |
| Shared region policy with API ownership | ✅ Yes | `lead-policy.ts` is reused by form rendering and route validation. |
| Keep CMS unchanged | ✅ Yes | CMS lead files are unchanged in the implementation diff. |
| Preserve WhatsApp independently | ✅ Yes | Product WhatsApp handoff remains separate from contact-form state. |

### Issues Found

**CRITICAL**: None observed in implementation or executed tests.

**WARNING**:

1. Dedicated runtime coverage is missing for the server-rendered `ContactoPage` query/preselection/fallback path, browser submit interaction, client unexpected-failure state preservation, and historical product snapshot survival after rename/unpublish/delete. These should be covered before claiming complete acceptance evidence.
2. No staging smoke test was possible because no safe staging runtime was supplied. The requested product → form → lead flow was therefore not exercised against a running Next.js/Strapi pair.
3. `pnpm format:check` fails on 226 repository files, including unrelated/pre-existing files. This is a repository baseline issue, not a feature-specific lint failure.
4. Verification ran on Node 22.18.0 although `package.json` requests Node 20.x. Repeat on Node 20 in CI or staging for environment parity.

**SUGGESTION**:

1. Add a focused `ContactoPage` server-render test with valid, stale, malformed, and repeated query values.
2. Add a DOM/browser-level form test (or Playwright staging smoke) for pending duplicate prevention, field-error retention, retry-safe general errors, and successful reset.
3. Add an admin/history fixture test proving an out-of-area legacy lead and a stored product snapshot remain readable after product lifecycle changes.

### Verdict

**PASS WITH WARNINGS**

The implementation satisfies the tested product routing, server verification, region policy, tamper resistance, compatibility controls, typecheck, lint, and regression suite. Archive/release confidence remains conditional on closing the explicitly identified runtime evidence gaps and performing staging smoke verification.
