# Proposal: landing-page-initial — Ene Muebles greenfield landing

## Intent

Ene Muebles is a Chilean family-owned furniture brand with no live web presence. The brief asks for a single high-conversion landing page whose job is to turn Chilean visitors into qualified leads — primarily through WhatsApp deep links, with a contact form as secondary path — over a Strapi-managed catalog. The repository is empty; this change establishes the two deployable surfaces (Next.js web + Strapi v5/MySQL CMS) and the editorial loop that keeps the page current without engineering involvement. The proposal preserves the brief's no-fabrication constraint: no invented ratings, addresses, testimonials, hours, or pricing.

## Target Users and Situations

| User | Moment | Primary surface | Urgency |
| --- | --- | --- | --- |
| Chilean homeowner browsing mobile | Searching "muebles a medida Chile" or similar | Landing on `/`, scanning hero + catalog | Medium-high |
| Returning visitor | Returning after a WhatsApp conversation | Reopens the same route, expects content to be current | Medium |
| Brand operator | Editing copy, swapping a product photo | Logs into Strapi admin via tunnel | High (publishes, not codes) |
| LLM/AI search crawler | Indexing the brand entity | Reads HTML, JSON-LD, `robots.txt`, `sitemap.xml` | Background |

## Desired Outcomes

- A landing page that renders a real, current catalog without engineering involvement for content edits.
- A single WhatsApp handoff path that is the primary CTA; a contact form is the accessible fallback.
- Schema.org markup that an LLM or Google can cite without breaching Google's anti-spam policies on fabricated reviews/ratings.
- A Lighthouse ≥ 95 score across Performance / Best Practices / SEO on a simulated 4G run.
- Editorial autonomy for the operator: copy changes publish within seconds, photo swaps publish within minutes.

## Success Criteria (measurable)

- [ ] `https://landing.ene-muebles.cl` returns HTTP 200 with one `<h1>` and full heading hierarchy validated.
- [ ] All eight ordered sections render in DOM order: nav, hero, category grid, featured catalog, family story, expert advice preview, testimonials + real homes, FAQ, footer, plus the floating WhatsApp island.
- [ ] Lighthouse CI on the landing route ≥ 95 / 95 / 95; LCP ≤ 2.5 s on simulated 4G.
- [ ] Google Rich Results Test passes for `LocalBusiness`, `FAQPage`, and any emitted `Product` blocks.
- [ ] `axe-core` reports zero WCAG 2.1 AA violations on the landing route at 390×844 and 1440×900.
- [ ] Strapi admin reachable only via operator tunnel/VPN; `cms.landing.ene-muebles.cl` 404s publicly.
- [ ] A contact-form submission persists to Strapi `Lead`, returns success, and the WhatsApp mirror failure (if any) does not block the user.
- [ ] No JSON-LD field is emitted unless its value is sourced from `SiteSettings` or a verified content type.

## Scope

### In Scope

- pnpm workspace monorepo: `apps/web` (Next.js 16 App Router), `apps/cms` (Strapi 5), `packages/ui-tokens` (Tailwind v4 `@theme`, ES-CL copy constants, JSON-LD builders).
- Strapi content types: `Product`, `Category`, `FAQ`, `Testimonial`, `Article`, `RealHome`, `SiteSetting` (singleton), `Lead` — all with Draft & Publish.
- Strapi REST v5 with explicit `populate=*` and `fields`; server-to-server read token only.
- Hybrid SSG/ISR per section: catalog `revalidate=300`, FAQ/SiteSettings `revalidate=3600`, hero copy `revalidate=86400`.
- Atomic-design component tree for the landing page; one floating WhatsApp client island; otherwise server-rendered.
- SEO/GEO/AEO layer: per-route `generateMetadata`, Open Graph + Twitter Card, `robots.ts`, `sitemap.ts`, JSON-LD blocks (`WebSite`, `LocalBusiness`, `FAQPage`, `Product`, optional `Organization`), single locale `es-CL`.
- A11y: WCAG 2.1 AA, keyboard-reachable CTAs, `<details>`/`<summary>` FAQ, `aria-label` on floating button, `prefers-reduced-motion` honored.
- Performance: `next/image` AVIF/WebP, `next/font` Source Serif 4 + Hanken Grotesk with `display: 'swap'`, `preload: true`, 150 KB image ceiling, no third-party JS beyond the WhatsApp click handler.
- Security: CSP, Strapi admin on internal Docker network only, CORS allowlist `https://landing.ene-muebles.cl` + `http://localhost:3000`, lead route rate-limited (5/min/IP, daily cap).
- Coolify Compose stack: `web` (public, port 3000), `cms` (internal), `db` (MySQL, internal), Traefik handles TLS on `web` only.
- Editorial fallback: each Strapi-fetching section has a defined degraded state; the family-story section is file-backed and never depends on Strapi.

### Out of Scope (this change)

- A multi-route site, article index, or `/producto/[slug]` detail pages.
- Multi-language (`en`) locale and `hreflang` map.
- Testimonial gating flow for the operator (consent intake UI) — gate is enforced by a boolean field on the schema; collecting consent evidence is the operator's editorial responsibility.
- An article index page; the expert-advice preview shows cards only.
- `llms.txt` (deferred to a follow-up change once copy is stable).
- E-commerce, payments, cart, account, or auth flows.
- Cloudflare/WAF layer; image CDN with global edge; A/B testing.
- WhatsApp Business Cloud API integration (best-effort only when the operator supplies a credential; otherwise, the form is the source of truth).
- Decision on the PR chain: **not committed here** (see PR Strategy Note).

## Constraints (non-negotiable, from brief and skill load)

| Constraint | Source |
| --- | --- |
| Brand palette: ink `#2C2C2C`, taupe `#A69076`, cream `#EBE2D9`, paper `#F9F8F6` | Brief |
| Fonts: Source Serif 4 (display) + Hanken Grotesk (body) | Brief |
| Public UI copy: professional Chilean Spanish; no persona/regional slang | Language Domain Contract |
| SDD artifacts: English | Language Domain Contract |
| No fabricated data: no invented ratings, reviews, addresses, hours, prices | Brief + SEO/AEO spam policy |
| Two deployable surfaces treated independently for rollback | `openspec/config.yaml` `rules.proposal` |

## Page Structure (DOM order, must be preserved)

1. Sticky top nav — logo, category links, contact CTA, WhatsApp button.
2. Hero — H1 headline, subheadline, primary WhatsApp CTA, secondary "ver catálogo" anchor.
3. Category grid — up to 8 `Category` entries, image + name + link.
4. Featured catalog — server-rendered grid of `Product` entries where `featured=true`; each card has image, title, short description, optional price, "Consultar por WhatsApp" deep link.
5. Family story — file-backed Spanish narrative anchored to the `Organization` entity (year founded, location, materials, process).
6. Expert advice preview — up to 3 `Article` cards (cuidados / materiales / decoración) linking out.
7. Testimonials + real homes — only entries with `consentOnFile=true`; lightbox gallery for `RealHome.photos` with `alt` from client.
8. FAQ — `<details>`/`<summary>` items sourced from `FAQ`; emits `FAQPage` JSON-LD.
9. Footer — `SiteSettings.footerColumns`, social `sameAs`, copyright, legal links.
10. Floating WhatsApp island — always visible, intent only on click (`wa.me/<number>?text=<pre-filled template>`).

## Conversion Flows

| Flow | Path | Failure mode |
| --- | --- | --- |
| Primary WhatsApp (hero, nav, footer, floating, per-product) | `wa.me/<SiteSettings.whatsappNumber>?text=<template>` opened on user click | If `whatsappNumber` unset → CTA points to `mailto:<contactEmail>` fallback |
| Contact form | Server action → rate-limited route handler → POST `/api/leads` (Strapi) → best-effort WhatsApp mirror | Mirror failure does not block success page; lead persists regardless |

## Capabilities (contract for `sdd-spec`)

### New Capabilities

- `landing-page-composition`: ordered sections, atomic-design tree, brand tokens, motion-reduce.
- `strapi-content-model`: 8 content types with D&P and editorial gates.
- `catalog-rendering`: Strapi REST v5 client, server components, populate contracts.
- `lead-capture`: server action, validation, rate limit, persistence, mirror.
- `whatsapp-handoff`: deep-link builder, fallback to `mailto:`.
- `seo-geo-aeo`: `generateMetadata`, OG/Twitter, `robots.ts`, `sitemap.ts`, JSON-LD blocks, single-locale.
- `accessibility`: WCAG 2.1 AA, keyboard nav, `aria-*`, `<details>`, contrast.
- `performance-budget`: `next/image`, `next/font`, Lighthouse CI gate.
- `security-and-exposure`: CSP, CORS allowlist, internal-only Strapi, rate limit, secrets.
- `coolify-compose-deployment`: `docker-compose.yml`, Traefik labels, env contract.

### Modified Capabilities

- None (greenfield; `openspec/specs/` has no prior capabilities).

## Approach

Build the monorepo in dependency order: tokens first (single source of truth for color/font/copy/JSON-LD), then the Compose skeleton, then Strapi schema with seed, then Next.js sections in their DOM order. Each section is independently testable and has a defined failure state. Render strategy is hybrid SSG/ISR with `next: { cache }` semantics tuned per route segment. JSON-LD is server-rendered into HTML — never injected by client JS. Editorial copy edits publish to Strapi and surface on the page after the relevant revalidation window (catalog 5 min, hero 24 hr) without a redeploy.

## Affected Areas

| Area | Impact | Description |
| --- | --- | --- |
| `openspec/changes/landing-page-initial/` | New | This change folder; will house proposal, specs, design, tasks, verify. |
| `openspec/specs/<capability>/spec.md` (x10) | New | Capabilities listed above become full specs. |
| `apps/web/` | New | Next.js 16 App Router; routes, components, lib, styles, tests. |
| `apps/cms/` | New | Strapi 5; 8 content types, configs, seed, REST client tests. |
| `packages/ui-tokens/` | New | Tailwind v4 `@theme`, ES-CL copy, JSON-LD builders. |
| `infrastructure/docker-compose.yml` | New | Coolify stack: web (public) + cms (internal) + db (internal). |
| `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` | New | Monorepo root. |
| `.env.example` (root + per-app) | New | Documents required keys; `.env` never committed. |

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Review budget (800 lines) vs. forecast (4,400–6,550) — single PR is not viable | High | Chain PRs autonomously. **Decision deferred to `sdd-tasks`** so the Review Workload Forecast owns the slicing. |
| Schema.org compliance breach via manufactured ratings/reviews/addresses | High | Emit only verified fields; `Testimonial` and `RealHome` gated by `consentOnFile`; run Rich Results Test before archive. |
| LCP regression on the hero image | Medium | `next/image` `priority` on hero; AVIF/WebP; 150 KB ceiling; Lighthouse CI gate. |
| Strapi admin exposure via misconfigured Traefik label | Medium | `cms` on internal network only; smoke test that `cms.landing.ene-muebles.cl` 404s publicly; operator accesses via tunnel. |
| Cream palette reads as 2026 AI-default | Medium | Lean on typography pair (serif + grotesque), image quality, and section cadence to break the reflex; review with brand owner in `sdd-verify`. |
| Strapi REST `populate` drift between sections | Medium | Pin canonical queries in `apps/web/src/lib/strapi.ts`; integration tests assert populate shape per type. |
| WhatsApp as primary CTA without Business Cloud API | Medium | `mailto:` fallback when `whatsappNumber` is unset; contact-form persists regardless. |
| No test runner yet | Low–Med | Apply tasks review-only until Vitest + Playwright land; flip `strict_tdd: true` after. |
| Editorial publishes a `LocalBusiness.address` that is incomplete | Medium | `address` omitted entirely if any sub-field is missing; partial LocalBusiness is worse than none. |

## Dependencies

- Verified business facts (still **unconfirmed** until operator supplies them in `SiteSettings`): exact WhatsApp number in E.164, contact email, physical address (commune, region), social profile URLs, founder names and consent for testimonials, real-home photos with `alt` and consent, article author identities, warranty policy text, delivery coverage list, pricing whether it is published on the page.
- Strapi 5 + MySQL 8.x image (both pinned by orchestrator at init).
- Coolify host with Traefik, a public domain pointed at `landing.ene-muebles.cl`, TLS via Let's Encrypt.
- An operator-accessible SSH tunnel or VPN for Strapi admin sessions.

## Rollback Plan

Each surface rolls back independently:

- **Next.js (`web`)**: revert the Coolify `web` service to the previous image; the route is stateless. Strapi remains untouched; on the next publish cycle, the front-of-record is the previous image. Domain DNS unaffected.
- **Strapi (`cms`)**: revert the `cms` service image; media on the persistent volume is unchanged. If a destructive content-type migration ran, restore MySQL from the pre-migration snapshot taken by Coolify's backup hook before the deploy.
- **Database (`db`)**: never deploy schema migrations on the same change as application deploys; if a migration breaks, the next `cms` image boots against the previous schema, and the migration is forward-fixed or rolled back in a follow-up.
- **A feature flag** (`NEXT_PUBLIC_FEATURE_*`) gates the floating WhatsApp island and the lead form server action; if either misbehaves in production, the flag turns it off without a redeploy of the route.

## Acceptance Outline (for `sdd-verify`)

- Build, type-check, and lint pass on both surfaces.
- Lighthouse CI ≥ 95 / 95 / 95 on the landing route.
- `axe-core` clean at 390×844 and 1440×900.
- Rich Results Test passes for `LocalBusiness`, `FAQPage`, and any emitted `Product` blocks.
- Strapi admin is unreachable on `https://cms.landing.ene-muebles.cl` from the public internet (404 or connection refused).
- Contact-form submission persists a `Lead` entry; the success page renders even when the WhatsApp mirror is disabled.
- No code path emits JSON-LD without a verified source-of-truth value.

## PR Strategy Note

**Not committed.** The cached `chained_pr_strategy` is `ask-always`. This proposal records the high-level sequencing direction (tokens → schema → sections → hardening) as context only; the orchestrator MUST ask the user to confirm the chain **after** `sdd-tasks` produces the formal Review Workload Forecast against the 800-line budget. No PR count, no per-PR scope, no review-bucket assignment is locked here.

## Labels — Business Facts Pending Operator Verification

These fields are intentionally NOT invented. The proposal, specs, design, and tasks all treat them as `TBD` until the operator supplies them and `SiteSettings` is populated:

- WhatsApp number (E.164)
- Contact email
- Physical address (line, commune, region) — only then can `LocalBusiness.address` be emitted
- Social profile URLs
- Founder / family member names for testimonials and `Organization` `founder`
- Real-home photos with `alt` text and consent evidence
- Testimonial quotes with customer name and `consentOnFile=true`
- Article author identities
- Warranty policy text and delivery coverage list
- Pricing model (whether `Product.price` is published on the page or kept behind the WhatsApp handoff)
