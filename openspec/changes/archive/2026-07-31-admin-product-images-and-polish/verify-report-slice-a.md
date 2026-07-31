# verify-report-slice-a.md

> Slice A of `admin-product-images-and-polish`. Foundations + APIs only.
> No UI changes; Slice B and Slice C consume these endpoints.

## Files created or modified (9 + this report = 10)

| File | Action | What was done |
|---|---|---|
| `apps/web/src/lib/admin/strapi-admin.ts` | Modified | Added 8 helpers (`uploadProductImages`, `reorderProductImages`, `deleteMedia`, `listAdminCategories`, `getAdminCategory`, `createAdminCategory`, `updateAdminCategory`, `deleteAdminCategory`, `getAdminSiteSetting`, `updateAdminSiteSetting`) plus `AdminCategory` and `AdminSiteSetting` types. `getStrapiHeaders()` now only sets `Content-Type: application/json` when the body is a string, so multipart uploads work end-to-end. `StrapiFetchOptions.body` widened to `string \| FormData`. |
| `apps/web/src/lib/admin/client.ts` | New (`'use client'`) | `assertAdminAuth(res)` plus thin `adminPost` / `adminPut` / `adminDelete` / `adminUpload` wrappers. 401 triggers `window.location.assign('/admin/login?expired=1')` (hard reload, not router push). |
| `apps/web/src/app/api/admin/products/[id]/images/route.ts` | New (POST) | Multipart upload. Validates MIME allowlist (jpeg/png/webp → 415), 5 MB per file (→ 413), 8-image cap by reading current count from Strapi first (→ 429). Forwards to Strapi `POST /api/upload?ref=api::product.product&refId=<documentId>&field=images`. |
| `apps/web/src/app/api/admin/products/[id]/images/order/route.ts` | New (PUT) | Zod-validated `{ ids: number[] }` body (1–8 items). Proxies to `PUT /api/products/<documentId>` with `data: { images: { set: ids } }`. |
| `apps/web/src/app/api/admin/media/[id]/route.ts` | New (DELETE) | Proxies `DELETE /api/upload/files/<id>`. Returns 204 on Strapi 204, otherwise passes through. |
| `apps/web/src/app/api/admin/categories/route.ts` | New (GET, POST) | GET lists every category with `populate[image]=true`, `populate[products][count]=true`, sorted by `order:asc`, drafts included. POST creates via `POST /api/categories`; slug auto-generated from name when omitted. |
| `apps/web/src/app/api/admin/categories/[id]/route.ts` | New (GET, PUT, DELETE) | GET reads one with image. PUT updates any of `name / slug / description / order / active / image`. DELETE first checks `populate[products][count]` and returns 409 `Esta categoría tiene productos asociados. Reasignalos antes de eliminar.` when populated. |
| `apps/web/src/app/api/admin/categories/[id]/image/route.ts` | New (POST, DELETE) | POST uploads a single image (≤ 2 MB, jpeg/png/webp) and binds it via the category's `image` relation (also PUTs the category row to make the bind persistent). DELETE clears the relation (sets `image: null`) and best-effort deletes the media row. |
| `apps/web/src/app/api/admin/site-setting/route.ts` | New (GET, PUT) | GET reads with `populate=*`. PUT validates with zod (all fields optional strings, emails must be RFC-valid or empty), strips empty-string fields, forwards to Strapi singleType endpoint `PUT /api/site-setting`. |

## `git diff --stat` (this commit)

```
 apps/web/src/app/api/admin/categories/[id]/image/route.ts        | 149 ++++++++++++
 apps/web/src/app/api/admin/categories/[id]/route.ts              | 140 +++++++++++
 apps/web/src/app/api/admin/categories/route.ts                   |  98 +++++++
 apps/web/src/app/api/admin/media/[id]/route.ts                   |  37 +++
 apps/web/src/app/api/admin/products/[id]/images/order/route.ts    |  58 +++++
 apps/web/src/app/api/admin/products/[id]/images/route.ts         | 121 +++++++++
 apps/web/src/app/api/admin/site-setting/route.ts                 |  82 ++++++
 apps/web/src/lib/admin/client.ts                                 |  60 +++++
 apps/web/src/lib/admin/strapi-admin.ts                            | 195 ++++++++++++++++++-
 openspec/changes/admin-product-images-and-polish/tasks.md        |  18 +-
 openspec/changes/admin-product-images-and-polish/verify-report-slice-a.md | new
```

## Fresh-context review checklist

- [x] `grep -RnE "process\.env\.STRAPI_API_TOKEN" apps/web/src/app/api/admin` → zero hits. Every new route imports `getStrapiAdminToken()` from `@/lib/admin/strapi-admin`.
- [x] `client.ts` starts with `'use client';` directive.
- [x] No Co-Authored-By trailer on the commit.
- [x] `pnpm --filter web typecheck` → exits 0.
- [x] `pnpm --filter web lint` → exits 0 (4 pre-existing warnings in unrelated files; 0 in new files).

## Expected curl tests the user can run

Once logged into the admin panel (so `ene_admin_session` cookie is set):

```bash
# 1. Reject a file > 5 MB
curl -b cookies.txt -X POST \
  -F "files=@./big.bin;type=image/jpeg" \
  http://localhost:3000/api/admin/products/<documentId>/images
# expect: HTTP 413 {"error":"Archivo demasiado grande (máx 5 MB)."}

# 2. Reject a non-image MIME
curl -b cookies.txt -X POST \
  -F "files=@./doc.pdf;type=application/pdf" \
  http://localhost:3000/api/admin/products/<documentId>/images
# expect: HTTP 415 {"error":"Solo se aceptan imágenes (JPEG, PNG, WebP)."}

# 3. Reorder images
curl -b cookies.txt -X PUT \
  -H "Content-Type: application/json" \
  -d '{"ids":[3,1,2]}' \
  http://localhost:3000/api/admin/products/<documentId>/images/order
# expect: HTTP 200, body is Strapi's `{ data: {...} }` for the updated product.

# 4. Delete a media row
curl -b cookies.txt -X DELETE \
  http://localhost:3000/api/admin/media/<id>
# expect: HTTP 204 (no body).

# 5. List categories
curl -b cookies.txt http://localhost:3000/api/admin/categories
# expect: HTTP 200, body is `{ data: [...], meta: {...} }` with counts and images.

# 6. Create a category
curl -b cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Escritorios","order":1,"active":true}' \
  http://localhost:3000/api/admin/categories
# expect: HTTP 201 with `{ data: { id, documentId, slug:"escritorios", ... } }`.

# 7. Delete a populated category (must be 409)
curl -b cookies.txt -X DELETE \
  http://localhost:3000/api/admin/categories/<id>
# expect: HTTP 409 {"error":"Esta categoría tiene productos asociados. Reasignalos antes de eliminar."}

# 8. Read site-setting
curl -b cookies.txt http://localhost:3000/api/admin/site-setting
# expect: HTTP 200 with `{ data: { brandName, tagline, contactEmail, ... } }` or `{ data: null }`.

# 9. Update site-setting
curl -b cookies.txt -X PUT \
  -H "Content-Type: application/json" \
  -d '{"brandName":"Ene Muebles","contactEmail":"hola@ene-muebles.cl"}' \
  http://localhost:3000/api/admin/site-setting
# expect: HTTP 200, subsequent GET echoes the new values.

# 10. Any 401 triggers the client-side redirect
#     (cannot curl-test directly — `assertAdminAuth` runs in the browser.)
```

## TODOs that Slice B / Slice C will resolve

- **Slice B (`apps/web/src/app/admin/productos/ImageGallery.tsx`)** — needs to consume `POST /api/admin/products/[id]/images`, `PUT /api/admin/products/[id]/images/order`, and `DELETE /api/admin/media/[id]` via `adminUpload` / `adminPut` / `adminDelete` wrappers from `client.ts`. Add `<ImageGallery>` to `ProductForm.tsx` (edit mode only). Populate images on `[id]/page.tsx` and redirect after create in `nuevo/page.tsx`.
- **Slice C — Categories pages** — `apps/web/src/app/admin/categorias/{page,nuevo/page,[id]/page}.tsx` + `CategoryForm.tsx` consume `GET/POST/PUT/DELETE /api/admin/categories` and `POST/DELETE /api/admin/categories/[id]/image`.
- **Slice C — Site-setting editor** — `apps/web/src/app/admin/ajustes/{page,SiteSettingForm}.tsx` consume `GET/PUT /api/admin/site-setting`.
- **Slice C — Dashboard** — `apps/web/src/app/admin/{page,ProductList}.tsx` consume `GET /api/admin/categories` for filter + stats; `ProductList` filters in-memory ≤ 50.
- **Slice C — Session-expiry UX** — wire `assertAdminAuth(res)` into `LoginForm.tsx`, `ProductForm.tsx`, `ImageGallery.tsx`, `DeleteProductButton.tsx`, `CategoryForm.tsx`, `SiteSettingForm.tsx`. Render `?expired=1` banner in `apps/web/src/app/admin/login/page.tsx`. Update `apps/web/src/app/admin/layout.tsx` sidebar + mobile stacked tabs to add `Categorías` and `Ajustes`.

## Risks / deviations from design

- None of the design-level decisions were deviated from. The category image DELETE handler does a *best-effort* media delete after clearing the relation; if the media delete fails the relation is already cleared, which is the desired UX. Design §5 did not call this out explicitly but it matches the spirit of the rollback plan.
- `reorderProductImages` sends `images: { set: [...] }` per design §4 ("relation `set`"). The PUT route at `images/order` validates `ids` as `number[]` (numeric media ids) per design §6. Strapi v5 may accept `documentId[]` in some configurations — numeric ids are the safe default that matches existing schemas.
- `createAdminCategory` auto-generates the slug from `name` when the caller omits it (not explicitly required by the spec but matches the proposal's "auto-generated slug" intent for `/admin/categorias/nuevo`).

## Build status

- `pnpm --filter web typecheck` → 0 errors
- `pnpm --filter web lint` → 0 errors (4 unrelated pre-existing warnings)