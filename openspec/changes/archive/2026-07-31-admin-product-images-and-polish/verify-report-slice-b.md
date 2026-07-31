# Slice B Verification Report

> Single-screen product image gallery for `admin-product-images-and-polish`.
> Manual browser checks are USER-RUN and were not executed by the apply agent.

## Files changed

- `apps/web/src/app/admin/productos/ImageGallery.tsx`
- `apps/web/src/app/admin/productos/ProductForm.tsx`
- `apps/web/src/app/admin/productos/[id]/page.tsx`
- `apps/web/src/app/admin/productos/nuevo/page.tsx`
- `openspec/changes/admin-product-images-and-polish/tasks.md`
- `openspec/changes/admin-product-images-and-polish/verify-report-slice-b.md`

## Diff stat

Command to reproduce after the Slice B commit:

```text
git diff 1f1751c..HEAD --stat
```

The focused Slice B diff contains the four product editor files, the task checkbox update, and this verification report. `ImageGallery.tsx` is the primary addition; the remaining UI files only integrate the gallery and create-to-edit redirect.

## Automated verification

- `pnpm --filter web typecheck` — PASS (exit 0).
- `pnpm --filter web lint` — PASS (exit 0; four pre-existing warnings outside Slice B).
- No server, Docker Compose stack, or development process was started.

## Expected user flow

1. Log in to the admin panel.
2. Visit `/admin/productos/nuevo`.
3. Fill and submit the product form.
4. Land on `/admin/productos/<documentId>`.
5. Upload, reorder, and delete images inline on the same editor screen.
6. Save product fields separately; image mutations are already persisted and the image save is a no-op.

## Manual test checklist — USER-RUN

- [ ] **USER-RUN** Log in as `cliente`.
- [ ] **USER-RUN** Visit `/admin/productos/nuevo`.
- [ ] **USER-RUN** Fill name, slug, and price, then submit.
- [ ] **USER-RUN** Confirm redirect to `/admin/productos/<id>`.
- [ ] **USER-RUN** Verify the empty gallery state is visible.
- [ ] **USER-RUN** Upload one JPEG no larger than 5 MB and confirm its tile appears.
- [ ] **USER-RUN** Try uploading a PDF and confirm `Solo se aceptan imágenes` appears with no gallery change.
- [ ] **USER-RUN** Try uploading a 6 MB image and confirm `Archivo demasiado grande` appears.
- [ ] **USER-RUN** Upload up to eight images and confirm a ninth is rejected with `Máximo 8 imágenes por producto.`
- [ ] **USER-RUN** Move tile 0 down and confirm the new order survives reload.
- [ ] **USER-RUN** Delete tile 2, accept the confirmation dialog, and confirm the tile is removed.
- [ ] **USER-RUN** Edit form fields, save, and confirm navigation back to `/admin`.

## Fresh-context review

- `ImageGallery.tsx` starts with `'use client'`.
- Upload uses `adminUpload`; delete and reorder use the Slice A admin client helpers, which apply `assertAdminAuth`.
- Create redirects to `/admin/productos/<documentId>`.
- Product edit fetch populates both `category` and `images`.
- Images remain on the same page as the existing product form.
- No direct admin/API token environment reads were added to the product editor client components.
- No Slice C UI was changed.
