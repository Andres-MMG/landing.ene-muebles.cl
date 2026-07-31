# Delta for Admin Product Images

## ADDED Requirements

### Frontend Requirements

### Requirement: Single-screen editor

The product editor at `/admin/productos/[id]` MUST render the existing fields (name, slug, description, price, currency, category, active, featured) and an `<ImageGallery>` as siblings under the same page chrome and render tree. The gallery MUST NOT use a modal, separate route, wizard, or Next router navigation.

#### Scenario: Editor shows form and gallery together
- GIVEN an authenticated admin
- WHEN they visit `/admin/productos/<id>`
- THEN the DOM contains all product fields and an `<ImageGallery>` region
- AND the region contains current images, upload, delete, and reorder controls

#### Scenario: Create redirects to editor
- GIVEN the new-product form is valid
- WHEN `POST /api/admin/products` returns 2xx with a `documentId`
- THEN the browser navigates to `/admin/productos/<documentId>` rather than `/admin`

### Requirement: Image gallery lists current images

The gallery MUST render one ordered tile per image with a thumbnail, truncated file name, and delete button.

#### Scenario: Gallery shows all images
- GIVEN Strapi returns four product images
- WHEN the editor renders
- THEN exactly four tiles appear in Strapi response order

#### Scenario: Empty gallery
- GIVEN the product has no images
- WHEN the editor renders
- THEN it shows "Aún no hay imágenes para este producto. Subí la primera abajo."
- AND the upload control remains visible

### Requirement: Per-image delete

Each tile MUST delete optimistically through `DELETE /api/admin/media/[id]`; failure MUST restore the tile at its original position and show an error.

#### Scenario: Delete succeeds
- GIVEN four image tiles are visible
- WHEN tile 2 is deleted and the API returns 204
- THEN that tile disappears and three remain

#### Scenario: Delete fails
- GIVEN an image tile is visible
- WHEN deletion returns 500
- THEN the tile returns to its original position
- AND "No se pudo eliminar la imagen" is shown

### Requirement: Upload control

The gallery MUST expose `<input type="file" multiple>` through a visible "Subir imágenes" control. It MUST upload selected files sequentially or with at most three concurrent requests to `POST /api/admin/products/[id]/images`, appending successful media records.

#### Scenario: Upload one image
- GIVEN a JPEG no larger than 5 MB is selected
- WHEN upload returns 200 with a media record
- THEN its tile appears at the gallery end

### Requirement: Reorder with up/down arrows

Each tile MUST show `↑` except at the first position and `↓` except at the last. Activation MUST send the new ID order to `PUT /api/admin/products/[id]/images/order` and refresh the gallery after success.

#### Scenario: Move first image down
- GIVEN at least two tiles are visible
- WHEN the first tile's `↓` returns 200
- THEN the former first tile re-renders at position 1

### Backend Requirements

### Requirement: Upload validation

The upload API MUST reject files larger than 5 MB with 413 `Archivo demasiado grande` and non-image MIME types with 415 `Solo se aceptan imágenes`, without changing the gallery.

#### Scenario: Reject oversized file
- GIVEN a selected file exceeds 5 MB
- WHEN upload is attempted
- THEN the API returns 413 and the gallery is unchanged

#### Scenario: Reject non-image MIME
- GIVEN a PDF or text file is selected
- WHEN upload is attempted
- THEN the API returns 415 and the gallery is unchanged

### Requirement: Max 8 images per product

The API MUST reject additions beyond eight images with 429 `Máximo 8 imágenes por producto`. The UI MUST hide upload at eight and show the same limit message.

#### Scenario: Eighth accepted and ninth rejected
- GIVEN the product has seven images
- WHEN two files are uploaded in order
- THEN the first succeeds and the second returns 429
