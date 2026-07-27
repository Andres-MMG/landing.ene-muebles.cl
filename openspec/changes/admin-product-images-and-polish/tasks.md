# Tasks: admin-product-images-and-polish

## Review Workload Forecast

| File | Action | Est. Δ |
|---|---|---|
| `apps/web/src/lib/admin/strapi-admin.ts` | Modify — 8 helpers | +120 |
| `apps/web/src/lib/admin/client.ts` | New — `assertAdminAuth` | +25 |
| `apps/web/src/app/api/admin/products/[id]/images/route.ts` | New — POST upload | +90 |
| `apps/web/src/app/api/admin/products/[id]/images/order/route.ts` | New — PUT reorder | +50 |
| `apps/web/src/app/api/admin/media/[id]/route.ts` | New — DELETE | +35 |
| `apps/web/src/app/api/admin/categories/route.ts` | New — GET, POST | +85 |
| `apps/web/src/app/api/admin/categories/[id]/route.ts` | New — GET, PUT, DELETE | +85 |
| `apps/web/src/app/api/admin/categories/[id]/image/route.ts` | New — POST, DELETE | +60 |
| `apps/web/src/app/api/admin/site-setting/route.ts` | New — GET, PUT | +50 |
| `apps/web/src/app/admin/productos/ImageGallery.tsx` | New — client gallery | +220 |
| `apps/web/src/app/admin/productos/ProductForm.tsx` | Modify — embed gallery | +90 |
| `apps/web/src/app/admin/productos/[id]/page.tsx` | Modify — populate images | +5 |
| `apps/web/src/app/admin/productos/nuevo/page.tsx` | Modify — redirect after create | +15 |
| `apps/web/src/app/admin/categorias/page.tsx` | New — list | +90 |
| `apps/web/src/app/admin/categorias/nuevo/page.tsx` | New — create form | +85 |
| `apps/web/src/app/admin/categorias/[id]/page.tsx` | New — edit form | +85 |
| `apps/web/src/app/admin/ajustes/page.tsx` | New — settings editor | +90 |
| `apps/web/src/app/admin/page.tsx` | Modify — stats block | +30 |
| `apps/web/src/app/admin/ProductList.tsx` | Modify — search + filters | +50 |
| `apps/web/src/app/admin/layout.tsx` | Modify — sidebar grows | +20 |
| `apps/web/src/app/admin/login/LoginForm.tsx` | Modify — `assertAdminAuth` + banner | +30 |
| `apps/web/src/app/admin/login/page.tsx` | Modify — read `useSearchParams` | +5 |
| `openspec/changes/admin-product-images-and-polish/verify-report.md` | New | +80 |
| **Total** | | **~1 510 Δ** |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending (orchestrator will pause and ask user)
800-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| Slice A | Foundations + APIs + `assertAdminAuth` | PR 1 | ~520 Δ; base `main` |
| Slice B | Image gallery headline | PR 2 | ~340 Δ; base Slice A branch |
| Slice C | Categories + Settings + Dashboard + Session expiry UX | PR 3 | ~650 Δ; base Slice B branch |

## Slice A — Foundations + APIs (~520 Δ)

- [x] A.1 Add 8 helpers to `strapi-admin.ts` (uploadFile, deleteMedia, listAdminCategories, getAdminCategory, updateAdminCategory, deleteAdminCategory, getAdminSiteSetting, updateAdminSiteSetting)
  - File: `apps/web/src/lib/admin/strapi-admin.ts`
  - Acceptance: 8 helpers exported; `pnpm --filter web typecheck` exits 0.
  - Evidence: `grep -n "^export " strapi-admin.ts` lists 8 new helpers.
- [x] A.2 Add `POST /api/admin/products/[id]/images` (multipart, 5 MB / MIME / 8-cap)
  - File: `apps/web/src/app/api/admin/products/[id]/images/route.ts`
  - Acceptance: 413/415/429/200 per design §5; uses `getStrapiAdminToken()`.
  - Evidence: `curl -F "files=@big.bin" /api/admin/products/<id>/images` returns 413.
- [x] A.3 Add `PUT /api/admin/products/[id]/images/order` (relation `set`)
  - File: `apps/web/src/app/api/admin/products/[id]/images/order/route.ts`
  - Acceptance: PUT `{ ids: [...] }` returns 200; non-array body returns 400.
  - Evidence: `curl -X PUT -d '{"ids":["a","b"]}'` returns 200.
- [x] A.4 Add `DELETE /api/admin/media/[id]`
  - File: `apps/web/src/app/api/admin/media/[id]/route.ts`
  - Acceptance: 204 on success; 404 on missing id.
  - Evidence: `curl -X DELETE /api/admin/media/<id>` returns 204.
- [x] A.5 Add `GET` (list w/ count) and `POST` (create) for categories
  - File: `apps/web/src/app/api/admin/categories/route.ts`
  - Acceptance: list returns `{ data: CategoryWithCount[] }`; create returns 201.
  - Evidence: `curl /api/admin/categories` returns JSON array with counts.
- [x] A.6 Add `GET / PUT / DELETE` for category by id (409 on populated)
  - File: `apps/web/src/app/api/admin/categories/[id]/route.ts`
  - Acceptance: 409 when category has products; else 200.
  - Evidence: `curl -X DELETE /api/admin/categories/<id>` → 409 with Spanish message.
- [x] A.7 Add `POST / DELETE` for category single image
  - File: `apps/web/src/app/api/admin/categories/[id]/image/route.ts`
  - Acceptance: 2 MB cap, MIME allowlist; returns media id.
  - Evidence: `curl -F "file=@cat.jpg" /api/admin/categories/<id>/image` returns 201.
- [x] A.8 Add `GET / PUT` for site-setting singleton
  - File: `apps/web/src/app/api/admin/site-setting/route.ts`
  - Acceptance: PUT persists; round-trip GET echoes the new value.
  - Evidence: `curl -X PUT -d '{"siteName":"X"}'` → GET returns `"siteName":"X"`.
- [x] A.9 Add `assertAdminAuth(res)` client helper
  - File: `apps/web/src/lib/admin/client.ts`
  - Acceptance: 401 → `window.location.assign('/admin/login?expired=1')`; uses `assign`, not `push`.
  - Evidence: `grep -n "window.location.assign" client.ts` returns 1.

## Slice B — Image gallery headline (~340 Δ)

- [x] B.1 Create `ImageGallery` (tiles, uploader, up/down, delete; optimistic snapshot+rollback)
  - File: `apps/web/src/app/admin/productos/ImageGallery.tsx`
  - Acceptance: `assertAdminAuth` wired on 3 endpoints; rollback on non-2xx; max 8 enforced in UI.
  - Evidence: `grep -n "assertAdminAuth" ImageGallery.tsx` returns 3.
- [x] B.2 Embed `<ImageGallery>` into `ProductForm` (edit mode only)
  - File: `apps/web/src/app/admin/productos/ProductForm.tsx`
  - Acceptance: gallery renders below Comercial fieldset; image fetches wrapped.
  - Evidence: `grep -n "ImageGallery" ProductForm.tsx` returns ≥ 1.
- [x] B.3 Populate images in product edit page
  - File: `apps/web/src/app/admin/productos/[id]/page.tsx`
  - Acceptance: `populate[images]=true` query string; `initialImages` passed to ProductForm.
  - Evidence: `grep -n "populate\[images\]" page.tsx` returns 1.
- [x] B.4 Create-then-redirect in `/admin/productos/nuevo`
  - File: `apps/web/src/app/admin/productos/nuevo/page.tsx`
  - Acceptance: on 201, `router.push('/admin/productos/' + documentId)`.
  - Evidence: `grep -n "router.push.*productos" nuevo/page.tsx` returns 1.

## Slice C — Categories + Settings + Dashboard + Session expiry UX (~650 Δ)

- [x] C.1 List page at `/admin/categorias`
  - File: `apps/web/src/app/admin/categorias/page.tsx`
  - Acceptance: rows show name, slug, image, active pill, product count.
  - Evidence: `GET /admin/categorias` returns 200; rows visible.
- [x] C.2 Create form at `/admin/categorias/nuevo`
  - File: `apps/web/src/app/admin/categorias/nuevo/page.tsx`
  - Acceptance: posts to `/api/admin/categories`; redirects to `/admin/categorias/[id]`.
  - Evidence: `grep -n "POST.*categories" nuevo/page.tsx` returns 1.
- [x] C.3 Edit form at `/admin/categorias/[id]`
  - File: `apps/web/src/app/admin/categorias/[id]/page.tsx`
  - Acceptance: replaces image via A.7, removes via `Sin imagen` checkbox; PUT updates category.
  - Evidence: `grep -n "DELETE.*media\|Sin imagen" page.tsx` returns ≥ 1.
- [x] C.4 Delete confirmation with 409 messaging
  - File: `apps/web/src/app/admin/categorias/[id]/page.tsx`
  - Acceptance: `confirm()` before DELETE; API 409 surfaces Spanish message.
  - Evidence: `grep -n "window.confirm" page.tsx` returns 1.
- [x] C.5 Singleton editor at `/admin/ajustes`
  - File: `apps/web/src/app/admin/ajustes/page.tsx`
  - Acceptance: pre-fills from GET; PUTs via `Guardar ajustes`; success banner.
  - Evidence: `grep -n "PUT.*site-setting" page.tsx` returns 1.
- [x] C.6 Stats block on dashboard
  - File: `apps/web/src/app/admin/page.tsx`
  - Acceptance: `Total · Publicados · Borradores · Categorías` rendered; counts active only.
  - Evidence: `grep -n "Publicados\|Borradores" page.tsx` returns ≥ 2.
- [x] C.7 Search + filters in `ProductList`
  - File: `apps/web/src/app/admin/ProductList.tsx`
  - Acceptance: search (≤50), category select, status select (Todos/Publicados/Borradores).
  - Evidence: `grep -n "Buscar\|Categoría\|Estado" ProductList.tsx` returns 3.
- [x] C.8 Sidebar + DeleteProductButton wrap + Breadcrumb labels
  - File: `apps/web/src/app/admin/layout.tsx`, `apps/web/src/app/admin/productos/DeleteProductButton.tsx`, `apps/web/src/app/admin/productos/Breadcrumb.tsx`
  - Acceptance: `Categorías` + `Ajustes` links present; DELETE wrapped; new breadcrumb labels.
  - Evidence: `grep -n "Categorías\|Ajustes" layout.tsx` returns 2.
- [x] C.9 Login banner + LoginForm assertion
  - File: `apps/web/src/app/admin/login/page.tsx`, `apps/web/src/app/admin/login/LoginForm.tsx`
  - Acceptance: `?expired=1` renders banner with `role="status"`; `assertAdminAuth` on login fetch.
  - Evidence: `grep -n "expired=1\|useSearchParams" login/page.tsx` returns ≥ 1.

## Spec ↔ Task Mapping

| Spec requirement | Task |
|---|---|
| `admin-product-images::Single-screen editor` | B.1, B.2 |
| `admin-product-images::Create-then-edit redirect` | B.4 |
| `admin-product-images::Image gallery lists current images` | B.1, B.3 |
| `admin-product-images::Per-image delete` | B.1, A.4 |
| `admin-product-images::Upload control` | B.1, A.2 |
| `admin-product-images::Reject oversized file` | A.2 |
| `admin-product-images::Reject non-image MIME` | A.2 |
| `admin-product-images::Reorder with up/down arrows` | B.1, A.3 |
| `admin-product-images::Max 8 images per product` | A.2, B.1 |
| `admin-categories-crud::List` | C.1, A.5 |
| `admin-categories-crud::Create` | C.2, A.5 |
| `admin-categories-crud::Edit` | C.3, A.5, A.7 |
| `admin-categories-crud::Delete with confirmation` | C.4, A.6 |
| `admin-site-setting::Form` | C.5, A.8 |
| `admin-dashboard-polish::Search` | C.7 |
| `admin-dashboard-polish::Category filter` | C.7 |
| `admin-dashboard-polish::Status filter` | C.7 |
| `admin-dashboard-polish::Stats block` | C.6 |
| `admin-session-expiry-ux::401 interceptor` | C.8, A.9 |
| `admin-session-expiry-ux::Banner` | C.9 |

## Acceptance Evidence per Slice (verify-report.md addendum)

### Slice A
- `curl -F "files=@six_mb.jpg" /api/admin/products/<id>/images` → 413 `Archivo demasiado grande`
- `curl -F "files=@doc.pdf" /api/admin/products/<id>/images` → 415 `Solo se aceptan imágenes`
- `curl -X PUT -d '{"ids":["a","b"]}' /api/admin/products/<id>/images/order` → 200
- `curl -X DELETE /api/admin/media/<id>` → 204
- `curl -X DELETE /api/admin/categories/<id>` (with products) → 409 `Esta categoría tiene productos asociados.`
- `curl -X PUT -d '{"siteName":"X"}' /api/admin/site-setting` → 200; subsequent GET echoes

### Slice B
- Open `/admin/productos/<id>` with 3+ images → 3 tiles render in Strapi order
- `↑` on tile 2 → API 200, tile moves up
- Delete tile 1 → 204, tile disappears
- Upload 1 JPEG ≤5 MB → 200, new tile appears
- Submit empty `/admin/productos/nuevo` → 201 → redirect to `/admin/productos/<newId>` with empty gallery

### Slice C
- `/admin/categorias` → 200, list renders with counts
- Create category → 201, redirect to `/admin/categorias/<id>`
- Edit + upload image → PUT succeeds, image swapped
- Delete with products → 409 message shown
- `/admin/ajustes` → form pre-filled; PUT → 200, success banner
- Trigger 401 → `/admin/login?expired=1` → banner visible

## Rollback Plan

- **Slice A**: revert API routes + helpers; admin mutations stop working; UI still loads.
- **Slice B**: revert `ImageGallery`, `ProductForm`, `[id]/page.tsx`, `nuevo/page.tsx`; admin reverts to text-only form.
- **Slice C**: revert the 4 new pages + sidebar + dashboard polish + login banner; admin loses category/settings/dashboard polish; session-expiry UX reverts to misleading error.
