# Tasks: landing-page-initial

> Greenfield monorepo. Operator business facts (whatsappNumber, address, founder, consent evidence, testimonials, real-home photos, social profiles, pricing policy, warranty text, delivery coverage) remain `TBD` and MUST never be fabricated in code or tests.

## Review Workload Forecast

| Slice | Estimated Δ lines | Surface | 800-line budget |
| --- | --- | --- | --- |
| A — Workspace + tokens + CI scaffold | 700–900 | repo root + `packages/ui-tokens` + `.github` | Exceeds |
| B — Coolify Compose + env contract | 80–120 | `infrastructure/` | OK |
| C — Strapi schemas + bootstrap + seed | 900–1200 | `apps/cms/` | Exceeds |
| D — Web libs (strapi, jsonld, whatsapp, validators, env) | 400–500 | `apps/web/src/lib` | OK |
| E — Sections + components + page composition | 900–1200 | `apps/web/src/components`, `app/(marketing)` | Exceeds |
| F — Lead capture + form + WhatsApp mirror | 250–350 | `apps/web/src/app/api/leads`, `<LeadForm>` | OK |
| G — SEO/GEO/AEO surface | 200–300 | sitemap, robots, OG, metadata, JSON-LD | OK |
| H — A11y, perf, LHCI, E2E, docs, runbook, verify | 700–900 | tests, README, OPERATOR_RUNBOOK, lighthouserc | Exceeds |
| **Total estimated Δ** | **~4 200–6 300** | repo-wide | **High** |

Forecast guards (plain-text, downstream-matched):

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
800-line budget risk: High

### Recommended autonomous slices (NOT formalized as PRs)

Order matches dependency direction recorded in `design.md`. Strictly serial: A → B → C → D → E → F → G → H. A+B may merge under `size:exception`; otherwise each becomes its own chain node. C is internal-only (CMS); D, E, F, G, H are public-web.

The orchestrator MUST stop after this phase. The chained-PR topology is **deliberately left pending**. The project registry skill `gentle-ai-chained-pr` / `chained-pr` could not be resolved from `.atl/skill-registry.md` (none present). That registry skill MUST be installed and the user MUST pick a chain strategy (`stacked-to-main`, `feature-branch-chain`, or `size:exception`) before `sdd-apply` revises tasks into formal PR nodes.

### Rollback boundaries per slice

- A: revert repo root + tokens + CI; no runtime impact.
- B: revert Compose file; prior stack still serves if image unchanged.
- C: revert `cms` image tag in Coolify; volumes untouched; `db` snapshot retained.
- D, E, G: revert `web` image tag; CMS and DB untouched.
- F: toggle `NEXT_PUBLIC_FEATURE_LEAD_FORM=off`; web stays up.
- H: revert docs and tests only; no runtime impact.

### Acceptance evidence + commands per slice

- A: `pnpm install`, `pnpm -r typecheck`, `pnpm lint` exit 0; tokens render in a dev preview page.
- B: `docker compose config` exits 0; internal-network labels validated.
- C: `pnpm --filter cms strapi build`, `pnpm --filter cms strapi ts:generate-types`, `pnpm --filter cms test` exit 0.
- D: `pnpm --filter web typecheck`, `pnpm --filter web test` exit 0; builders throw on missing verified fields.
- E: `pnpm --filter web build` exits 0; route renders 8 sections in DOM order with one `<h1>`.
- F: Vitest + Playwright submit/persist/success; mirror disabled → success page still returned.
- G: Rich Results Test passes for emitted blocks; `robots.txt`/`sitemap.xml` return 200; canonical URL present.
- H: LHCI ≥ 95/95/95; `axe-core` clean at 390×844 + 1440×900; public CMS 404.

## Phase 1 — Slice A: Workspace + tokens + CI scaffold

- [ ] 1.1 Create root files: `package.json` (workspace + scripts), `pnpm-workspace.yaml`, `tsconfig.base.json`, `.npmrc`, `.nvmrc` (Node 20 LTS), `.gitignore`, `.prettierrc`, `.eslintrc.cjs`; pin `engines.node=20`, `packageManager=pnpm@9`.
- [ ] 1.2 Create `packages/ui-tokens/package.json`, `tsconfig.json`, `src/tokens.css` with Tailwind v4 `@theme` (ink `#2C2C2C`, taupe `#A69076` ≤10 %, cream `#EBE2D9`, paper `#F9F8F6`).
- [ ] 1.3 Create `packages/ui-tokens/src/copy/es-CL.ts` (professional Chilean Spanish constants) and `src/copy/fallbacks.ts` (file-backed family story + per-section degraded states).
- [ ] 1.4 Create `packages/ui-tokens/src/jsonld/{website,localBusiness,faqPage,product,organization}.ts` builders; each throws on missing verified required field and returns `null` on incomplete entities.
- [ ] 1.5 Create `packages/ui-tokens/src/index.ts` re-exporting tokens + copy + builders.
- [ ] 1.6 Add `.github/workflows/{ci,lighthouse,preview}.yml`: ci runs lint/typecheck/test; lighthouse runs LHCI gate ≥ 95/95/95; preview triggers Coolify webhook.
- [ ] 1.7 Re-run `sdd-init`; flip `openspec/config.yaml` `testing.strict_tdd=true` and update `runner`/`linter`/`type_checker` once Vitest + Playwright + ESLint are present.

## Phase 2 — Slice B: Coolify Compose skeleton

- [ ] 2.1 Create `infrastructure/docker-compose.yml`: `web` (Traefik labels, `:3000`), `cms` (internal), `db` (`mysql:8`, internal); volumes `cms_uploads`, `cms_config`, `db_data`.
- [ ] 2.2 Create `infrastructure/coolify.env.example` with `STRAPI_API_TOKEN`, `REVALIDATE_SECRET`, `CMS_INTERNAL_URL`, `DATABASE_URL`, `LEAD_WHATSAPP_TOKEN` (opt), `NEXT_PUBLIC_SITE_URL`; `.env` never committed.
- [ ] 2.3 Run `docker compose config`; assert no public Traefik router for `cms`/`db`; assert internal-only networking.

## Phase 3 — Slice C: Strapi schemas + bootstrap + seed

- [ ] 3.1 Create `apps/cms/{package.json,tsconfig.json,config/{database,server,middlewares,plugins,api,admin}.ts}` (MySQL; CORS allowlist `https://landing.ene-muebles.cl` + `http://localhost:3000`).
- [ ] 3.2 Create `apps/cms/src/api/{product,category,faq,article}/{content-types,controllers,routes,services}/` with D&P enabled; Product fields per `design.md` schema shape.
- [ ] 3.3 Create `apps/cms/src/api/{testimonial,real-home,site-setting,lead}/{content-types,controllers,routes,services}/`; gate social proof by `consentOnFile`; singleton `site-setting`; restrict `lead` from public API.
- [ ] 3.4 Create `apps/cms/src/index.ts` with idempotent `bootstrap()`: seed default public-role `lead.find/findOne` denial; cap `featured=true` ≤ 9; ensure D&P on every scoped type.
- [ ] 3.5 Create `apps/cms/.env.example`; configure Vitest + Supertest harness covering read-token + Lead deny + consent gate.
- [ ] 3.6 Run `pnpm --filter cms strapi ts:generate-types`; commit `apps/cms/types/generated.d.ts` (update on schema changes only).

## Phase 4 — Slice D: Web libs + JSON-LD + validators

- [ ] 4.1 Create `apps/web/{package.json,tsconfig.json,next.config.ts}` (Next 16 App Router; `images.remotePatterns` allowlist Strapi host).
- [ ] 4.2 Create `apps/web/src/lib/env.ts` (zod-validated server + client env; fails fast on missing keys).
- [ ] 4.3 Create `apps/web/src/lib/strapi.ts`: `Result<T,E>`, `StrapiList<T>`, `StrapiOne<T>`, `getFeaturedProducts`, `getFAQEntries`, `getSiteSettings`, `getCategories`, `getTestimonials`, `getRealHomes`, `getArticlesPreview`; explicit `populate[image][populate]=formats`; tags per spec.
- [ ] 4.4 Create `apps/web/src/lib/whatsapp.ts` (`buildWhatsappHref` returns `null` on invalid E.164); `apps/web/src/lib/validators.ts` (zod lead schema, CSP-safe URL parser, JSON-LD escape helper).
- [ ] 4.5 Create `apps/web/src/lib/seo.ts` (metadata helpers, OG/Twitter builders, JSON-LD composition gated on verified fields).
- [ ] 4.6 Configure Vitest + `msw` + `@testing-library/react`; cover builders, whatsapp helper, validators, strapi error normalization (covers `specs/catalog-rendering`, `whatsapp-handoff`, `seo-geo-aeo`, `security-and-exposure`).

## Phase 5 — Slice E: Sections + components + page composition

- [ ] 5.1 Create `apps/web/src/styles/globals.css` importing tokens; register `next/font/google` Source Serif 4 + Hanken Grotesk with `display: 'swap'`, `preload: true`, latin subset.
- [ ] 5.2 Create `apps/web/src/app/(marketing)/layout.tsx` with skip-link, sticky `<Nav>`, `<Footer>`, server-injected `<WebSite>` JSON-LD.
- [ ] 5.3 Create `apps/web/src/app/(marketing)/page.tsx` composing nav, hero, category grid, featured catalog, family story, expert advice preview, testimonials + real homes, FAQ, footer in required DOM order; per-section `next: { revalidate, tags }`.
- [ ] 5.4 Create atomic components: `<Hero/>`, `<CategoryGrid/>`, `<FeaturedCatalog/>`, `<FamilyStory/>` (file-backed), `<ExpertAdvicePreview/>`, `<TestimonialsRealHomes/>`, `<FAQ/>` (`<details>`/`<summary>`), `<Footer/>`; mirror organic family-story into UI tokens.
- [ ] 5.5 Create `<FloatingWhatsapp/>` (`'use client'`) with Chilean Spanish `aria-label`; placement safe at 390×844 (does not cover focused content).
- [ ] 5.6 Wire ISR: catalog 300, FAQ/Settings 3600, hero 86400; `revalidateTag('catalog' | 'settings' | 'faq')` via webhook route.

## Phase 6 — Slice F: Lead capture + form + mirror

- [ ] 6.1 Create `<LeadForm/>` (`'use client'` shell) with required-field + `aria-describedby` error semantics in Chilean Spanish.
- [ ] 6.2 Create `apps/web/src/app/api/leads/route.ts`: zod parse → in-memory token-bucket `Map<ip,bucket>` (5/min/IP, 50/day/IP) → POST Strapi `/api/leads` (must succeed) → best-effort WhatsApp Cloud POST with `AbortSignal.timeout(3000)`; mirror failure does not block success.
- [ ] 6.3 Create `apps/web/src/app/api/revalidate/route.ts` validating `REVALIDATE_SECRET` and calling `revalidateTag` per payload.
- [ ] 6.4 Create `apps/web/src/app/api/health/route.ts` returning `{ status, buildSha, cmsProbe }`.
- [ ] 6.5 Vitest: rate-limit, zod rejection, mirror failure tolerance, privacy-safe error messages; Playwright: submit → success page with mirror disabled (covers `specs/lead-capture`, `security-and-exposure`).

## Phase 7 — Slice G: SEO/GEO/AEO surface

- [ ] 7.1 Create `apps/web/src/app/(marketing)/sitemap.ts` (one canonical URL only) and `robots.ts` (allow `/`, disallow `/api/`, reference sitemap).
- [ ] 7.2 Create `apps/web/src/app/(marketing)/opengraph-image.tsx`; `generateMetadata` from `SiteSetting` with omission semantics for missing verified fields.
- [ ] 7.3 Server-render `WebSite` always; gate `LocalBusiness` on `whatsappNumber` + complete address; gate `FAQPage` on ≥ 1 published FAQ; emit `Product` only when `Offer` is verified, never with `aggregateRating`/`Review`; `Organization` optional.
- [ ] 7.4 Validate emitted JSON-LD in CI with `schema-org-validator`; assert no fabricated `aggregateRating`, `Review`, `openingHours`, or partial `address` (covers `specs/seo-geo-aeo`).

## Phase 8 — Slice H: A11y, perf, hardening, docs, E2E, verify

- [ ] 8.1 Configure Playwright at 390×844 + 1440×900 with `@axe-core/playwright`; gate on zero WCAG 2.1 AA violations.
- [ ] 8.2 Configure LHCI (`@lhci/cli`) budgets: LCP ≤ 2.5 s, CLS ≤ 0.1; require hero `priority` + `sizes`; enforce 150 KB per-image ceiling.
- [ ] 8.3 Add CSP headers in `next.config.ts`; verify CORS already locked in CMS slice; assert no third-party scripts in `pnpm --filter web build` output.
- [ ] 8.4 Author `README.md` (architecture, env, local dev, deploy) and `OPERATOR_RUNBOOK.md` (publish flow, fallback toggles, rollback, smoke checks, secret rotation).
- [ ] 8.5 Run `sdd-verify` against acceptance outline in `proposal.md`; gate archive on Rich Results pass + axe-clean + LHCI gate + public-CMS 404 + Lead persistence with mirror disabled.

## Spec ↔ phase mapping

- `landing-page-composition` → E.5.2, E.5.3, E.5.4, H.4
- `strapi-content-model` → C.3.2, C.3.3, C.3.4
- `catalog-rendering` → D.4.3, D.4.6, E.5.3, E.5.6
- `lead-capture` → F.6.1, F.6.2, F.6.5
- `whatsapp-handoff` → D.4.4, D.4.6, E.5.4, E.5.5
- `seo-geo-aeo` → G.7.1, G.7.2, G.7.3, G.7.4
- `accessibility` → E.5.4, F.6.1, H.8.1
- `performance-budget` → E.5.1, E.5.3, E.5.6, H.8.2, H.8.3
- `security-and-exposure` → B.2.1, C.3.1, C.3.4, D.4.2, F.6.2, F.6.5, H.8.3
- `coolify-compose-deployment` → B.2.1, B.2.2, B.2.3, F.6.4
