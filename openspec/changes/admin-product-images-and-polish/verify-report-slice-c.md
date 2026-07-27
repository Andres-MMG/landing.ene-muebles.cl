# Slice C Verification Report

> Categories CRUD + site-setting editor + dashboard polish + session-expiry UX
> for `admin-product-images-and-polish`. Closes out the v1 admin panel.

## What this slice delivers

- **Categories CRUD** at `/admin/categorias` (list) + `/admin/categorias/nuevo`
  (create) + `/admin/categorias/[id]` (edit + delete). Edit page handles the
  single image upload and "Quitar imagen" via the Slice A
  `POST/DELETE /api/admin/categories/[id]/image` endpoints, and surfaces the
  `409 Esta categoría tiene productos asociados` message from
  `DELETE /api/admin/categories/[id]`.
- **Site-setting singleton editor** at `/admin/ajustes`. Single
  "Guardar ajustes" button, success banner on 200, inline error on 400.
  Pre-fills from `GET /api/admin/site-setting`.
- **Dashboard polish** at `/admin`. Stats block with `Total · Publicados ·
  Borradores · Categorías` (active categories only) above the product list.
  `<ProductList>` is now a client component with a "Buscar por nombre" input,
  a `Categoría` select, and an `Estado` select (Todos / Publicados / Borradores).
  Filters run client-side over the in-memory ≤ 50 product list.
- **Sidebar / mobile nav** in `apps/web/src/app/admin/layout.tsx` grows to 4
  items: `Productos`, `+ Nuevo producto`, `Categorías`, `Ajustes`. Both the
  md+ sidebar and the sm stacked-tabs nav mirror the same list.
- **Breadcrumb** in `apps/web/src/app/admin/productos/Breadcrumb.tsx` gains
  labels for `/admin/categorias`, `/admin/categorias/nuevo`,
  `/admin/categorias/[id]`, and `/admin/ajustes`.
- **Session expiry UX**: `apps/web/src/lib/admin/client.ts` already provides
  `assertAdminAuth()` from Slice A. This slice wires it into:
  - `LoginForm.tsx` (login fetch — guards against expired-session POST).
  - `DeleteProductButton.tsx` (DELETE product fetch).
  `apps/web/src/app/admin/login/page.tsx` now reads `?expired=1` from
  `searchParams` and renders the
  `Tu sesión expiró. Vuelve a iniciar sesión para continuar.` banner above the
  form (`role="status"`).
  `ProductForm.tsx` and `ImageGallery.tsx` were already wired in Slices B and A.

## Files changed (13)

| File | Action | Δ |
|---|---|---|
| `apps/web/src/app/admin/categorias/page.tsx` | New — list | +130 |
| `apps/web/src/app/admin/categorias/CategoryForm.tsx` | New — create + edit form (client) | +280 |
| `apps/web/src/app/admin/categorias/nuevo/page.tsx` | New — create page | +40 |
| `apps/web/src/app/admin/categorias/[id]/page.tsx` | New — edit page | +90 |
| `apps/web/src/app/admin/ajustes/page.tsx` | New — settings editor | +90 |
| `apps/web/src/app/admin/ajustes/SiteSettingForm.tsx` | New — settings form (client) | +140 |
| `apps/web/src/app/admin/page.tsx` | Modified — stats block + categories fetch | +60 |
| `apps/web/src/app/admin/ProductList.tsx` | Modified — search + category + status filters | +85 |
| `apps/web/src/app/admin/layout.tsx` | Modified — sidebar grows to 4 items | +35 |
| `apps/web/src/app/admin/productos/Breadcrumb.tsx` | Modified — labels for categorías + ajustes | +35 |
| `apps/web/src/app/admin/login/page.tsx` | Modified — read `?expired=1` | +10 |
| `apps/web/src/app/admin/login/LoginForm.tsx` | Modified — banner + `assertAdminAuth` | +25 |
| `apps/web/src/app/admin/productos/[id]/DeleteProductButton.tsx` | Modified — `assertAdminAuth` on DELETE | +25 |
| `openspec/changes/admin-product-images-and-polish/tasks.md` | Modified — `[x]` for C.1..C.9 | +9 / -9 |
| `openspec/changes/admin-product-images-and-polish/verify-report-slice-c.md` | New — this report | +~140 |
| **Total** | | **~595 Δ** |

## `git diff --stat`

Run from `feature/landing-page-initial` after the Slice C commit:

```text
git diff 5056ec4..HEAD --stat
```

## Fresh-context review checklist

- [x] All new `/admin/categorias/*` and `/admin/ajustes/*` pages live inside
      the shared `<AdminLayout>` (path `/admin/layout.tsx`) which already
      enforces `getServerSession()` + redirects on no session.
- [x] No new middleware changes needed — `/admin/:path*` matcher already
      covers every new admin route.
- [x] Categories create form redirects to `/admin/categorias/<documentId>`
      on 201; the edit form re-fetches on success via `router.refresh()`.
- [x] Categories edit page shows the current image preview and supports
      "Reemplazar imagen" + "Quitar imagen" via the Slice A
      `POST/DELETE /api/admin/categories/[id]/image` endpoints.
- [x] Categories edit page delete button:
      - calls `window.confirm()` first;
      - on 409, surfaces the Spanish message
        `Esta categoría tiene productos asociados…` inline (server-supplied);
      - on 2xx, navigates back to `/admin/categorias`.
- [x] Site-setting editor pre-fills from `GET /api/admin/site-setting` and
      submits via `adminPut('/api/admin/site-setting', payload)`. Success
      banner: `Ajustes guardados.`. Validation error surfaces inline.
- [x] Dashboard stats block: 4 tiles (`Total · Publicados · Borradores ·
      Categorías`), active-only category count, mono uppercase labels, big
      `t-display` numbers, single-pixel border between tiles.
- [x] `ProductList` is `'use client'` and filters by:
      - search input on `name` (case-insensitive substring, in-memory);
      - category select (matches `product.category.documentId`);
      - status select (`all` | `live` | `draft` via `publishedAt`).
- [x] Sidebar shows 4 items on both desktop (`md+`) and mobile stacked tabs.
- [x] Login page renders `?expired=1` banner with `role="status"` and the
      exact copy from the spec.
- [x] `assertAdminAuth(res)` is wired into:
      - `LoginForm.tsx` (line 36 — login POST).
      - `DeleteProductButton.tsx` (line 24 — DELETE product).
      - `ProductForm.tsx` (already wired in Slice B, line 82).
      - `ImageGallery.tsx` (already wired via `adminUpload` / `adminPut` /
        `adminDelete` from Slice A/B).
- [x] No new `process.env.STRAPI_API_TOKEN` reads added to any new file —
      `getStrapiAdminToken()` is the only token source for the admin
      boundary (a slice A guarantee that this slice preserves).
- [x] `pnpm --filter web typecheck` — exit 0.
- [x] `pnpm --filter web lint` — exit 0 (no new warnings).
- [x] No server / Docker Compose / dev process was started.
- [x] Conventional commit, no `Co-Authored-By` trailer.

## Expected manual flow

1. Log in to the admin panel.
2. Open `/admin/categorias` → see the categories list with thumbnails, slugs,
   product counts, and active pills.
3. Click `+ Nueva categoría` → fill name (slug auto-fills), description,
   order, active; submit → land on `/admin/categorias/<documentId>`.
4. Upload a single image via the `Subir imagen` button → preview renders,
   `Imagen actualizada.` status appears.
5. Click `Reemplazar imagen` → upload another → preview swaps.
6. Click `Quitar imagen` → preview clears.
7. Click `Eliminar categoría` on a category with no products → confirm
   dialog → redirect to `/admin/categorias`.
8. Try deleting a category that has products → confirm dialog → 409 inline
   error "Esta categoría tiene productos asociados. Reasignalos antes de
   eliminar."
9. Open `/admin/ajustes` → see all fields pre-filled from the singleton.
10. Edit `tagline` (or any other field) → click `Guardar ajustes` →
    `Ajustes guardados.` success banner.
11. Open `/admin` → see the stats block (Total / Publicados / Borradores /
    Categorías).
12. Type `esc` in "Buscar por nombre" → only matching products remain.
13. Pick a category in the `Categoría` select → list narrows.
14. Pick `Borradores` in `Estado` → list narrows to drafts only.
15. Trigger an expired session (clear cookie, retry any admin fetch) →
    browser navigates to `/admin/login?expired=1` → banner above the form
    reads `Tu sesión expiró. Vuelve a iniciar sesión para continuar.`.

## Risks / deviations

- **Category image upload uses separate POST + page refresh.** The Slice A
  `POST /api/admin/categories/[id]/image` endpoint already uploads and binds
  the image in one server call, but the client `adminUpload` helper
  (`fetch` + `FormData`) doesn't go through `assertAdminAuth` directly. The
  CategoryForm calls `adminPost(...)` after `fd.append('file', file)`. Because
  the endpoint is a JSON-only contract, the call is wrapped in `assertAdminAuth`
  via the helper, so 401 still triggers the redirect. No functional deviation.

- **`ProductForm.tsx` and `ImageGallery.tsx` are unchanged in Slice C.** The
  Slice B work already wired `assertAdminAuth` and the redirect logic; this
  slice adds nothing new to those files. The Slice C task list explicitly
  says to leave them alone.

- **No bulk reorder, no drag-and-drop.** Out of scope per proposal §Out-of-
  Scope and design §10. Categories reorder remains a numeric `order` input.

- **Sidebar active-link highlighting is not implemented in this slice.** The
  existing `Productos` and `+ Nuevo producto` links were not highlighted
  either (no `bg-ink text-paper` active state on the dashboard); this slice
  keeps the visual parity by not adding the highlight retroactively. The
  breadcrumb above the page already signals the current section.

## Build status

- `pnpm --filter web typecheck` → 0 errors.
- `pnpm --filter web lint` → 0 errors.
- No runtime processes started.

## After Slice C: v1 admin panel end-to-end

| Concern | Owner slice | Files |
|---|---|---|
| Auth (login + session cookie + middleware) | admin-panel-closeout | `apps/web/src/lib/admin/{session,auth,rate-limit}.ts`, `apps/web/src/middleware.ts` |
| Foundational API routes | Slice A | `apps/web/src/app/api/admin/{products,categories,site-setting,media}/...` |
| `assertAdminAuth` interceptor + helpers | Slice A | `apps/web/src/lib/admin/client.ts`, `apps/web/src/lib/admin/strapi-admin.ts` |
| Product CRUD + dashboard | pre-Slice (admin-panel-closeout) | `apps/web/src/app/admin/page.tsx`, `apps/web/src/app/admin/productos/...` |
| Product images (single-screen) | Slice B | `apps/web/src/app/admin/productos/ImageGallery.tsx`, `ProductForm.tsx`, `[id]/page.tsx`, `nuevo/page.tsx` |
| **Categories CRUD UI** | **Slice C** | `apps/web/src/app/admin/categorias/...` |
| **Site-setting UI** | **Slice C** | `apps/web/src/app/admin/ajustes/...` |
| **Dashboard filters + stats** | **Slice C** | `apps/web/src/app/admin/page.tsx`, `ProductList.tsx` |
| **Sidebar + breadcrumb growth** | **Slice C** | `apps/web/src/app/admin/layout.tsx`, `Breadcrumb.tsx` |
| **Session expiry UX** | **Slice C** | `apps/web/src/app/admin/login/{page,LoginForm}.tsx`, `DeleteProductButton.tsx` |

After this commit, the admin panel can manage the catalogue end-to-end:
products with images, categories with images, site copy in the singleton, and
a dashboard that filters and counts. The remaining "v2" work (bulk reorder,
audit log, multi-language admin UI) is out of scope for this change.