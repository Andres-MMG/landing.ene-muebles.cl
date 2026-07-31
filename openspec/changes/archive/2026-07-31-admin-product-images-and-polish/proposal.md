# Proposal: admin-product-images-and-polish

## Intent

Close the remaining gaps in the `/admin` slice so the owner can actually run a furniture catalog end-to-end: edit a product and its image gallery on **one screen** (no separate image page, no wizard, no modal), manage categories and the site-setting singleton from the same panel, search/filter on the dashboard, and surface a clean session-expiry UX. Public UI copy is Spanish; SDD artifacts are English per Language Domain Contract.

## Scope

### In Scope

**A. Product images on a single screen**
- `apps/web/src/app/admin/productos/ProductForm.tsx` — insert a `<ProductImages>` block inline below the *Comercial* fieldset, above the save bar. `ProductForm` stays the parent; on save it dispatches to `/api/admin/products` (POST/PUT) for fields and triggers `/api/admin/products/[id]/images` (POST) + `/api/admin/media/[id]` (DELETE) + `/api/admin/products/[id]/images/order` (PUT) for image changes. After first create, `/admin/productos/nuevo` redirects to `/admin/productos/[id]` (two-step UX: blank → editor → upload).
- `apps/web/src/app/admin/productos/ImageGallery.tsx` (NEW, `'use client'`) — gallery with thumbnails, per-image delete button, up/down arrow reorder, and a `<input type="file" multiple>` uploader. Owns its pending state and dispatches the three image routes.
- `apps/web/src/app/admin/productos/[id]/page.tsx` — change `populate=category` to `populate[category]=true&populate[images]=true` so the editor receives the current image list.
- `apps/web/src/app/api/admin/products/[id]/images/route.ts` (NEW) — POST `multipart/form-data`; server validates max 8 images total, ≤ 5 MB per file, mime `image/jpeg|png|webp`; forwards each file to `POST /api/upload?ref=api::product.product:<documentId>&refId=<documentId>&field=images` using `getStrapiAdminToken()`.
- `apps/web/src/app/api/admin/products/[id]/images/order/route.ts` (NEW) — PUT `{ ids: string[] }`; sets order by re-issuing `PUT /api/products/:documentId` with `images: [id1, id2, ...]` (Strapi v5 stores order on the relation row, not on the media row).
- `apps/web/src/app/api/admin/media/[id]/route.ts` (NEW) — DELETE proxies `DELETE /api/upload/files/<id>` to Strapi, returns 204.
- `apps/web/src/lib/admin/strapi-admin.ts` — add `uploadFile(formData, ref, refId, field)` and `deleteMedia(id)` helpers (both route through `adminFetch` so the admin token is reused).

**B. Categories CRUD (single screen per category)**
- `apps/web/src/app/admin/categorias/page.tsx` (NEW) — list (name + product count + active pill) + "Nueva categoría" button.
- `apps/web/src/app/admin/categorias/nuevo/page.tsx` (NEW) — create form.
- `apps/web/src/app/admin/categorias/[id]/page.tsx` (NEW) — edit form with single image upload + delete + numeric `order` input.
- `apps/web/src/app/api/admin/categories/route.ts` (NEW) — GET (list, with product count) + POST (create).
- `apps/web/src/app/api/admin/categories/[id]/route.ts` (NEW) — GET, PUT, DELETE; uses `getStrapiAdminToken()`.
- `apps/web/src/lib/admin/strapi-admin.ts` — add `listAdminCategories`, `getAdminCategory`, `updateAdminCategory`, `deleteAdminCategory`.
- `apps/web/src/app/admin/layout.tsx` — add `Categorías` link to the sidebar and the stacked-tabs nav.

**C. Site-setting singleton editor**
- `apps/web/src/app/admin/ajustes/page.tsx` (NEW) — form for `site-setting` singleton: `siteName`, `tagline`, `contactEmail`, `contactPhone`, `whatsappNumber`, `address`, `socialLinks` (JSON textarea), `businessHours`, `aboutText`, `heroImage` upload. Single save button.
- `apps/web/src/app/api/admin/site-setting/route.ts` (NEW) — GET + PUT proxies using `getStrapiAdminToken()`. Strapi uses `PUT /api/site-setting` (no id).

**D. Dashboard UX polish**
- `apps/web/src/app/admin/ProductList.tsx` — add: (i) search input (name, client-side, in-memory, list ≤ 50), (ii) category filter dropdown, (iii) status filter (Todos / Publicados / Borradores).
- `apps/web/src/app/admin/page.tsx` — replace the count line with a small stats block: `Total · Publicados · Borradores · Categorías`. Pull from `listProducts()` + a new `listCategories()` call.
- `apps/web/src/app/admin/layout.tsx` — add `Categorías` and `Ajustes` to both nav surfaces.

**E. Login-session expiry UX**
- `apps/web/src/lib/admin/session.ts` — no TTL change; add a doc comment noting the 12h expiry.
- `apps/web/src/lib/admin/client.ts` (NEW) — `assertAdminAuth(res)` helper that calls `window.location.assign('/admin/login?expired=1')` on any 401 from an admin route. Full-page nav (not `router.push`) to avoid redirect-loop risk.
- `apps/web/src/app/admin/login/page.tsx` + `LoginForm.tsx` — read `?expired=1` from `searchParams`; render a "Tu sesión expiró. Vuelve a iniciar sesión." banner above the form. Replace the misleading "Email o contraseña inválidos." message with a session-aware one.
- `apps/web/src/app/admin/productos/ProductForm.tsx`, `apps/web/src/app/admin/productos/ImageGallery.tsx`, `apps/web/src/app/admin/productos/[id]/DeleteProductButton.tsx` — wrap their existing `fetch` calls with `assertAdminAuth(res)`.

### Out of Scope

- Server-side image cropping/resizing (Strapi generates formats automatically).
- Bulk upload via ZIP / CSV.
- Drag-and-drop reorder for images (v1 uses up/down arrow buttons).
- Audit log of edits.
- Multi-language admin UI (Spanish only).
- Bulk categories reorder UI (numeric `order` input only for v1).
- Any change to the public marketing site (catalog, hero, SEO) — already shipped.
- `STRAPI_ADMIN_TOKEN` export shape (do not touch `getStrapiAdminToken()`).
- Any file under `openspec/changes/landing-page-initial/*` or `openspec/changes/admin-panel-closeout/*`.
- Coolify, deploy scripts, `local-up.ps1` / `local-up.sh`.

## Capabilities

### New Capabilities
- `admin-product-images`: image gallery + upload + delete + reorder for products, on the same screen as the form.
- `admin-categories-crud`: CRUD for categories with single image per category.
- `admin-site-setting`: singleton editor for `site-setting`.
- `admin-dashboard-polish`: search, category filter, status filter, stats block on the dashboard.
- `admin-session-expiry-ux`: `assertAdminAuth()` client helper + `?expired=1` banner on the login page.

### Modified Capabilities
- `admin-panel-ux`: sidebar gains two items (Categorías, Ajustes); mobile stacked-tabs nav grows.
- `admin-auth-token-source`: the new `/api/admin/products/[id]/images`, `/api/admin/categories/*`, and `/api/admin/site-setting` routes use `getStrapiAdminToken()`.

## Approach

| Phase | Deliverable | Files | Est. Δ lines |
| --- | --- | --- | --- |
| F1 | `strapi-admin.ts` helpers: `uploadFile`, `deleteMedia`, `listAdminCategories`, `getAdminCategory`, `updateAdminCategory`, `deleteAdminCategory`, `getAdminSiteSetting`, `updateAdminSiteSetting` | 1 | +120 |
| F2 | `apps/web/src/lib/admin/client.ts` — `assertAdminAuth(res)` | 1 (new) | +25 |
| F3 | API routes for images + categories + site-setting (8 files) | 8 (new) | +260 |
| F4 | `ImageGallery.tsx` (new) + integration into `ProductForm.tsx` + populate fix in `[id]/page.tsx` + `/nuevo` redirect after create | 3 (1 new) | +220 |
| F5 | Categories CRUD pages (3 pages + 1 form component + count helper) | 4 (3 new) | +260 |
| F6 | Site-setting editor (1 page + form component) | 2 (1 new) | +90 |
| F7 | Dashboard search + filters + stats in `ProductList.tsx` + `page.tsx` | 2 | +80 |
| F8 | Sidebar layout update + session-expiry UX in `LoginForm.tsx` + `assertAdminAuth` use in 3 client components | 4 (1 new) | +90 |
| **Total** | | **~25 files (15 new)** | **~1 145 Δ** |

Forecast guards (plain text, required by `sdd-phase-common` §E):

```
Decision needed before apply: Yes (forecast > 800-line budget)
Chained PRs recommended: Yes
Chain strategy: pending (user chose C1 ask-on-risk; this proposal triggers the guard)
800-line budget risk: High
```

**The apply phase MUST stop after the tasks phase and ask the user to choose**: chained PRs OR `size:exception` for a single ~1 145-line PR. Default recommendation: chain as **(PR1) F1+F2+F3+F8** (foundations + session-expiry UX) → **(PR2) F4** (image gallery on product screen, the headline feature) → **(PR3) F5+F6+F7** (categories + site-setting + dashboard polish). Each PR has a clear start/finish, can ship independently, and rolls back without breaking the others.

## Acceptance Criteria

- [ ] **F1**: `uploadFile`, `deleteMedia`, `listAdminCategories`, `getAdminCategory`, `updateAdminCategory`, `deleteAdminCategory`, `getAdminSiteSetting`, `updateAdminSiteSetting` all exported from `apps/web/src/lib/admin/strapi-admin.ts`.
- [ ] **F3**: `apps/web/src/app/api/admin/products/[id]/images` route exists, uses `getStrapiAdminToken()`, rejects files > 5 MB with 413, rejects non-image MIME with 415, enforces 8-image cap with 422.
- [ ] **F3**: `apps/web/src/app/api/admin/categories/[id]` and `/api/admin/site-setting` exist and use `getStrapiAdminToken()`.
- [ ] **F4**: `ImageGallery` renders current images with delete button + up/down arrows; upload adds an image and refreshes the gallery; reordering persists across page reload.
- [ ] **F4**: creating a new product redirects to `/admin/productos/[id]` so the user can upload images immediately.
- [ ] **F5**: `apps/web/src/app/admin/categorias/page.tsx` lists categories from Strapi with the admin token; creating a category from the admin shows it on the public catalog within the existing revalidation window.
- [ ] **F6**: `apps/web/src/app/admin/ajustes/page.tsx` shows the current `site-setting`; saving updates Strapi; the public site picks up the change on next request.
- [ ] **F7**: dashboard search input filters in real time; category dropdown filters by category id; status filter (Todos / Publicados / Borradores) works; stats block shows the four numbers.
- [ ] **F8**: any 401 from `/api/admin/*` triggers `window.location.assign('/admin/login?expired=1')`; login page renders the "Tu sesión expiró" banner when `?expired=1` is present.
- [ ] All new API routes import `getStrapiAdminToken()`; no direct `process.env.STRAPI_API_TOKEN` reads added.
- [ ] `apps/web/src/app/(marketing)/*` untouched; `apps/cms/**` untouched (schemas already cover the fields).

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Strapi v5 upload endpoint signature (`POST /api/upload` + `?ref=&refId=&field=`) may differ from v4. | Med | Verify with `context7_query-docs` against the `strapi-v5-expert` skill in F1; if the signature differs, adjust the helper before F4. |
| Image order endpoint — Strapi v5 may not allow `PUT /api/upload` to set order; ordering may live on the relation row only. | Med | Spec phase verifies: fallback is `PUT /api/products/:id` with `images: [id1, id2, ...]`. Document the actual endpoint in `design.md`. |
| 401 interceptor could cause a redirect loop if the auth check uses the same fetcher that triggers the redirect. | Low | Use `window.location.assign('/admin/login?expired=1')` (full page nav), not `router.push`. The login page does not call any admin route on mount. |
| Categories `image` upload must clear the previous relation on Strapi side. | Med | On PUT, send `{ image: <newId> | null }` explicitly; do not rely on a partial update. |
| New admin surfaces (`/admin/categorias/*`, `/admin/ajustes`) must hit the middleware gate like the existing `/admin/*` routes. | Low | The middleware matcher already covers every `/admin/*` path; no middleware change required. |
| Two-step create UX (create blank → land on editor → upload) is a behavior change vs the current single-page form. | Med | Document in the F4 commit message; verify in `verify-report.md` that the second step works end-to-end. |
| Forecast ~1 145 Δ exceeds the 800-line PR-review budget. | High | Apply phase MUST pause and ask the user for chain vs exception (see Approach forecast guards). |

## Rollback Plan

- **F1 / F2** (helpers + client util): revert the two files. No DB impact, no public impact.
- **F3** (API routes): delete the new route files. Public + admin keep working on the existing CRUD.
- **F4** (image gallery): revert `ImageGallery.tsx`, undo the `ProductForm` integration, revert the `populate` change in `[id]/page.tsx`, revert the `/nuevo` redirect. Admin product CRUD falls back to the previous "no images" state.
- **F5** (categories): delete the new admin pages + API routes + helper exports. Public catalog still reads categories from Strapi via the public token.
- **F6** (site-setting): delete the new admin page + API route. Public site keeps the existing values.
- **F7** (dashboard polish): revert `ProductList.tsx` and `page.tsx`. Dashboard goes back to the unfiltered list.
- **F8** (session-expiry UX): revert `LoginForm.tsx` + `client.ts`; revert the 3 call-site changes. 401s revert to the misleading "Email o contraseña inválidos." path (status quo, not worse than today).
- Two deployable surfaces (Next.js + Strapi) roll back independently per `openspec/config.yaml` `rules.proposal`.

## Dependencies

- Strapi v5 admin token already in `getStrapiAdminToken()` (no new env).
- Strapi `product.images` (media multiple), `category.image` (media single), `site-setting` (singleType) schemas already exist in `apps/cms/src/api/**` — no migration required.
- Local Docker Compose stack (`web` + `cms` + `db`) running and reachable on the documented ports.
- No new npm packages required.

## Success Criteria

- All 8 acceptance rows checked in `verify-report.md`.
- `getStrapiAdminToken()` is the only token source in `/api/admin/*` (grep returns zero direct `process.env.STRAPI_*` reads added).
- One conventional commit per PR slice, no `Co-Authored-By`, pushed to `origin/feature/landing-page-initial`.
- `apps/web/src/app/(marketing)/*` and `apps/cms/**` byte-for-byte unchanged.

## Open Questions

1. Should the product form auto-save on image upload/delete, or batch all image changes until "Guardar cambios"? **Recommendation: auto-save on image mutation** (matches the single-screen UX demand; the user never has to remember to click save after uploading).
2. Should the categories page support bulk reorder via drag-and-drop, or numeric input only? **Recommendation: numeric input only** for v1 (drag-and-drop is the next slice; matches the explicit out-of-scope list).
3. When a product is deleted, should its images also be deleted from Strapi, or kept as orphans (and cleaned by a future script)? **Recommendation: leave as orphans for v1**; surface a note in the delete confirmation. Strapi `DELETE /api/products/:id` does not cascade to media by default.

## Reviewer Notes

The apply phase MUST surface this block before pushing, so a fresh-context human reviewer can verify the change in under 5 minutes:

```
WHAT TO REVIEW (admin-product-images-and-polish)
==============================================

Why this change exists
----------------------
The /admin slice is functional (login + dashboard + product CRUD) but
incomplete: no image upload, no categories CRUD, no site-setting editor,
no dashboard search, and 401s on session expiry currently show a
misleading "Email o contraseña inválidos." The user also demanded a
single-screen product editor — the form fields, gallery, upload, and
reorder all live on ONE page.

What changed (~25 files, ~1 145 Δ — chained PRs recommended)
------------------------------------------------------------
PR1 — foundations (F1+F2+F3+F8, ~495 Δ)
  1. apps/web/src/lib/admin/strapi-admin.ts                — add 8 helpers
  2. apps/web/src/lib/admin/client.ts                      — NEW assertAdminAuth()
  3. apps/web/src/app/api/admin/products/[id]/images/route.ts — NEW
  4. apps/web/src/app/api/admin/products/[id]/images/order/route.ts — NEW
  5. apps/web/src/app/api/admin/media/[id]/route.ts        — NEW
  6. apps/web/src/app/api/admin/categories/route.ts        — NEW
  7. apps/web/src/app/api/admin/categories/[id]/route.ts   — NEW
  8. apps/web/src/app/api/admin/site-setting/route.ts      — NEW
  9. apps/web/src/app/admin/login/page.tsx                 — ?expired=1 banner
 10. apps/web/src/app/admin/login/LoginForm.tsx            — session-aware error

PR2 — headline: product images on one screen (F4, ~220 Δ)
 11. apps/web/src/app/admin/productos/ImageGallery.tsx     — NEW
 12. apps/web/src/app/admin/productos/ProductForm.tsx      — add <ProductImages>
 13. apps/web/src/app/admin/productos/[id]/page.tsx        — populate=images
 14. apps/web/src/app/admin/productos/nuevo/page.tsx       — redirect after create

PR3 — categories + site-setting + dashboard polish (F5+F6+F7, ~430 Δ)
 15. apps/web/src/app/admin/categorias/page.tsx            — NEW list
 16. apps/web/src/app/admin/categorias/nuevo/page.tsx      — NEW create
 17. apps/web/src/app/admin/categorias/[id]/page.tsx       — NEW edit
 18. apps/web/src/app/admin/categorias/CategoryForm.tsx    — NEW form
 19. apps/web/src/app/admin/ajustes/page.tsx               — NEW singleton editor
 20. apps/web/src/app/admin/ajustes/SiteSettingForm.tsx    — NEW form
 21. apps/web/src/app/admin/ProductList.tsx                — search + filters
 22. apps/web/src/app/admin/page.tsx                       — stats block
 23. apps/web/src/app/admin/layout.tsx                     — add 2 sidebar items
 24. apps/web/src/app/admin/productos/DeleteProductButton.tsx — assertAdminAuth
 25. apps/web/src/app/admin/productos/Breadcrumb.tsx       — extend labels (minor)

Acceptance gate (per PR — see Acceptance Criteria for the full list)
-------------------------------------------------------------------
PR1: grep "process.env.STRAPI_API_TOKEN" apps/web/src/app/api/admin returns no new hits.
PR2: ImageGallery renders 3+ images, upload adds one, up/down reorders persist.
PR3: categories + site-setting CRUD round-trips through Strapi; dashboard filters
     work; login banner shows on ?expired=1.

What this change does NOT do
----------------------------
- No image cropping/resizing server-side
- No bulk upload / ZIP / CSV
- No drag-and-drop reorder (v1 = up/down arrows)
- No audit log
- No multi-language admin UI
- No public-facing changes (apps/web/src/app/(marketing)/* untouched)
- No Strapi schema changes (apps/cms/** untouched — schemas already exist)
- No Coolify / deploy / local-up changes
- No new npm packages
- No new env vars

Risk surface
------------
- Forecast ~1 145 Δ exceeds 800-line PR budget — apply phase asks the user
  to pick chain vs exception before any code is written.
- Strapi v5 upload signature may differ from v4 — verified in F1 via
  strapi-v5-expert skill.
```
