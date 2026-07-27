# Delta Spec: admin-auth-token-source

## Purpose

Establish a single source of truth for the Strapi admin-scoped API token used by every `/api/admin/*` Next.js route handler. Today only `lib/admin/strapi-admin.ts` applies the `STRAPI_ADMIN_TOKEN ?? STRAPI_API_TOKEN` fallback; two route files read `process.env.STRAPI_API_TOKEN` directly and therefore send the read-only public token to Strapi on writes, causing 401s on `POST`, `PUT`, and `DELETE`.

## Requirements

### Requirement: Single token source of truth

The system MUST expose `getStrapiAdminToken()` from `apps/web/src/lib/admin/strapi-admin.ts`. The helper MUST return `process.env.STRAPI_ADMIN_TOKEN` when set and non-empty, MUST fall back to `process.env.STRAPI_API_TOKEN` when the first is unset or empty, and MUST return the empty string (NOT undefined, NOT throw) when neither is set.

#### Scenario: token resolves from STRAPI_ADMIN_TOKEN

- GIVEN `process.env.STRAPI_ADMIN_TOKEN` is set to a non-empty string
- WHEN `getStrapiAdminToken()` is called
- THEN it returns that value

#### Scenario: token falls back to STRAPI_API_TOKEN

- GIVEN `process.env.STRAPI_ADMIN_TOKEN` is unset or empty
- AND `process.env.STRAPI_API_TOKEN` is set
- WHEN `getStrapiAdminToken()` is called
- THEN it returns `STRAPI_API_TOKEN`

#### Scenario: token returns empty string when neither is set

- GIVEN both env vars are unset
- WHEN `getStrapiAdminToken()` is called
- THEN it returns the empty string (no throw, no undefined)

### Requirement: All admin route handlers use the shared helper

Every `/api/admin/*` route file that issues outbound requests to Strapi MUST import `getStrapiAdminToken()` from `lib/admin/strapi-admin`. They MUST NOT read `process.env.STRAPI_ADMIN_TOKEN` or `process.env.STRAPI_API_TOKEN` directly.

#### Scenario: products POST uses the helper

- WHEN a POST to `/api/admin/products` is issued
- THEN the route sends `Authorization: Bearer ${getStrapiAdminToken()}` to Strapi

#### Scenario: products PUT uses the helper

- WHEN a PUT to `/api/admin/products/:id` is issued
- THEN the route sends `Authorization: Bearer ${getStrapiAdminToken()}` to Strapi

#### Scenario: products DELETE uses the helper

- WHEN a DELETE to `/api/admin/products/:id` is issued
- THEN the route sends `Authorization: Bearer ${getStrapiAdminToken()}` to Strapi

#### Scenario: no direct env reads remain

- WHEN `grep -R "process.env.STRAPI_API_TOKEN" apps/web/src/app/api/admin` runs
- THEN the result is empty

### Requirement: Admin mutations succeed against Strapi

When the operator issues a write against Strapi via the Next.js admin panel, Strapi MUST return a 2xx status. A 401 or 403 returned by Strapi indicates the route bypassed the admin token and used the read-only public token — that is a regression.

#### Scenario: create product returns 2xx

- GIVEN an authenticated admin user submits a valid product payload
- WHEN the form POSTs to `/api/admin/products`
- THEN the response status is 200 or 201
- AND `data.documentId` is set

#### Scenario: update product returns 200

- GIVEN an authenticated admin user submits a valid update
- WHEN the form PATCHes `/api/admin/products/:id`
- THEN the response status is 200
- AND the change persists in Strapi

#### Scenario: delete product returns 2xx

- GIVEN an authenticated admin user requests deletion
- WHEN the form DELETEs `/api/admin/products/:id`
- THEN the response status is 200 or 204
- AND the record is removed from Strapi