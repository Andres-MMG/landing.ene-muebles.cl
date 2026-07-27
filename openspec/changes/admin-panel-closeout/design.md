# Design: admin-panel-closeout

## Technical Approach

Replace two route-level `process.env.STRAPI_API_TOKEN` reads with the shared `getStrapiAdminToken()` helper in `lib/admin/strapi-admin.ts`, add the missing `app/admin/layout.tsx`, harden the middleware secret guard, and deprecate `STRAPI_API_TOKEN_FULL`. Maps to specs `admin-auth-token-source`, `admin-panel-ux`, `admin-session-secret`.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Token API | Module-exported free function | `strapi-admin.ts` already exports free functions; DI is over-architect for two callers. |
| `SESSION_SECRET_MIN_LENGTH` home | `lib/admin/session.ts` | Resolves the table-vs-diff inconsistency; matches the middleware import path. |
| Breadcrumb path | Client `<Breadcrumb>` via `usePathname()` | Matches `DeleteProductButton` / `LoginForm` patterns; no middleware change. |
| Mobile nav | Stacked tabs (no drawer) | Drawer adds state + focus trap; tabs are keyboard-reachable, zero-JS. |
| Layout session lookup | `getServerSession()` + `findAdminUserByDocumentId()` per render | Dashboard already does this; not new surface area. |

## Data Flow

```
GET /admin/* → middleware → app/admin/layout.tsx → server page → Strapi (adminFetch)
POST/PUT/DELETE /api/admin/products[/:id] → route handler → fetch(..., Bearer getStrapiAdminToken()) → Strapi
```

Token precedence: `STRAPI_ADMIN_TOKEN` → `STRAPI_API_TOKEN` → `''`. `STRAPI_API_TOKEN_FULL` removed.

## File Changes

| File | Action | Key change |
|---|---|---|
| `apps/web/src/lib/admin/strapi-admin.ts` | Modify | Export `getStrapiAdminToken()`; replace internal `TOKEN`. |
| `apps/web/src/lib/admin/session.ts` | Modify | Export `SESSION_SECRET_MIN_LENGTH = 32`; replace inline literal. |
| `apps/web/src/app/api/admin/products/{route,[id]/route}.ts` | Modify (×2) | Drop file-local `TOKEN`; import `getStrapiAdminToken()`; use on all outbound calls. |
| `apps/web/src/app/admin/layout.tsx` + `Breadcrumb.tsx` | Create | Server layout: skip-link → `<header>` (wordmark · user.name · role pill · logout form) → `<aside>` sidebar (md+) + stacked tabs (sm) → `<main id="admin-main" tabIndex={-1}>` with client `<Breadcrumb>` + `{children}`. |
| `apps/web/src/app/admin/{page,productos/nuevo/page,productos/[id]/page}.tsx` | Modify (×3) | Drop inline `<header>` + `<main>` wrapper. |
| `apps/web/src/middleware.ts` | Modify | Remove dev fallback; import constant; 503 on missing/short secret. |
| `infrastructure/.env.local` | Modify | Drop `STRAPI_API_TOKEN_FULL` line. |
| `openspec/changes/admin-panel-closeout/verify-report.md` | Create | E2E output + SEO checklist + rotation runbook. |

`scripts/local-up.{ps1,sh}` do NOT seed `STRAPI_API_TOKEN_FULL` (only keys in `.env.local.example`). No script change.

## Contracts

```ts
// lib/admin/strapi-admin.ts
export function getStrapiAdminToken(): string {
  return process.env.STRAPI_ADMIN_TOKEN ?? process.env.STRAPI_API_TOKEN ?? '';
}

// lib/admin/session.ts
export const SESSION_SECRET_MIN_LENGTH = 32;
```

Returns `''` (never `undefined`, never throws) so callers pass it directly into `Authorization: Bearer ${…}`.

## Middleware Fail-Closed Diff

```ts
// after (dev fallback string removed in both branches)
import { SESSION_SECRET_MIN_LENGTH } from '@/lib/admin/session';
function getSecret(): Uint8Array | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < SESSION_SECRET_MIN_LENGTH) return null;
  return new TextEncoder().encode(secret!);
}
```

Missing `.env.local` var in dev now fails loudly.

## Testing Strategy

Re-run `infrastructure/test-admin.cjs` via `docker cp` + `docker exec landing-local-web-1`. Add `curl` checks for the manual SEO checklist (Lighthouse CLI deferred — out of budget). Fail-closed: `NODE_ENV=production` stack, unset `ADMIN_SESSION_SECRET`, `curl -i /admin` → 503.

## E2E Acceptance

`GET /admin` (unauth) → 307 → `/admin/login`. `POST /api/admin/login` → 200 + `Set-Cookie: ene_admin_session=…`. `GET /api/admin/session` (cookie) → 200 + `{user:{…}}`. `GET /admin` (auth) → 200. `GET /admin/productos/nuevo` (auth) → 200. `POST /api/admin/products` → 200/201 + `data.documentId`. `PUT /api/admin/products/:id` → 200. `DELETE /api/admin/products/:id` → 200/204. `POST /api/admin/logout` → 200.

## Manual SEO Checklist

1. `curl /sitemap.xml` → 200, canonical URLs only.
2. `curl /robots.txt` → 200, disallows `/api/`.
3. `curl /` → grep `application/ld+json`; validate via Schema.org validator.
4. Product page contains `Product` schema with `name`, `description`, `offers.price`, `offers.priceCurrency`.
5. `curl /admin/login` → 200.
6. `curl -i :4781/cms/api/products/...` → 404 (public CMS not exposed).

## Secret Rotation Runbook

- **Local:** edit `infrastructure/.env.local`, change `ADMIN_SESSION_SECRET`, restart `web`.
- **Coolify:** edit env in Coolify UI, redeploy `web`.
- **Effect:** all live sessions invalidated; redirect to `/admin/login`. Quarterly cadence; not rotated in this PR.

## Migration / Rollout

No data migration. Single deploy of `web` (Strapi untouched). Layout is additive; header removal is a no-op visually. Token fix is silent on reads, unblocks 401 on writes. `STRAPI_ADMIN_TOKEN` already equals `STRAPI_API_TOKEN_FULL` — no rotation.

## Risks & Mitigations

- **Layout adds one Strapi round-trip per render** — already true for dashboard; document in `verify-report.md`.
- **Removing dev fallback breaks dev if env var missing** — dev users hit 503 loudly → fix `.env.local`. Better than silent bypass.
- **Token deprecation drops a var** — `STRAPI_ADMIN_TOKEN` already exists with same value; public `STRAPI_API_TOKEN` untouched.
- **Secret rotation invalidates live sessions** — documented in runbook; not rotated in this PR.

## Acceptance Gate for Apply

`verify-report.md` MUST contain: (1) `test-admin.cjs` raw output (exit 0), (2) manual SEO checklist with PASS/FAIL, (3) secret rotation runbook. If `test-admin.cjs` fails, FAIL the apply run, do not commit. Commit: `chore(admin): close out /admin panel — token source, layout, secret hardening` (no Co-Authored-By).

## Out of Scope (reaffirmed)

No CSRF tokens (httpOnly + sameSite=strict + 12h JWT is sufficient). No role-based UI differentiation. No image upload, gallery, reorder, search, multi-admin, or audit log.
