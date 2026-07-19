# Design: landing-page-initial

## Technical Approach

pnpm-workspace monorepo: `apps/web` (Next.js 16), `apps/cms` (Strapi v5), `packages/ui-tokens`. Web fetches CMS over internal Docker network via Strapi REST v5 with explicit `populate`/`fields`. Hybrid SSG/ISR + authenticated on-demand webhook. JSON-LD server-rendered, gated by verified-data builders. Coolify Compose exposes only `web`; `cms` and `db` internal.

## Architecture Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Stack + RSC | pnpm workspace; Next 16.2.9, Strapi 5.2.2, Tailwind 4.1, Node 20 LTS, MySQL 8, pnpm 9; lockfile + engines pinned; all RSC; only `<FloatingWhatsapp>` + `<LeadForm>` shell `'use client'` | Avoids Next 15 fetch drift |
| Cache + Strapi | `revalidate`: catalog 300, FAQ/Settings 3600, hero 86400; `revalidateTag` via webhook. REST v5; explicit `populate[image][populate]=formats`; read-only bearer `STRAPI_API_TOKEN`; `zod` server-side | Tunable; one consumer |
| Tailwind + brand | `@theme` in `globals.css`; ink `#2C2C2C`, taupe `#A69076`, cream `#EBE2D9`, paper `#F9F8F6`, Source Serif 4 / Hanken Grotesk; taupe ≤10% | v4-native; brief-locked |
| Fonts + budgets | `next/font/google` swap+preload+subset latin; `next/image` dims / fill+sizes, AVIF/WebP, blur, 150 KB ceiling; LCP ≤ 2.5 s, CLS ≤ 0.1, hero priority | LHCI gate |
| WhatsApp + lead | Server-built `wa.me/<E164>?text=<urlencoded>` from `SiteSettings.whatsappNumber`; `mailto:` fallback when unset. `<form action={serverAction}>` → zod → POST Strapi `/api/leads` → best-effort WhatsApp mirror `AbortSignal.timeout(3000)`; mirror failure does not block success page | Server-only handling |
| Ops + privacy | Token-bucket `Map<ip,bucket>` 5/min/IP + 50/day/IP in-memory v1; Coolify env: `STRAPI_API_TOKEN`, `REVALIDATE_SECRET`, `LEAD_WHATSAPP_TOKEN` opt, `CMS_INTERNAL_URL`, `DATABASE_URL`; JSON stdout both; `/api/health` returns build SHA + Strapi probe; Sentry opt; no client analytics v1; `Testimonial`/`RealHome` gated by `consentOnFile`; no server cookies; CSP blocks third-party; mirror POST redacts `message` | Coolify runtime |
| JSON-LD gate + set | Builders throw on missing required verified field; sections render no JSON-LD when fields absent. `WebSite` always; `LocalBusiness` only with `whatsappNumber` AND complete address; `FAQPage` only with ≥1 published FAQ; `Product` without `aggregateRating`/`review`; `Organization` optional | No fabricated `aggregateRating`/`Review`/`openingHours` |
| SEO + sitemap | `robots.ts` allows `/`, disallows `/api/`; `sitemap.ts` one entry; `opengraph-image.tsx`; locale `es-CL`, no `hreflang`; `llms.txt` deferred | One-route landing |
| A11y + testing | One `<h1>` (hero), `<h2>` per section; FAQ `<details>`/`<summary>` w/ `motion-reduce:`; floating `aria-label`; body ≥ 4.5:1. Vitest unit/component; Playwright E2E 390×844 + 1440×900; `msw`; `@axe-core/playwright`; LHCI; `schema-org-validator` | WCAG 2.1 AA |
| Deploy + rollback + migration | Coolify Compose: `web` (public :3000, Traefik) / `cms` (internal) / `db` (MySQL 8, internal); volumes `cms_uploads`, `cms_config`, `db_data`. Per-surface image SHA; web/cms rollback independent; db snapshot before migration; migrations NEVER on same change as app deploys; `bootstrap()` runs idempotent D&P + permission seeding; schema via `strapi generate` + `ts:generate-types` | Internal-only Strapi |
| Failure modes | Strapi down → each section renders static fallback from `packages/ui-tokens/src/copy/fallbacks.ts`; family-story file-backed; lead persistence independent of mirror; `SiteSettings` empty → `mailto:` | Honest degraded page |
| Rejected | GraphQL plugin; `@strapi/client`; Cloudflare edge; edge ISR; legacy `tailwind.config.ts`; `no-store` everywhere; hand-drawn SVG | Recorded |

## Data Flow

```
Visitor → Traefik (TLS) → web:3000 (RSC) → fetch (next:{revalidate,tags})
                                              → cms:1337 (REST v5, bearer)
                                                 → db:3306 (MySQL 8)

Strapi webhook → /api/revalidate → revalidateTag('catalog'|'settings'|'faq')

Lead form → server action (zod, rate limit)
            ├→ POST /api/leads (must succeed)
            └→ POST wa-cloud (3s abort, may fail) → success page anyway
```

## File Changes

| Path | Action | Description |
| --- | --- | --- |
| Root: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.npmrc`, `.nvmrc`, `.gitignore`, `.prettierrc`, `.eslintrc.cjs` | Create | `engines.node=20`, `packageManager=pnpm@9` |
| `apps/web/{package.json,tsconfig.json,next.config.ts}` + `src/styles/globals.css` | Create | Next 16 + `@theme` |
| `apps/web/src/app/(marketing)/{page,layout,opengraph-image}.tsx` + `sitemap.ts` + `robots.ts` + `api/{health,revalidate}/route.ts` | Create | Landing + SEO + ops |
| `apps/web/src/components/{atoms,molecules,organisms}/` | Create | `<Hero/>`, `<CategoryGrid/>`, `<FeaturedCatalog/>`, `<FamilyStory/>`, `<ExpertAdvicePreview/>`, `<TestimonialsRealHomes/>`, `<FAQ/>`, `<Footer/>`, `<FloatingWhatsapp/>` |
| `apps/web/src/lib/{strapi,seo,whatsapp,validators,env}.ts` + `tests/{unit,e2e}/` + runner configs | Create | Libs + specs |
| `apps/cms/{package.json,tsconfig.json}` + `config/{database,server,middlewares,plugins,api,admin}.ts` | Create | Strapi 5 + MySQL; CORS |
| `apps/cms/src/api/{product,category,faq,testimonial,article,real-home,site-setting,lead}/{content-types,controllers,routes,services}/` | Create | 8 types w/ D&P |
| `apps/cms/src/index.ts` + `.env.example` | Create | Idempotent bootstrap |
| `packages/ui-tokens/{package.json,src/tokens.css,src/copy/es-CL.ts,src/copy/fallbacks.ts,src/jsonld/*,src/index.ts}` | Create | Token + copy + JSON-LD |
| `infrastructure/docker-compose.yml` + `coolify.env.example` | Create | Compose + Traefik (web only) |
| `.github/workflows/{ci,lighthouse,preview}.yml` | Create | CI + LHCI + preview |
| `README.md` + `OPERATOR_RUNBOOK.md` + `openspec/changes/landing-page-initial/design.md` | Create | Runbook + this artifact |

## Interfaces / Contracts

```ts
// apps/web/src/lib/strapi.ts
export interface StrapiList<T> { data: T[]; meta: { pagination: { page:number;pageSize:number;pageCount:number;total:number } } }
export interface StrapiOne<T>  { data: T | null }
export type Result<T,E> = { ok: true; value: T } | { ok: false; error: E };
export const getFeaturedProducts: () => Promise<Result<Product[], StrapiError>>;
export const getFAQEntries:        () => Promise<Result<FAQ[], StrapiError>>;
export const getSiteSettings:      () => Promise<Result<SiteSettings, StrapiError>>;
export const getCategories:        () => Promise<Result<Category[], StrapiError>>;
export const getTestimonials:      () => Promise<Result<Testimonial[], StrapiError>>;
export const getRealHomes:         () => Promise<Result<RealHome[], StrapiError>>;
export const getArticlesPreview:   () => Promise<Result<Article[], StrapiError>>;
```

```yaml
# apps/cms/src/api/product/content-types/product/schema.json (shape)
name, slug (uid from title), shortDescription (text≤160), description (richtext),
price (decimal nullable), currency (enum CLP default),
image (media single required), category (relation manyToOne → api::category.category),
featured (bool default false), order (integer), draftAndPublish: true
```

Non-obvious contract: `buildLocalBusinessLD(s)` returns `null` (not partial) when any required verified field is missing; `buildWhatsappHref(n, t)` returns `null` when `n` unset → caller renders `mailto:`.

## Testing Strategy

| Layer | What | Approach |
| --- | --- | --- |
| Type + Lint | Both surfaces | `tsc --noEmit`; `strapi ts:generate-types`; `eslint` (`next/core-web-vitals`) |
| Unit + Component | `lib/strapi.ts`, JSON-LD builders, `lib/whatsapp.ts`, `lib/validators.ts`; `<FloatingWhatsapp/>`, `<FAQ/>`, `<ProductCard/>`, `<LeadForm/>` | Vitest + `msw` + `@testing-library/react` |
| E2E + A11y | Hero→catalog→WhatsApp deep-link; FAQ expand; form submit; mobile+desktop; WCAG 2.1 AA at 390×844 + 1440×900 | Playwright + `@axe-core/playwright` |
| Perf + Schema | LHCI ≥ 95/95/95; LCP ≤ 2.5 s; CLS ≤ 0.1; `WebSite`/`LocalBusiness`/`FAQPage`/`Product` | `treosh/lighthouse-ci-action`; `schema-org-validator` |
| Smoke | `cms.landing.ene-muebles.cl` 404s public; `/api/health` 200 with Strapi probe | `curl` in CI |

## Migration / Rollout

No data migration in v1. Operator fills `SiteSetting` via Strapi admin (tunnel-only) before flipping `NEXT_PUBLIC_FEATURE_LEAD_FORM=on`. Web/CMS deploy independently via Coolify as immutable image tags. Schema migrations on a separate change with pre-migration MySQL snapshot. **PR chain deferred to `sdd-tasks`** per `chained_pr_strategy=ask-always`; design records dependency direction, file boundaries, and rollback units so `sdd-tasks` can slice without further architecture work.

## Open Questions

- (DG-2) Operator Strapi admin path (SSH tunnel / WireGuard / Cloudflare Tunnel) — design supports any.
- (DG-3) WhatsApp Cloud API creds — best-effort 3 s mirror; absence leaves form as source of truth.
- (DG-6) `SiteSettings.address` completeness for `LocalBusiness.address` — design omits rather than partial-emits.
- `[ ]` `featured=true` cap (9); MySQL 8 vs MariaDB 10.11; Tailwind v4 plugin matrix — verify in `sdd-verify`.
