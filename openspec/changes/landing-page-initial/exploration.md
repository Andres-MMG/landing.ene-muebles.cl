# Exploration: landing-page-initial

> SDD exploration artifact for the **Ene Muebles** landing page. Scope: greenfield Next.js App Router + self-hosted Strapi v5 + MySQL, deployed via Coolify. This document captures the problem, options, recommended path, and assumptions. It is an architecture exploration, not a spec or a tasks list — those are produced by later phases.

- **Change folder**: `openspec/changes/landing-page-initial/`
- **Artifact store**: `openspec` (filesystem)
- **Execution mode**: `auto` — no user questions; assumptions and decision gaps are recorded explicitly below.
- **Chained PR strategy**: `ask-always` (orchestrator cache).
- **Review budget**: 800 lines (PR additions + deletions).
- **Skills loaded (paths-injected)**: impeccable, seo-aeo-best-practices, seo-geo-aeo, strapi-v5-expert, tailwind-css-patterns, coolify, coolify-deploy (+ `_shared` references for OpenSpec convention, phase-common, persistence-contract, status-contract).
- **Doc libraries already resolved by orchestrator**: Next.js `/vercel/next.js/v16.2.9`, Strapi `/strapi/documentation/v5_2_2`, Tailwind `/tailwindlabs/tailwindcss.com`. This exploration cites those resolved versions and does not re-derive them.

---

## 1. Current State

The repository is effectively empty (verified 2026-07-19):

| Present | Missing |
| --- | --- |
| `.agents/skills/` (7 project skills) | `package.json` (both surfaces) |
| `.claude/skills/` mirror | `apps/` source code |
| `.atl/skill-registry.md` and cache | `pnpm-workspace.yaml` |
| `openspec/config.yaml` | `infrastructure/` / `docker-compose` |
| `openspec/specs/context.md` | Test runner (Vitest / Playwright) |
| `openspec/changes/archive/` | CI workflow, Coolify project, env file |
| `skills-lock.json` (7/7 skills pinned) | `tsconfig.json` |

No code, no tests, no CI, no infrastructure. The only pre-existing artefacts are the seven project-level skills and the OpenSpec skeleton produced by `sdd-init`. Two deployable surfaces are declared in `openspec/config.yaml` (Next.js + Strapi v5) and a `<frontend>/<backend>` local URL contract is reserved (`localhost:3000` / `localhost:1337`).

The repository's existing `openspec/specs/context.md` already records a stronger assumption set than a fresh greenfield usually warrants — specifically, that lead capture is "form posts to Next.js route handler → forwards to Strapi → mirrors to WhatsApp webhook." This exploration adopts that contract but flags that the WhatsApp mirror path is currently a **single point of conversion instrumentation** with no fallback. See §13 (Risks).

## 2. Goals (Recast Without Invention)

The brief is a high-conversion landing page for a family-owned furniture store in Chile. The conversion goal is **qualified-lead generation via WhatsApp** (and a contact form as a secondary path), surfaced over a Strapi-managed catalog. The brief explicitly forbids manufactured data — no invented ratings, no fictitious reviews, no fake address. That constraint shapes the schema.org strategy in §7.

The eight conversion-bearing sections (sticky nav, hero, category grid, featured catalog, family story, expert advice preview, testimonials + real homes, FAQ, footer, floating WhatsApp) are listed in order in the brief and the architecture must preserve that ordering visually and in the DOM (heading hierarchy, JSON-LD order).

## 3. Recommended Direction (Headline)

A **pnpm workspace monorepo** with two apps (`apps/web` Next.js 16, `apps/cms` Strapi 5) and a shared `packages/ui-tokens` package, deployed as a **single Coolify Compose stack** (so `apps/web` reaches `apps/cms` over the internal Docker network and the Strapi admin never touches the public internet). Render strategy: **hybrid SSG/ISR** with per-section revalidation windows (catalog 5–15 min, FAQ/site-settings 1 hr, hero copy 24 hr). **REST** for the Strapi API (simpler than GraphQL for one consumer, fits Strapi 5 flat-response model, populates via `?populate=*`). TypeScript everywhere. **Strict TDD remains off** until a runner exists; the sdd-apply phase should flip it on after Vitest + Playwright are configured.

This is a baseline, not a final architecture. Variants and trade-offs are in §5.

## 4. Design / UX Concept and Constraints

### 4.1 Tone and visual register (per `impeccable` skill)

The brief calls for "organic, minimalist, sophisticated" with real-life furniture imagery and a strict four-colour palette. Read against `impeccable`'s anti-patterns:

- **Color strategy**: **Restrained**. The four hex tokens are a tinted-neutral system with one accent (the secondary `#A69076` taupe). Surface area for the secondary is ≤10% (CTAs, decorative rules, link states). `impeccable` flags the cream/sand range (OKLCH L 0.84–0.97, C<0.06, hue 40–100) as the 2026 saturated AI default — both `#EBE2D9` and `#F9F8F6` sit in that band. **This is a deliberate brand choice in the brief, not a reflex.** Identity preservation wins; but the visual identity must therefore lean on **typography pair, image quality, and contrast discipline** to avoid the AI-default read.
- **Typography pair**: Source Serif 4 (headlines) + Hanken Grotesk (body/labels). This is a serif/grotesque pair on the right contrast axis (humanist serif vs. geometric-ish grotesque). Display letter-spacing floor `-0.03em`, never tighter. Hero `clamp()` max `≤ 6rem`. Body line length capped at 65–75ch.
- **Imagery**: Real-life furniture, no sketchy SVG illustrations, no decorative grid backgrounds, no `border + 16px+ box-shadow` ghost cards, no side-stripe borders, no gradient text, no glassmorphism as default, no identical card grid, no eyebrow kicker on every section.
- **Section cadence**: One deliberate named kicker is acceptable; an eyebrow on every section is not. Numbered section markers (`01 / 02 / 03`) only if the section is a real sequence (e.g., the three-step advice block, if present).

### 4.2 Conversion strategy (without manufacturing data)

The conversion surface is intentionally simple:

- **Primary CTA**: floating WhatsApp button (always visible) + per-product "consultar por WhatsApp" action that opens `https://wa.me/<number>?text=<pre-filled Spanish template>`.
- **Secondary CTA**: contact form (server action → Strapi collection) for users who do not use WhatsApp.
- **Trust surfaces**: family story (no fabricated history — copy must come from the client), real homes gallery (only photos the client can prove are theirs), FAQ (only questions the client answers in writing), testimonials (only quotes the client supplies and consents to).
- **Performance gate**: 95+ PageSpeed / Core Web Vitals — the only honest lever is real imagery under 150 KB AVIF/WebP, `next/image` with explicit dimensions, font subsetting (`next/font` with `display: 'swap'`, `preload: true`), and avoiding third-party JS beyond the WhatsApp widget loader.

### 4.3 Spanish copy discipline

Public UI copy is professional Chilean Spanish, not persona/regional voice. Microcopy and JSON-LD `description` strings live in a single source of truth (Spanish) and are not translated unless `i18n` is added in a later change.

## 5. Approaches Considered

### 5.1 Repository structure

| Approach | Pros | Cons | Effort |
| --- | --- | --- | --- |
| **A. pnpm workspace monorepo (`apps/web`, `apps/cms`, `packages/ui-tokens`)** | One PR per surface impossible to confuse; shared types; one CI pipeline; one Coolify Compose stack; one git history. | Adds workspace tooling (changesets, turbo or nx optional); slightly more setup. | Med |
| B. Two separate repos | Trivial to split ownership. | Loses shared types, doubles CI, makes deploy coordination manual. | Low setup, High ops |
| C. Single repo, no workspace, two top-level folders | Lowest ceremony. | No shared deps, easy to drift, no package boundaries. | Low |

**Pick A.** The shared `packages/ui-tokens` package (Tailwind theme + Spanish microcopy constants + JSON-LD builders) makes the two surfaces coherent. pnpm is current Next/Strapi default.

### 5.2 Render / cache strategy

| Approach | Pros | Cons | Effort |
| --- | --- | --- | --- |
| **A. Hybrid SSG/ISR per section (recommended)** | Catalog uses `revalidate: 300`; FAQ/SiteSettings `revalidate: 3600`; hero copy `revalidate: 86400`; floating WhatsApp is client-only; lead form is a server action. Tunable, fast, content-editor-friendly. | Slightly more complex than pure SSG; need to understand Next 16 cache semantics. | Med |
| B. Pure SSG with full rebuilds on Strapi webhook | Simplest mental model. | Slow iteration when catalogue grows; rebuild on every edit. | Low |
| C. SSR for everything | Always fresh. | Slow TTFB; requires cache headers everywhere; loses ISR benefits. | Med |
| D. Edge cache (Cloudflare/Cloudflare-style in front of Coolify) | Best raw perf. | Requires edge layer; not part of brief; adds vendor. | High |

**Pick A.** Critically, per orchestrator note, do **not** assume legacy fetch caching defaults from older Next versions — Next 15+ changed `fetch` and Route Handler cache semantics, and Next 16 builds on that. Pin `export const revalidate = …` per route segment and avoid `no-store` drift. The Next 16 doc source confirms Server Components, `next/font`, `next/image`, metadata/robots/sitemap conventions, controlled revalidation, and JSON-LD rendered in HTML.

### 5.3 Strapi API surface

| Approach | Pros | Cons | Effort |
| --- | --- | --- | --- |
| **A. REST v5 with explicit `populate=*` and `fields` (recommended)** | One consumer (Next.js); fits Strapi 5 flat response; lower ops surface than GraphQL. | Manual populate tuning per query; relations require care. | Low |
| B. GraphQL via `@strapi/plugin-graphql` | Strongly typed queries from Next. | Plugin overhead, server cost, complexity for one client. | Med |
| C. `@strapi/client` (official client) | TypeScript-friendly. | Younger; less battle-tested; may lag features. | Med |

**Pick A.** Strapi 5 REST returns flat responses with explicit `populate` required for relations and media; private access uses a bearer API token (server-to-server). Document Service API (`strapi.documents()`) is the internal data layer; the frontend hits REST, not Document Service.

### 5.4 Hosting topology on Coolify

| Approach | Pros | Cons | Effort |
| --- | --- | --- | --- |
| **A. Single Coolify Compose stack (`web`, `cms`, `db`, `proxy`)** | Internal Docker network means Strapi never hits the public internet; one `docker-compose.yml` is the source of truth; Traefik handles TLS. | Compose is more verbose than per-app deploys; needs health checks labelled correctly. | Med |
| B. Three Coolify apps + managed MySQL | One-click deploys per surface. | Strapi admin would need public exposure + auth hardening; harder to keep on internal network. | Low setup, High risk |
| C. Coolify app per surface, shared managed MySQL on Coolify | Clean separation. | Same admin-exposure risk as B. | Med |

**Pick A.** Traefik labels in the Compose file expose only `web` publicly. `cms` is internal-only on the stack network; admin access is via SSH tunnel or WireGuard (operator choice — recorded as a decision gap in §14). `db` is internal-only. No public Strapi admin URL.

### 5.5 Tailwind v4 configuration style

| Approach | Pros | Cons | Effort |
| --- | --- | --- | --- |
| **A. CSS-first `@theme` tokens in `app/globals.css` (recommended)** | Native to v4; no JS config drift; one source of truth; works with Next App Router. | Some plugins still expect `tailwind.config.js`. | Low |
| B. Legacy `tailwind.config.ts` | Familiar. | Anti-pattern in v4; `@theme` is the documented path. | Low |

**Pick A.** Tailwind v4 docs confirm CSS-first `@theme`, App Router integration, `motion-reduce`, container variants. Brand tokens (`--color-ink`, `--color-taupe`, `--color-cream`, `--color-paper`, `--font-display`, `--font-body`) live in `globals.css` and are exposed to utilities via `@theme`.

### 5.6 Content type boundaries (assessed)

| Type | Decision | Rationale |
| --- | --- | --- |
| **Product** | **Required.** | Brief explicitly requires Strapi-backed featured catalog with image, title, description, optional price, WhatsApp action. |
| **Category** | **Required.** | Brief explicitly requires category grid; products need a category relation. |
| **FAQ** | **Required.** | Brief explicitly requires FAQ section; FAQPage JSON-LD requires structured Q/A. |
| **Testimonial** | **Required if client can supply real quotes.** | Brief lists testimonials + real homes. **Strict gate**: no fabricated testimonials. If the client cannot provide ≥3 real, consented quotes, the section collapses to a real-homes gallery with no quotes. |
| **BlogPost / Advice** | **Required.** | Brief requires "expert advice/blog preview". Recommended as a single `Article` content type with `category` enum (cuidados, materiales, decoración). |
| **RealHome** | **Required.** | Required to keep the testimonials/real homes section honest — every "real home" gallery item links to a `RealHome` entry with consented photo metadata. |
| **SiteSettings (singleton)** | **Required.** | Single-source for nav, hero copy override, contact phone, WhatsApp number, address (when known), social URLs, footer columns. Without a singleton, copy changes require a redeploy. |
| **Lead (form submissions)** | **Required.** | Backend of the contact form. Single type with rate-limit metadata; admin-only viewing. |

## 6. Repo and Deploy Layout (Recommended)

```
landing.ene-muebles.cl/
├── apps/
│   ├── web/                          # Next.js 16 (App Router, TS)
│   │   ├── src/app/
│   │   │   ├── (marketing)/
│   │   │   │   ├── page.tsx          # landing page composition
│   │   │   │   ├── layout.tsx
│   │   │   │   └── opengraph-image.tsx
│   │   │   ├── api/
│   │   │   │   ├── revalidate/route.ts   # Strapi webhook
│   │   │   │   └── health/route.ts
│   │   │   ├── sitemap.ts
│   │   │   ├── robots.ts
│   │   │   └── layout.tsx
│   │   ├── src/components/           # atomic design
│   │   │   ├── atoms/
│   │   │   ├── molecules/
│   │   │   ├── organisms/            # <Hero />, <CategoryGrid />, <FeaturedCatalog /> …
│   │   │   └── templates/
│   │   ├── src/lib/
│   │   │   ├── strapi.ts             # REST client, bearer token, populate, fields
│   │   │   ├── seo.ts                # metadata + JSON-LD builders
│   │   │   └── whatsapp.ts           # wa.me link builder
│   │   ├── src/styles/globals.css    # @theme tokens
│   │   └── public/
│   └── cms/                          # Strapi 5
│       ├── config/{database,server,middlewares,plugins,api,admin}.ts
│       ├── src/api/
│       │   ├── product/  {controllers,routes,services,content-types,schema.json}
│       │   ├── category/ …
│       │   ├── faq/ …
│       │   ├── testimonial/ …
│       │   ├── article/ …
│       │   ├── real-home/ …
│       │   ├── site-setting/ …
│       │   └── lead/ …
│       ├── .env
│       └── public/uploads/
├── packages/
│   └── ui-tokens/                    # shared tailwind preset + ES strings
│       ├── src/tokens.css            # @theme tokens
│       ├── src/copy/es-CL.ts
│       └── src/jsonld/               # builders for LocalBusiness, Product, FAQPage, BreadcrumbList, WebSite
├── infrastructure/
│   └── docker-compose.yml            # web + cms + db, Traefik labels, internal network
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── openspec/                         # SDD artefacts (already present)
└── README.md
```

## 7. Schema.org / JSON-LD Plan (Eligibility Constraints)

**Rule (strict, non-negotiable, from brief):** the change must not manufacture Review/Product/LocalBusiness data or ratings that are not backed by real, consented, verifiable content. Schema.org JSON-LD MUST be honest.

| Type | Emit when | Source of truth |
| --- | --- | --- |
| `WebSite` | Always, root layout. | Hard-coded brand constants (name, alternateName, URL). |
| `WebPage` / `BreadcrumbList` | On the landing route. | Hard-coded single page; no breadcrumbs because there is only one route in this change. |
| `LocalBusiness` (`FurnitureStore`) | Always. | **Only with verified fields.** `name`, `url`, `description`, `image`, `telephone`, `address`, `areaServed` "CL", `priceRange` "$$". `address` and `telephone` MUST come from `SiteSettings` and MUST NOT be emitted if the value is missing — partial LocalBusiness is worse than none. `geo` is omitted unless coordinates are verified. **No aggregate rating, no review count, no `openingHours` invented from defaults.** |
| `FAQPage` | On landing, only when `FAQ` entries exist and are marked publishable. | Strapi `FAQ` collection. |
| `Product` | On the featured catalog section, only for products with a non-empty `name` and `image`. | Strapi `Product` collection. **No `aggregateRating`, no `review` array, no `offers.price` unless `Product.price` is set. `offers.availability` defaults to `https://schema.org/InStock` only if the client confirms in-stock semantics; otherwise omitted.** |
| `Article` | Per blog preview card linking out (out of scope for this change if no blog index is built). | Strapi `Article` collection. |
| `Organization` | Optional, alongside LocalBusiness for `sameAs` social links. | Strapi `SiteSettings`. |

Every JSON-LD block is rendered server-side in HTML (not injected by client JS) and validates against Google's Rich Results Test before archive.

## 8. Images, Accessibility, Responsive, Motion

- **Images**: `next/image` with explicit `width`/`height` for fixed slots and `fill` + `sizes` for hero/grid; AVIF/WebP via `next/image` defaults; `priority` on the hero `LCP` image; lazy elsewhere; `placeholder="blur"` with generated blurDataURL during scaffold.
- **Fonts**: `next/font/google` for Source Serif 4 + Hanken Grotesk with `display: 'swap'`, `preload: true`, `fallback: ['Georgia', 'system-ui']`. Self-host fallback. `font-display: swap` is non-negotiable for LCP.
- **A11y**: WCAG 2.1 AA. All CTAs keyboard-reachable; `aria-label` on the floating WhatsApp button; FAQ uses `<details>`/`<summary>` or a button-controlled region with `aria-expanded`; `prefers-reduced-motion` honored via Tailwind v4 `motion-reduce:` variant; body text against `#F9F8F6` and `#EBE2D9` must hit ≥4.5:1 — `#2C2C2C` body on `#F9F8F6` is comfortably above; verify with a contrast check in sdd-verify.
- **Responsive**: mobile-first; hero copy scales with `clamp(2.25rem, 1.5rem + 3vw, 4.5rem)`; catalog grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; category grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`; section spacing in a single 4/8/12/16/24/40/64 scale.
- **Motion**: subtle only. Reveal animations enhance an already-visible default (no `opacity: 0` + JS-triggered show — that traps content on headless renderers). Sticky nav transitions on scroll with `motion-reduce:` override. Carousel/swipe for catalog uses native scroll-snap or a tiny accessible carousel, not a 50 KB library.
- **WhatsApp**: the floating button is the only persistent client island. It must not block the main thread; load `wa.me` intent only on user click (no script tag, no iframe until interaction).

## 9. Strapi Content Model — Minimum Boundaries

| Type | Key fields (Strapi 5 schema) | Notes |
| --- | --- | --- |
| **Product** | `title` (string, required), `slug` (uid from title), `shortDescription` (text ≤160), `description` (rich text), `price` (decimal, optional), `currency` (enum, default `CLP`), `image` (media single, required, with `formats` requested via populate), `category` (relation many-to-one → Category), `whatsappTemplate` (text, optional override), `featured` (boolean, default false), `order` (integer), `publishedAt` (D&P default). | Image populate must include `formats.thumbnail, formats.small, formats.medium, formats.large`. |
| **Category** | `name` (string, required), `slug` (uid), `description` (text), `image` (media single, optional), `order` (integer). | Used by both nav and product relation. |
| **FAQ** | `question` (string, required), `answer` (rich text, required), `order` (integer), `publishedAt`. | Drives `FAQPage` JSON-LD. |
| **Testimonial** | `quote` (text, required), `customerName` (string, required — only with consent), `customerLocation` (string, optional), `source` (string, optional — where the customer saw the product), `consentOnFile` (boolean, required = true to publish). | Hard gate: not publishable until `consentOnFile`. **No `rating` field.** No schema.org `Review` emission until the brand chooses to. |
| **Article** | `title`, `slug`, `excerpt` (text ≤200), `body` (rich text), `coverImage` (media), `category` (enum: cuidados / materiales / decoración / general), `authorName` (string — must be a real person), `publishedAt`. | Author is plain string for v1; promote to relation when there is a real author directory. |
| **RealHome** | `title`, `description` (rich text), `photos` (media multiple, each with `alt` from client), `location` (string — region/commune only, not a specific address), `consentOnFile` (boolean, required), `featured` (boolean). | No precise geocodes. |
| **SiteSetting** (singleton) | `brandName`, `tagline`, `heroHeadline` (default ES text — orchestrator-provided phrase: *"Transforma tu hogar con la calidez de lo hecho para ti."*), `heroSubheadline`, `whatsappNumber` (E.164, required to publish), `contactEmail`, `addressLine1`, `addressCommune`, `addressCity`, `addressRegion` (default "Región Metropolitana" or empty), `addressCountry` (default "CL"), `socialLinks` (repeatable component: `network`, `url`), `footerColumns` (repeatable component). | Editable in admin; no code change for copy updates. |
| **Lead** | `name`, `email`, `phone`, `message`, `productOfInterest` (relation → Product, optional), `source` (enum: form / whatsapp / other), `ip` (string, server-side), `userAgent` (string, server-side), `createdAt` (audit). | Admin-only. Rate-limited at the Next.js route handler. |

All types use Strapi 5 Draft & Publish. The CMS admin is reachable only through an SSH tunnel or the operator's VPN — public Strapi URL is not exposed.

## 10. API Contract (Strapi REST v5, populated)

Base URL on Coolify internal network: `http://cms:1337/api`. Bearer token in `STRAPI_API_TOKEN` (env). The Next.js client wraps calls in `lib/strapi.ts`:

```ts
// canonical request — populate per query, never `populate=*` for the whole page
GET /api/products?filters[featured][$eq]=true
                  &pagination[pageSize]=9
                  &sort[0]=order:asc
                  &populate[image][fields][0]=url&populate[image][fields][1]=alternativeText&populate[image][fields][2]=width&populate[image][fields][3]=height&populate[image][fields][4]=formats
                  &populate[category][fields][0]=name&populate[category][fields][1]=slug
                  &fields[0]=title&fields[1]=shortDescription&fields[2]=price&fields[3]=currency&fields[4]=slug

// FAQs for FAQPage schema
GET /api/faqs?sort[0]=order:asc
              &pagination[pageSize]=20
              &fields[0]=question&fields[1]=answer

// Singleton SiteSettings
GET /api/site-setting?populate[socialLinks]=*&populate[footerColumns]=*
```

The client normalises Strapi 5's `{ data: [...], meta: { pagination } }` flat envelope and exposes typed getters. Errors propagate as `Result<T, StrapiError>` to the section components; each section has a defined failure state (skeleton / static fallback copy).

## 11. SEO / GEO / AEO Plan

- **Metadata**: Next 16 `generateMetadata` per route, `metadataBase` set to `https://landing.ene-muebles.cl`, Open Graph + Twitter Card tags, `alternates.canonical` self-referencing.
- **`robots.ts`**: allow all on root; reference `/sitemap.xml`.
- **`sitemap.ts`**: returns one entry — the landing route. Statically generated.
- **Heading hierarchy**: one `<h1>` (hero), each section uses `<h2>` (or `<h3>` for nested cards). Verified in sdd-verify.
- **Entity-rich content for GEO**: brand is named in body copy in the first 100 words; address/region/CL are mentioned in the family-story copy; materials (madera maciza, MDF, tapiz) and styles (escandinavo, contemporáneo, clásico) are referenced with named examples; the family story anchors an `Organization` entity.
- **AEO**: FAQ uses natural-language Chilean-Spanish questions; each answer is 40–80 words to be snippet-eligible; `FAQPage` JSON-LD provides the machine-readable mirror; `WebSite` JSON-LD with `SearchAction` is omitted (no search input on a one-route landing).
- **llms.txt**: a curated `/llms.txt` MAY be added in a follow-up change once content is finalised; out of scope for this change because copy is not yet stable.
- **hreflang**: omitted (single-locale landing). If/when `en` is added, the change MUST add `alternates.languages` and a `hreflang` map.

## 12. Security, Failure States, Content Fallback

- **Server-to-server**: only `STRAPI_API_TOKEN` (bearer) with the **minimum scope** needed for read access (no admin token). Documented in `.env.example`.
- **Public exposure**: only `web` (port 3000) is exposed via Traefik. `cms` is reachable only on the internal stack network. `db` is internal. Strapi admin requires VPN/SSH tunnel for the operator.
- **CORS**: Strapi CORS allowlist = exactly `https://landing.ene-muebles.cl` (production) and `http://localhost:3000` (dev). Documented in `apps/cms/config/middlewares.ts`.
- **Rate limiting**: lead route handler enforces per-IP rate limit (5/min) and a hard daily cap.
- **WhatsApp mirror**: best-effort, single-attempt, non-blocking. If the mirror fails, the lead is still persisted in Strapi and the user gets the success page.
- **CMS unavailable**: each Strapi-fetching section has a defined fallback. The page MUST render an honest degraded state — never invent catalog data. The family-story section is file-backed (Spanish in `apps/web/src/content/family-story.ts`) and never depends on Strapi.
- **Image CDN**: Strapi media is served by the same `cms` container internally for now; if the page crosses the size threshold (TBD in sdd-verify), add an image resizer (`@strapi/plugin-upload` provider or pre-built AVIF mirror).
- **Secrets**: no `.env` committed; `.env.example` documents every required key. Coolify env vars are the runtime source.
- **CSP**: a strict Content-Security-Policy header is set in `next.config.ts` (default-src 'self'; img-src 'self' cms:1337 data:; connect-src 'self' cms:1337; frame-src https://wa.me; …). WhatsApp click is `https://wa.me`, no iframe.

## 13. Test Strategy (Greenfield July 2026)

| Layer | Tool | When | Scope |
| --- | --- | --- | --- |
| Type check | `tsc --noEmit` (Next) + Strapi's own `ts:generate-types` | Every apply task | Both surfaces |
| Lint | `eslint` with `next/core-web-vitals` (Next) + Strapi's own lint preset | Every apply task | Both surfaces |
| Unit | **Vitest** (Next side) | After scaffold | `lib/strapi.ts` adapter, `lib/seo.ts` JSON-LD builders, `lib/whatsapp.ts` URL builder |
| Component | Vitest + Testing Library (Next side) | After scaffold | Hero CTA, FAQ accordion, Product card, Floating WhatsApp |
| Integration | Vitest against a mocked Strapi REST handler (msw) | After scaffold | Strapi client error normalisation |
| E2E | **Playwright** | After scaffold | Hero → category → product → WhatsApp CTA path; FAQ expand; mobile (390×844) and desktop (1440×900) viewports |
| Visual regression | Playwright `toHaveScreenshot` per section | Once components stabilise | Catches drift in the meticulous palette |
| Accessibility | `@axe-core/playwright` | Once E2E exists | WCAG 2.1 AA on landing page |
| Performance | Lighthouse CI (Playwright shim) | Once E2E exists | Gate: 95+ on Performance/Best Practices/SEO; LCP ≤ 2.5 s on simulated 4G |
| Schema validation | Manual `npx schema-org-validator` + Google's Rich Results Test | Before archive | All emitted JSON-LD blocks |

**Flip `strict_tdd: true`** in `openspec/config.yaml` after the Vitest + Playwright setup task lands. Until then, the `test_command` and `build_command` in `apply`/`verify` remain empty.

## 14. Assumptions and Decision Gaps

The brief was explicit that no user questions are asked. The following are recorded as **assumptions** (A) or **decision gaps** (DG) for the proposal/spec phases to resolve.

- **(A)** Brand name is **Ene Muebles** and the domain is **landing.ene-muebles.cl**. The hero copy is exactly *"Transforma tu hogar con la calidez de lo hecho para ti."* — taken from the brief.
- **(A)** Public copy language is Chilean Spanish; SDD artefacts are English. Locale tag `es-CL`; no `en` locale in this change.
- **(A)** Real photos will be supplied by the client. Until then, placeholders use the brand palette, not AI-generated imagery.
- **(A)** No `i18n` plugin in Strapi for v1 (single locale).
- **(A)** WhatsApp number and address come from `SiteSettings` and are **not invented**; if missing, the floating WhatsApp button shows a "consultar" CTA pointing at `mailto:` fallback.
- **(A)** Lead notifications mirror to WhatsApp **only** if the operator configures a WhatsApp Cloud API credential in Coolify env. Without that, the lead is stored in Strapi only.
- **(DG-1)** Author identity for `Article`: are authors always the in-house family, or external guest authors? Affects whether `Article.author` becomes a relation.
- **(DG-2)** Operator access to Strapi admin: SSH tunnel vs. WireGuard VPN vs. Cloudflare Tunnel — to be picked at sdd-design.
- **(DG-3)** WhatsApp Business Cloud API credentials: do we request them, or do leads go to a personal WhatsApp via `wa.me`?
- **(DG-4)** Whether testimonials exist at all: depends on whether the client has ≥3 consented real quotes.
- **(DG-5)** Whether to ship an article index in this change, or keep the "expert advice/blog preview" section static-link to a future route.
- **(DG-6)** Whether `SiteSettings.address` is real and mappable; if not, the `LocalBusiness` JSON-LD will not include `address` at all.

## 15. Scope, Line-Count Forecast, and PR Strategy

### 15.1 Forecast

This is a greenfield build with three workstreams:

| Stream | Estimated lines (added) |
| --- | --- |
| Monorepo scaffold (pnpm workspace, tsconfig, lint, prettier, root CI) | 250–400 |
| `apps/web` (routes, sections, lib, tests, JSON-LD, sitemap, robots, CSP, Playwright config) | 2,200–3,200 |
| `apps/cms` (8 content types, configs, env example, seed script, REST client tests) | 900–1,400 |
| `packages/ui-tokens` (tokens, copy, JSON-LD builders, tests) | 250–400 |
| `infrastructure/docker-compose.yml` + Coolify labels + env example | 150–250 |
| OpenSpec artefacts (proposal + spec + design + tasks + verify report) | 600–900 |
| **Total estimated** | **~4,400–6,550** |

### 15.2 Risk vs. review budget

- **Review budget**: 800 lines (PR additions + deletions).
- **Project total**: ~4,400–6,550 lines.
- **Conclusion**: **HIGH** review-budget risk. A single PR is not viable.
- **Decision needed before apply**: **Yes**.
- **Chained PRs recommended**: **Yes**.
- **400-line budget risk (default)**: **High**. 800-line budget risk is still High because review attention ≠ raw line count.

### 15.3 Suggested chain (subject to sdd-tasks refinement)

This is a sequencing recommendation, not a final task plan. sdd-tasks will own the exact slicing.

1. **PR 1 — Repo scaffold + tokens + empty deploy** (≈250–400 lines): pnpm workspace, TS, lint, prettier, root CI skeleton, `packages/ui-tokens` with `@theme`, `infrastructure/docker-compose.yml`, `apps/web` "Hello landing", `apps/cms` first boot, deployable to Coolify. Verifiable: `docker compose up` brings both surfaces up; `https://landing.ene-muebles.cl` returns 200.
2. **PR 2 — Strapi schema + admin seed** (≈600–900 lines): all 8 content types with D&P, Media Library config, seed script with `family-story` and three placeholder FAQs. Verifiable: Strapi admin reachable via tunnel; `GET /api/products` returns seeded payload.
3. **PR 3 — Hero + nav + footer + WhatsApp + JSON-LD skeleton** (≈500–700 lines): sticky nav, hero, footer, floating WhatsApp, `WebSite`/`LocalBusiness` JSON-LD, `robots.ts`, `sitemap.ts`, base metadata. Verifiable: Lighthouse ≥ 95, schema.org validator passes.
4. **PR 4 — Catalog: category grid + featured products + ProductCard** (≈500–700 lines): server components, `next/image`, swipe-friendly grid, "consultar por WhatsApp" action with pre-filled template. Verifiable: Playwright E2E "browse → tap → wa.me opens with pre-fill".
5. **PR 5 — Family story + advice preview** (≈400–600 lines): file-backed family story section, ArticleStrapi-backed preview cards. Verifiable: visual regression snapshots match.
6. **PR 6 — Testimonials + real homes gallery** (≈400–600 lines): consent gates, lightbox, alt-text discipline. Verifiable: only entries with `consentOnFile: true` render.
7. **PR 7 — FAQ + accordion + FAQPage JSON-LD** (≈300–500 lines): `<details>`/`<summary>` with motion-reduce, schema validation. Verifiable: `FAQPage` rich-results test passes.
8. **PR 8 — Lead capture: server action + Strapi POST + rate limit** (≈300–500 lines): contact form, WhatsApp mirror best-effort, audit log. Verifiable: integration test posts a lead and asserts Strapi persisted.
9. **PR 9 — Hardening pass: CSP, headers, perf budget, axe, Lighthouse CI gate** (≈300–500 lines). Verifiable: Lighthouse ≥ 95 across the three categories; axe-clean.

Each chained PR is autonomous, independently revertable, and ends with a clear deploy + verify path on Coolify.

## 16. Risks

- **HIGH — Review budget (see §15.2).** A single PR is infeasible; chained PRs are mandatory.
- **HIGH — Schema.org compliance.** Manufactured ratings/reviews/addresses would breach Google's spam policies and the brief's explicit constraint. Mitigation: emit only `LocalBusiness`/`Product` with verified fields; gate `Testimonial` and `RealHome` on consent flags; run Rich Results Test before archive.
- **HIGH — Performance budget on imagery.** A "sophisticated, real-life" furniture catalogue can blow the LCP target without aggressive `next/image` discipline. Mitigation: enforce 150 KB AVIF ceiling per image during scaffold; gate release on Lighthouse CI.
- **MEDIUM — Strapi admin exposure.** A misconfigured Traefik label could publish the admin. Mitigation: keep `cms` on internal network only; document operator tunnel workflow; add a smoke test that 404s `cms.landing.ene-muebles.cl`.
- **MEDIUM — WhatsApp as primary CTA without API.** The `wa.me` deep link only opens a chat; lead capture requires the user to send. Mitigation: provide the contact-form fallback; provide `mailto:` if WhatsApp number is unset.
- **MEDIUM — `impeccable` AI-default concern on cream palette.** Both `#EBE2D9` and `#F9F8F6` sit in the 2026 saturated AI-default band. Mitigation: rely on typography pair, image quality, contrast, and section cadence to break the reflex; review session with the brand owner at sdd-verify.
- **MEDIUM — Strapi REST populate drift.** Easy to under- or over-populate. Mitigation: pin canonical queries in `lib/strapi.ts`; integration tests assert populate shape per type.
- **LOW–MEDIUM — No test runner yet.** Tests are added in PR 2 onward; until then, apply tasks are review-only.
- **LOW — Coolify compose vs. per-app deploy.** A future move to per-app deploys requires re-networking; out of scope, but worth a design doc footnote.

## 17. Ready for Proposal

**Yes.** Scope, render strategy, content model boundaries, repo/deploy shape, schema.org compliance posture, security and failure-state contract, test strategy, line-count forecast, and chained-PR shape are all defined enough to drive `sdd-propose landing-page-initial`.

The proposal phase should:
1. Lock the repo layout (§6) and the chained-PR plan (§15.3).
2. Re-publish the assumptions and decision gaps (§14) so the user can resolve `DG-1`–`DG-6` in the proposal flow.
3. Hand a concrete `apply` instruction set to the downstream phases.

No code, scaffold, or implementation will be written in `sdd-explore`. That is left to the proposal phase and onward.
