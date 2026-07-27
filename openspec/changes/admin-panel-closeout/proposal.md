# Proposal: admin-panel-closeout

## Intent

Close out the `/admin` slice so it is end-to-end functional: login → dashboard → create → edit → delete → logout, authenticated against Strapi with the correct token, behind a real layout, and shipped with a passing E2E gate. The blocker preventing merge today is a hard 401 on `POST /api/admin/products` — `apps/web/src/app/api/admin/products/route.ts` and `[id]/route.ts` read `process.env.STRAPI_API_TOKEN` directly (read-only public token), bypassing the `STRAPI_ADMIN_TOKEN ?? STRAPI_API_TOKEN` fallback already present in `lib/admin/strapi-admin.ts`. Login + session GET work because they route through `findAdminUserByEmail` / `findAdminUserByDocumentId` which use `adminFetch` with the correct fallback. This change fixes the token source-of-truth drift, adds the missing `app/admin/layout.tsx`, hardens the session-secret guard, deprecates the redundant `STRAPI_API_TOKEN_FULL`, reruns the E2E, runs Lighthouse/a11y smoke, and ships a clean PR with reviewer notes.

## Scope

### In Scope

- **Gap 1 — Token source-of-truth.** Extract `getStrapiAdminToken()` (or named constant) in `apps/web/src/lib/admin/strapi-admin.ts`; import it in `apps/web/src/app/api/admin/products/route.ts` and `apps/web/src/app/api/admin/products/[id]/route.ts`. Drop the local `process.env.STRAPI_API_TOKEN` reads.
- **Gap 2 — Admin layout.** Create `apps/web/src/app/admin/layout.tsx` with brand header (wordmark + user.name + role pill + Cerrar sesión form), sidebar nav (Productos / Nuevo producto) that collapses to stacked tabs on mobile, breadcrumb driven by pathname, and a skip-link. Remove the per-page `<header>` blocks from `admin/page.tsx`, `admin/productos/nuevo/page.tsx`, `admin/productos/[id]/page.tsx`.
- **Gap 4 — Middleware fail-closed.** In `apps/web/src/middleware.ts`, mirror `session.ts`: when `ADMIN_SESSION_SECRET` is missing or < 32 chars, deny ALL admin traffic (no dev fallback in middleware path). Document the dev-only fallback stays for local DX in a comment.
- **Gap 5 — Deprecate `STRAPI_API_TOKEN_FULL`.** Remove the line from `infrastructure/.env.local` and from `local-up.ps1` (or whichever script seeds it). Update `.env.local.example` if it appears there (it doesn't currently; only `.env.local` has it).
- **Gap 6 — E2E acceptance.** Run `infrastructure/test-admin.cjs` against the local stack; document expected status codes per step; fix the test only if a status code drifts, not the assertions.
- **Gap 7 — Lighthouse / SEO final.** Run `pnpm dlx @lhci/cli@0.13.x autorun --config=lighthouserc.json` on the public landing route (already covered by `seo-geo-aeo` spec) and an `axe-core` smoke against `/admin` and `/`. If Lighthouse tooling is not installed in this change's review budget, fall back to a manual SEO checklist: validate `sitemap.xml`, `robots.txt`, JSON-LD blocks via Google Rich Results Test instructions documented in `verify-report.md`.
- **Gap 8 — Commit + push + reviewer notes.** Stage, conventional-commit (no `Co-Authored-By`), push to `origin/feature/landing-page-initial`, attach "Reviewer notes" section (see `## Reviewer Notes` below) before opening the PR.

### Out of Scope

- CSRF tokens (admin uses httpOnly + `sameSite=strict` + 12h JWT — sufficient for v1, document the decision).
- Role-based UI differentiation (owner vs `cliente` rendering differences beyond what already exists).
- Image upload, product gallery, reorder, search.
- Multi-admin / audit log.
- Per-route a11y overhaul beyond the skip-link and breadcrumb.
- Refactoring `lib/admin/*` into a per-domain split.

## Capabilities (contract for `sdd-spec`)

### New Capabilities

- `admin-auth-token-source`: single Strapi admin token source of truth across all `/api/admin/*` route handlers; exposes `getStrapiAdminToken()` from `lib/admin/strapi-admin.ts`.

### Modified Capabilities

- `admin-panel-ux`: layout, breadcrumb slot, role pill, sidebar collapse behavior. (No prior spec; the delta will define it from scratch under this name.)
- `admin-session-secret`: fail-closed in production in BOTH `lib/admin/session.ts` AND `middleware.ts`; consistent length guard.

### Removed Capabilities

- `STRAPI_API_TOKEN_FULL` env var: deprecate. Keep `STRAPI_ADMIN_TOKEN` as the admin-scoped token and `STRAPI_API_TOKEN` as the public read-only token.

## Approach

| Phase | Deliverable | Files |
| --- | --- | --- |
| A | Extract `getStrapiAdminToken()`; refactor 2 route files | `apps/web/src/lib/admin/strapi-admin.ts`, `apps/web/src/app/api/admin/products/route.ts`, `apps/web/src/app/api/admin/products/[id]/route.ts` |
| B | Write `app/admin/layout.tsx`; strip per-page headers | `apps/web/src/app/admin/layout.tsx` (new), `apps/web/src/app/admin/page.tsx`, `apps/web/src/app/admin/productos/nuevo/page.tsx`, `apps/web/src/app/admin/productos/[id]/page.tsx` |
| C | Middleware fail-closed in production | `apps/web/src/middleware.ts` |
| D | Drop `STRAPI_API_TOKEN_FULL` from env scripts | `infrastructure/.env.local`, `infrastructure/local-up.ps1` |
| E | Run `test-admin.cjs`; record results | `openspec/changes/admin-panel-closeout/verify-report.md` (later) |
| F | Lighthouse + axe smoke OR manual SEO checklist | `verify-report.md` |
| G | Commit + push + reviewer notes | git history |

## Acceptance Criteria

- [ ] Gap 1: `grep -R "process.env.STRAPI_API_TOKEN" apps/web/src/app/api/admin/products` returns zero hits; both route files import from `lib/admin/strapi-admin`.
- [ ] Gap 1: `test-admin.cjs` step `[bonus] POST /api/admin/products` returns 200 or 201 with `data.id` set.
- [ ] Gap 2: `apps/web/src/app/admin/layout.tsx` exists; dashboard, `/admin/productos/nuevo`, and `/admin/productos/[id]` no longer render their own `<header>`.
- [ ] Gap 2: skip-link is the first focusable element on `/admin`.
- [ ] Gap 4: removing `ADMIN_SESSION_SECRET` from `.env.local` in production mode returns 503 from `/admin` and `/api/admin/*`; dev mode behavior is unchanged.
- [ ] Gap 5: `grep -R STRAPI_API_TOKEN_FULL infrastructure` returns zero hits.
- [ ] Gap 6: `test-admin.cjs` completes with status 200 on every step.
- [ ] Gap 7: Lighthouse report ≥ 90/90/90 OR manual SEO checklist signed off in `verify-report.md`.
- [ ] Gap 8: one conventional commit, no `Co-Authored-By`, pushed to `origin/feature/landing-page-initial`.

## Affected Areas

| Area | Impact | Description |
| --- | --- | --- |
| `apps/web/src/lib/admin/strapi-admin.ts` | Modified | Export `getStrapiAdminToken()` |
| `apps/web/src/app/api/admin/products/route.ts` | Modified | Use shared token constant |
| `apps/web/src/app/api/admin/products/[id]/route.ts` | Modified | Use shared token constant |
| `apps/web/src/app/admin/layout.tsx` | New | Shared admin chrome |
| `apps/web/src/app/admin/page.tsx` | Modified | Drop in-page header |
| `apps/web/src/app/admin/productos/nuevo/page.tsx` | Modified | Drop in-page header |
| `apps/web/src/app/admin/productos/[id]/page.tsx` | Modified | Drop in-page header |
| `apps/web/src/middleware.ts` | Modified | Fail-closed in prod (no silent dev bypass) |
| `infrastructure/.env.local` | Modified | Drop `STRAPI_API_TOKEN_FULL` |
| `infrastructure/local-up.ps1` | Modified | Stop seeding `STRAPI_API_TOKEN_FULL` if it does |
| `openspec/specs/admin-auth-token-source/spec.md` | New | Delta spec |
| `openspec/specs/admin-panel-ux/spec.md` | New | Delta spec |
| `openspec/specs/admin-session-secret/spec.md` | New | Delta spec |

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Rotating `ADMIN_SESSION_SECRET` invalidates all live admin sessions | Med | Document rotation procedure in `verify-report.md`; do not rotate in this change. |
| Lighthouse tooling install blows the 800-line review budget | Med | Defer to manual SEO checklist (sitemap + robots + JSON-LD); record acceptance explicitly. |
| `sameSite=strict` cookie drifts between dev (HTTP) and prod (HTTPS) and breaks login on first request | Low | Cookie code already uses `secure` flag conditionally; confirm in verify. |
| Layout refactor accidentally removes the user.name / role pill visible on dashboard | Med | Keep the dashboard fetch untouched; layout reads from the same session helper. |
| E2E blocks on an unrelated flake (network, Docker warm-up) | Low | Re-run once; if still flaky, log in `verify-report.md` and accept as known. |

## Rollback Plan

- **Layout (Phase B):** revert `layout.tsx`; restore the three per-page `<header>` blocks. Stateless, no DB impact.
- **Token constant (Phase A):** revert the two route files; revert the export in `strapi-admin.ts`. Login + GET keep working; only admin mutations regress.
- **Middleware (Phase C):** restore the dev-fallback path. Admin stays reachable in prod only when the env var is set, which it is.
- **Env deprecation (Phase D):** keep `STRAPI_API_TOKEN_FULL` in `.env.local` until next env rotation. No runtime impact.
- **Two deployable surfaces** (Next.js + Strapi) roll back independently per `openspec/config.yaml` `rules.proposal`.

## Dependencies

- `infrastructure/test-admin.cjs` (already in repo; no new test files).
- Local Docker Compose stack (`web` + `cms` + `db`) running and reachable on the documented ports.
- No new npm packages required for this slice.

## Success Criteria

- `test-admin.cjs` exits 0.
- `apps/web/src/app/admin/layout.tsx` exists and renders the brand header, breadcrumb, and role pill.
- `grep -R "process.env.STRAPI_API_TOKEN" apps/web/src/app/api/admin/products` returns zero hits.
- No file outside this change folder has been modified except `infrastructure/.env.local` and `infrastructure/local-up.ps1`.
- Conventional commit, no `Co-Authored-By`, pushed to `origin/feature/landing-page-initial`.

## Out-of-Scope / Non-Goals

- **CSRF tokens** are explicitly NOT added. The admin uses httpOnly + `sameSite=strict` + 12h TTL — sameSite=strict blocks cross-site form posts in all modern browsers, so a CSRF token surface would add complexity without measurable risk reduction. Re-evaluate if a second admin client (mobile) ships.
- **Role-based UI** (owner vs cliente) is intentionally NOT differentiated beyond what already exists.
- **Image upload / product gallery / reorder / search** are deferred to a follow-up slice.
- **Multi-admin / audit log** are deferred.

## Open Questions

1. Should we mint a separate `STRAPI_INTERNAL_ADMIN_TOKEN` with per-route scopes (Strapi v5 supports per-token permissions) instead of the current single full-access token? **Recommendation: defer.** The current `STRAPI_ADMIN_TOKEN` is fine for v1; per-scope tokens are an over-build until we have more than one admin surface.
2. Should the existing public `STRAPI_API_TOKEN` be rotated to be admin-scoped? **Recommendation: NO.** Keep public read-only. Admin uses `STRAPI_ADMIN_TOKEN`. Two tokens = least-privilege.
3. Mobile sidebar: drawer (slide-in) vs stacked tabs? **Recommendation: stacked tabs for v1** — drawer adds state, focus-trap, and a11y surface area; stacked tabs are keyboard-reachable and zero-JS. Revisit if/when the admin gains more than 4 sections.

## Reviewer Notes

The apply phase MUST surface this block before pushing, so a fresh-context human reviewer can verify the close-out in under 5 minutes:

```
WHAT TO REVIEW (admin-panel-closeout)
======================================

Why this PR exists
------------------
The /admin slice is implemented but POST /api/admin/products returns 401 in production
because two route handlers read STRAPI_API_TOKEN (read-only public) directly, bypassing
the STRAPI_ADMIN_TOKEN fallback already present in lib/admin/strapi-admin.ts. Login +
session GET work because they go through findAdminUserByEmail / findAdminUserByDocumentId
which use the correct adminFetch path.

What changed (8 expected files + 1 new)
---------------------------------------
1. apps/web/src/lib/admin/strapi-admin.ts          — export getStrapiAdminToken()
2. apps/web/src/app/api/admin/products/route.ts    — import shared token
3. apps/web/src/app/api/admin/products/[id]/route.ts — import shared token
4. apps/web/src/app/admin/layout.tsx               — NEW (brand header, sidebar, breadcrumb, skip-link)
5. apps/web/src/app/admin/page.tsx                 — drop in-page header
6. apps/web/src/app/admin/productos/nuevo/page.tsx — drop in-page header
7. apps/web/src/app/admin/productos/[id]/page.tsx  — drop in-page header
8. apps/web/src/middleware.ts                      — fail-closed in production
9. infrastructure/.env.local                       — drop STRAPI_API_TOKEN_FULL

Acceptance gate (run locally)
-----------------------------
  docker cp infrastructure/test-admin.cjs landing-local-web-1:/tmp/test-admin.cjs
  docker exec landing-local-web-1 node /tmp/test-admin.cjs
Expected: every step prints "status: 200" (or 200/201 for POST). Exit 0.

What this PR does NOT do (so reviewer does not expect them)
-----------------------------------------------------------
- No CSRF tokens (intentional; see Out-of-Scope)
- No role-based UI differentiation
- No image upload / gallery / search / reorder
- No new npm packages
- No Strapi bootstrap changes (apps/cms/src/index.ts untouched)
- No public marketing route changes (apps/web/src/app/(marketing)/ untouched)

Risk surface
------------
- ADMIN_SESSION_SECRET rotation invalidates all live sessions (do not rotate here).
- Lighthouse CI not in this budget; SEO validated manually in verify-report.md.
```