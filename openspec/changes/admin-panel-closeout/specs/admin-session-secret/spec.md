# Delta Spec: admin-session-secret

## Purpose

The admin session secret MUST be enforced consistently. Today `lib/admin/session.ts` throws if the secret is shorter than 32 characters; `apps/web/src/middleware.ts` silently falls back to a dev-only string in non-production. That asymmetry is a hidden foot-gun if the env var is missing in production. This delta removes the silent fallback from the middleware path so both code paths agree.

## Requirements

### Requirement: Middleware fails closed in production

`apps/web/src/middleware.ts` MUST return HTTP 503 for any `/admin/*` or `/api/admin/*` request when `ADMIN_SESSION_SECRET` is unset or shorter than 32 characters AND `NODE_ENV === 'production'`. In dev (`NODE_ENV !== 'production'`), the existing dev-only fallback string MAY remain for local DX.

#### Scenario: production with missing secret returns 503

- GIVEN `NODE_ENV=production`
- AND `ADMIN_SESSION_SECRET` is unset
- WHEN a GET to `/admin` is issued
- THEN the response status is 503
- AND the body is `Admin disabled: missing secret`

#### Scenario: production with short secret returns 503

- GIVEN `NODE_ENV=production`
- AND `ADMIN_SESSION_SECRET` is shorter than 32 characters
- WHEN a GET to `/api/admin/session` is issued
- THEN the response status is 503

#### Scenario: dev with missing secret keeps working

- GIVEN `NODE_ENV=development`
- AND `ADMIN_SESSION_SECRET` is unset
- WHEN any `/admin/*` request is issued
- THEN the middleware proceeds (current behavior, dev DX preserved)

### Requirement: Secret length threshold is consistent

Both `lib/admin/session.ts` and `middleware.ts` MUST use the same minimum length (32 characters) and MUST apply the same rule (reject when missing OR shorter than the threshold in production).

#### Scenario: shared threshold constant

- GIVEN `lib/admin/session.ts` exports `SESSION_SECRET_MIN_LENGTH`
- WHEN `middleware.ts` needs the threshold
- THEN it imports the constant from `lib/admin/session.ts` rather than redefining it

#### Scenario: future threshold change applies to both

- GIVEN the minimum length needs to change in the future
- WHEN a developer updates `SESSION_SECRET_MIN_LENGTH` in one file
- THEN both `lib/admin/session.ts` and `middleware.ts` pick up the new value without further edits

### Requirement: Secret rotation procedure is documented

`openspec/changes/admin-panel-closeout/verify-report.md` MUST include a "Secret rotation" section that documents: rotating `ADMIN_SESSION_SECRET` invalidates ALL active admin sessions; users must log in again. The section MUST also document the command to rotate in Coolify plus the local `.env.local` pattern.

#### Scenario: rotation guidance present

- GIVEN `verify-report.md` is produced
- WHEN a reviewer reads the "Secret rotation" section
- THEN it states that rotation invalidates all live sessions
- AND it documents the Coolify rotation command
- AND it documents the local `.env.local` rotation pattern