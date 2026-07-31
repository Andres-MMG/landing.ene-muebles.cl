# Delta for Admin Session Expiry UX

## ADDED Requirements

### Frontend Requirements

### Requirement: 401 interceptor

A client helper `assertAdminAuth(res)` in `apps/web/src/lib/admin/client.ts` MUST inspect every admin fetch response. For status 401 it MUST invoke `window.location.assign('/admin/login?expired=1')`; it MUST NOT use Next router navigation.

#### Scenario: 401 during product edit
- GIVEN the admin session expires during product editing
- WHEN `/api/admin/products/<id>` returns 401
- THEN the browser navigates to `/admin/login?expired=1`

### Requirement: Expired-session banner

The login form MUST read `expired=1` through `useSearchParams()`. When present, it MUST render `Tu sesión expiró. Vuelve a iniciar sesión para continuar.` above the form with `role="status"`.

#### Scenario: Banner shows after expiry
- GIVEN the browser opens `/admin/login?expired=1`
- WHEN the login form renders
- THEN the expired-session banner is visible above the form
- AND assistive technology can announce it as a status

### Backend Requirements

### Requirement: Admin routes signal expired authentication

Every admin API route MUST preserve a 401 response when authentication is absent or expired so the client helper can apply the expiry flow.

#### Scenario: Expired request remains unauthorized
- GIVEN an admin request has an expired session
- WHEN an admin API endpoint evaluates authentication
- THEN it returns 401 rather than a success or unrelated validation response
