# Design: admin-product-images-and-polish

## 1. Architecture overview

```
                        /admin/productos/[id]  (server component, dynamic)
                                    │
                                    ▼
                          <ProductForm mode="edit">
                          ┌───────────────────────┐
                          │ Identidad fieldset    │
                          │ Comercial fieldset    │  (client, 'use client')
                          │ <ImageGallery>        │──┐
                          └───────────────────────┘  │
                                                       ▼
                                       <ImageGallery> (client, 'use client)
                                       state: images[], pending, error
                                          │           │            │
                                          ▼           ▼            ▼
                              POST .../images   DELETE .../media/[id]   PUT .../images/order
                                          │           │            │
                                          └───────────┼────────────┘
                                                      ▼
                                  /api/admin/* route handlers (nodejs runtime)
                                  session check → getStrapiAdminToken()
                                                      ▼
                                  Strapi v5 (/api/upload, /api/products, /api/categories, /api/site-setting)
```

**Two-step create flow** — `/admin/productos/nuevo` POSTs to `/api/admin/products` and on `201` the client navigates to `/admin/productos/<documentId>`. The new editor renders an empty `<ImageGallery>` because the product has no `documentId` to attach media to until the row exists. This avoids the brittle "create-with-media" path in Strapi v5.

**Token source** — every new admin route imports `getStrapiAdminToken()` from `apps/web/src/lib/admin/strapi-admin.ts`. No route reads `process.env.STRAPI_API_TOKEN` directly. The read-only public token never reaches an admin route.

---

## 2. File-by-file change matrix

| # | File | Action | Description |
|---|---|---|---|
| 1 | `apps/web/src/lib/admin/strapi-admin.ts` | Modify | Add `uploadFile`, `deleteMedia`, `listAdminCategories`, `getAdminCategory`, `updateAdminCategory`, `deleteAdminCategory`, `getAdminSiteSetting`, `updateAdminSiteSetting` |
| 2 | `apps/web/src/lib/admin/client.ts` | Create | `assertAdminAuth(res)` helper (window.location.assign on 401) |
| 3 | `apps/web/src/app/api/admin/products/[id]/images/route.ts` | Create | POST multipart, validate 5 MB / MIME / 8-cap, proxy to Strapi |
| 4 | `apps/web/src/app/api/admin/products/[id]/images/order/route.ts` | Create | PUT `{ ids: string[] }`, reorder via relation PUT |
| 5 | `apps/web/src/app/api/admin/media/[id]/route.ts` | Create | DELETE → `DELETE /api/upload/files/<id>` |
| 6 | `apps/web/src/app/api/admin/categories/route.ts` | Create | GET list (with product count) + POST create |
| 7 | `apps/web/src/app/api/admin/categories/[id]/route.ts` | Create | GET, PUT, DELETE (409 when products exist) |
| 8 | `apps/web/src/app/api/admin/site-setting/route.ts` | Create | GET + PUT singleton |
| 9 | `apps/web/src/app/admin/login/page.tsx` | Modify | Read `?expired=1`, render banner |
| 10 | `apps/web/src/app/admin/login/LoginForm.tsx` | Modify | Wrap fetch with `assertAdminAuth`, session-aware error |
| 11 | `apps/web/src/app/admin/productos/ImageGallery.tsx` | Create | Gallery tiles + uploader + reorder |
| 12 | `apps/web/src/app/admin/productos/ProductForm.tsx` | Modify | Render `<ImageGallery>` under Comercial fieldset (edit mode); wrap fetches |
| 13 | `apps/web/src/app/admin/productos/[id]/page.tsx` | Modify | Populate images; pass to ProductForm initial |
| 14 | `apps/web/src/app/admin/productos/nuevo/page.tsx` | Modify | After POST 201, redirect to `/admin/productos/<documentId>` |
| 15 | `apps/web/src/app/admin/categorias/page.tsx` | Create | List with counts + active pill |
| 16 | `apps/web/src/app/admin/categorias/nuevo/page.tsx` | Create | Create form (CategoryForm) |
| 17 | `apps/web/src/app/admin/categorias/[id]/page.tsx` | Create | Edit form, single image, delete confirm |
| 18 | `apps/web/src/app/admin/categorias/CategoryForm.tsx` | Create | Reusable form for new + edit |
| 19 | `apps/web/src/app/admin/ajustes/page.tsx` | Create | Singleton editor (single button) |
| 20 | `apps/web/src/app/admin/ajustes/SiteSettingForm.tsx` | Create | Form component, JSON textarea for `socialLinks` |
| 21 | `apps/web/src/app/admin/ProductList.tsx` | Modify | Search + category filter + status filter (client) |
| 22 | `apps/web/src/app/admin/page.tsx` | Modify | Stats block Total/Publicados/Borradores/Categorías |
| 23 | `apps/web/src/app/admin/layout.tsx` | Modify | Sidebar: +Categorías +Ajustes; mobile stacked tabs mirror |
| 24 | `apps/web/src/app/admin/productos/[id]/DeleteProductButton.tsx` | Modify | Wrap DELETE fetch with `assertAdminAuth` |
| 25 | `apps/web/src/app/admin/productos/Breadcrumb.tsx` | Modify | New label maps for `/categorias`, `/ajustes` |

---

## 3. `ImageGallery.tsx` component shape

```tsx
'use client';

type ImageRecord = {
  id: number;
  documentId: string;
  url: string;
  thumbnailUrl: string;
  name: string;
};

type Props = {
  productDocumentId: string;
  initialImages: ImageRecord[];
  maxImages?: number; // default 8
};

export function ImageGallery({
  productDocumentId,
  initialImages,
  maxImages = 8,
}: Props) {
  const [images, setImages] = useState<ImageRecord[]>(initialImages);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(files: FileList) {
    setPending(true); setError(null);
    const snapshot = images;
    // optimistic: append placeholders; remove after response
    try {
      const res = await fetch(`/api/admin/products/${productDocumentId}/images`, {
        method: 'POST', body: fd(formFrom(files)),
      });
      const out = assertAdminAuth(res);
      if (!out.ok) throw await toHttpError(out);
      const json = await out.json();
      setImages((prev) => [...prev, ...json.added]);
    } catch (e) {
      setImages(snapshot);
      setError(humanize(e));
    } finally { setPending(false); }
  }

  async function onDelete(id: number) { /* snapshot + rollback on !2xx */ }
  async function onMove(id: number, direction: 'up' | 'down') {
    /* swap, PUT { ids: imageIds }, rollback on !2xx */
  }

  if (images.length === 0) return <EmptyState onUpload={onUpload} pending={pending} />;
  return (
    <ul role="list">
      {images.map((img, i) => (
        <Tile key={img.id} img={img} index={i} total={images.length}
              onDelete={onDelete} onMove={onMove} disabled={pending} />
      ))}
      {images.length < maxImages && <Uploader onUpload={onUpload} pending={pending} />}
    </ul>
  );
}
```

Optimistic updates roll back by snapshotting `images` before the request and restoring on non-2xx. Errors are user-readable Spanish strings from the API. Disable controls while `pending` is true to prevent double-submits.

---

## 4. Strapi v5 upload contract (verified via `docs.strapi.io`)

| Action | Endpoint | Method | Notes |
|---|---|---|---|
| Upload + attach | `/api/upload?ref=api::product.product&refId=<documentId>&field=images` | POST multipart | `files` field. Per Strapi v5 docs, accepts `ref` (UID), `refId` (entry id), `field` to bind on attach. |
| Reorder | `/api/products/<documentId>` with `data: { images: { set: [<id1>, <id2>...] } }` | PUT | Media order lives on the relation row; `set` replaces in array order. Position-based `connect` is also supported but `set` is simpler for full reorder. |
| Delete media | `/api/upload/files/<id>` | DELETE | 204 on success. Cascade to Strapi Media Library row. |
| Categories list w/ count | `/api/categories?populate[products][count]=true&...` | GET | `populate.products[fields][0]=id` plus `count=true` keeps payload small. |
| Site-setting singleton | `/api/site-setting` | GET / PUT | No `:id`; Strapi v5 singleType is `/api/<singularName>` directly. |

Verification source: `https://docs.strapi.io/cms/api/rest/upload` and `https://docs.strapi.io/cms/api/rest/relations`. **Caveat**: `refId` semantics — the public docs use a 24-hex `refId` (Mongo ObjectId style). Our Strapi runs on MySQL; we pass the **documentId** (Strapi v5 doc-store identifier) per the proposal's verification in F1. If F1 finds the contract requires the numeric `id`, swap the helper to look up `id` from `documentId` via a single GET and pass it.

---

## 5. Server-side validation rules

| Endpoint | Rule | Limit | Status |
|---|---|---|---|
| `POST /api/admin/products/[id]/images` | file count (existing + new ≤ 8) | 8 | 429 |
| same | per-file size | 5 MB | 413 |
| same | MIME allowlist | `image/jpeg`, `image/png`, `image/webp` | 415 |
| same | unauthenticated / expired session | — | 401 |
| `POST /api/admin/categories` (image field) | single image per category | 1 | 422 |
| same | per-file size | 2 MB | 413 |
| same | MIME allowlist | `image/jpeg`, `image/png`, `image/webp` | 415 |
| `DELETE /api/admin/categories/[id]` | category has products | — | 409 |

Middleware pre-check uses `Content-Length` for fast 413; route handler also validates `file.size` post-parse (defense in depth).

---

## 6. API route shapes

| Path | Method | Request | Response | Status |
|---|---|---|---|---|
| `/api/admin/products/[id]/images` | POST | `multipart/form-data` with `files[]` | `{ added: ImageRecord[] }` | 200, 400, 401, 404, 413, 415, 422, 429 |
| `/api/admin/products/[id]/images/order` | PUT | `{ ids: string[] }` | `{ ok: true, order: string[] }` | 200, 400, 401, 404 |
| `/api/admin/media/[id]` | DELETE | — | — | 204, 401, 404 |
| `/api/admin/categories` | GET | `?populate=products.count` | `{ data: CategoryWithCount[] }` | 200, 401 |
| `/api/admin/categories` | POST | JSON `{ name, slug?, description?, order?, active?, imageId? }` | `{ data: Category }` | 201, 400, 401, 409 (slug) |
| `/api/admin/categories/[id]` | GET | — | `{ data: Category }` | 200, 401, 404 |
| `/api/admin/categories/[id]` | PUT | JSON partial | `{ data: Category }` | 200, 400, 401, 404 |
| `/api/admin/categories/[id]` | DELETE | — | — | 200, 401, 404, 409 (has products) |
| `/api/admin/site-setting` | GET | — | `{ data: SiteSetting }` | 200, 401 |
| `/api/admin/site-setting` | PUT | JSON partial | `{ data: SiteSetting }` | 200, 400, 401 |

All routes: `export const dynamic = 'force-dynamic'; export const runtime = 'nodejs';` (multipart needs Node).

---

## 7. Layout sidebar update

`apps/web/src/app/admin/layout.tsx` — sidebar items, in order (existing visual style: `t-mono`, `uppercase`, `tracking-[0.22em]`):

1. **Productos** → `/admin`
2. **Nuevo producto** → `/admin/productos/nuevo`
3. **Categorías** → `/admin/categorias` (new)
4. **Ajustes** → `/admin/ajustes` (new)

Mobile stacked tabs mirror the same list in the same order. Active item highlighted `bg-ink text-paper` (already established for the current Productos link). The server component computes `activePath` via `headers().get('x-pathname')` (set in `middleware.ts` or a small server util) so the active class is correct on first paint without `usePathname()`.

---

## 8. `assertAdminAuth(res)` helper

```ts
// apps/web/src/lib/admin/client.ts
export function assertAdminAuth(res: Response): Response {
  if (res.status === 401) {
    window.location.assign('/admin/login?expired=1');
  }
  return res;
}
```

Applied in: `LoginForm.tsx` (login fetch), `ProductForm.tsx` (POST/PUT product), `ImageGallery.tsx` (3 endpoints), `DeleteProductButton.tsx` (DELETE), `CategoryForm.tsx` (POST/PUT/DELETE), `SiteSettingForm.tsx` (PUT).

Full-page `window.location.assign` is mandatory — Next router navigation triggers React re-renders that can re-fire the same fetch on the way to `/admin/login`, causing a loop. A hard reload breaks the cycle.

---

## 9. Two-step create flow

1. Admin visits `/admin/productos/nuevo`. Form fields render with `mode="create"`. No gallery (no `documentId` yet).
2. Submit → `POST /api/admin/products`. On 201 with `{ data: { documentId } }`, the client `router.push('/admin/productos/' + documentId)`.
3. Server component `[id]/page.tsx` loads the product with `populate[images]=true` (empty array).
4. `<ImageGallery initialImages={[]}>` renders the empty-state: "Aún no hay imágenes para este producto. Subí la primera abajo." Uploader is visible immediately.

**Why not single-step?** Strapi v5's `POST /api/upload` requires the target `refId` to exist in the relation. Creating a draft product and uploading simultaneously requires either a two-transaction pattern (risky on MySQL) or a draft entity created server-side first (current behaviour). Two-step mirrors the current capability and keeps the rollback story trivial.

---

## 10. Reorder UX

**Decision: up/down arrows, no drag-and-drop.**

| Option | Tradeoff | Decision |
|---|---|---|
| Up/down arrow buttons | Zero new deps, keyboard-accessible, tiny component | ✅ chosen |
| HTML5 drag-and-drop | Native, no deps, but janky on mobile, no keyboard a11y | ❌ rejected |
| `dnd-kit` | Smooth UX, ~10 KB gz, but adds a dependency | ❌ rejected (out of scope) |

API call: `PUT /api/admin/products/[id]/images/order` with body `{ ids: string[] }` (the new desired order of media `documentId`s, length must equal current count). Server proxies to `PUT /api/products/<documentId>` with `data: { images: { set: ids } }`. UI updates after 200; rolls back to the previous order on non-2xx.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Strapi v5 upload signature drift (`refId` semantics) | F1 verifies via `context7_query-docs` against `strapi-v5-expert`. If `documentId` is rejected, helper resolves to numeric `id` first. |
| Image order endpoint (`PUT /api/upload` not orderable in v5) | Use relation `set` on `PUT /api/products/:id` (verified in docs). Documented in §4. |
| `assertAdminAuth` redirect loop | `window.location.assign` (full page), not `router.push`. Login page does no admin fetch on mount. |
| Categories with products → delete returns 409 | UI shows server message inline; link `/admin?category=<id>` filters the dashboard to reassign. |
| Two-step create UX surprise | Documented in proposal + commit body; verify-report covers it. |

---

## 12. Out-of-scope reaffirmation

- No server-side image cropping/resizing (Strapi generates formats automatically).
- No bulk upload via ZIP / CSV.
- No drag-and-drop reorder for images or categories.
- No audit log.
- No multi-language admin UI (Spanish only).
- No public-site changes (`apps/web/src/app/(marketing)/*` untouched).
- No Strapi schema changes (`apps/cms/**` untouched).
- No Coolify / deploy / `local-up.*` changes.
- No new npm packages.
- No new env vars.

---

## 13. PR strategy guard

The proposal forecast (~1 145 Δ) exceeds the 800-line PR-review budget defined in `sdd-phase-common §E`. The orchestrator MUST pause after `tasks.md` and ask the user to choose between:

| Option | Composition | Size |
|---|---|---|
| (a) **Chained PRs** (recommended) | **PR1**: F1 + F2 + F3 + F8 (foundations + APIs + session-expiry UX, ~495 Δ) → **PR2**: F4 (image gallery headline, ~220 Δ) → **PR3**: F5 + F6 + F7 (categories + site-setting + dashboard polish, ~430 Δ) | 3 PRs, each < 500 Δ |
| (b) **`size:exception`** | Single PR containing all 8 phases | 1 PR, ~1 145 Δ |

**Default recommendation: (a) chained PRs.** Each PR has a clear start/finish and can be reverted independently. The headline feature (gallery) lands in PR2 and is reviewable in isolation. If the user picks (b), the apply phase records the explicit override and proceeds.
