# Delta for Admin Categories CRUD

## ADDED Requirements

### Frontend Requirements

### Requirement: Categories list

`/admin/categorias` MUST show every draft and published Strapi category with name, slug, image thumbnail, active badge, and product count.

#### Scenario: List shows all categories
- GIVEN Strapi contains categories in draft and published states
- WHEN the admin visits `/admin/categorias`
- THEN one row per category shows name, slug, image, active state, and `category.products.length`

### Requirement: Create category

`/admin/categorias/nuevo` MUST provide name, auto-generated slug, description, image upload, integer order, and active fields. It MUST submit to `POST /api/admin/categories` and redirect to `/admin/categorias/[id]` on success.

#### Scenario: Create with image
- GIVEN the admin completed valid fields and selected an image
- WHEN category creation succeeds
- THEN the image is associated through the single `image` field
- AND the browser lands on `/admin/categorias/<documentId>`

### Requirement: Edit category

`/admin/categorias/[id]` MUST edit every category field, replace its image, or remove it through a `Sin imagen` checkbox. Replacing an image MUST delete the old media through `DELETE /api/admin/media/<oldId>` before updating the category.

#### Scenario: Replace category image
- GIVEN the category already has an image
- WHEN the admin uploads and saves a replacement
- THEN the old image is deleted before the PUT
- AND the new image becomes the category's single image

### Requirement: Delete category with confirmation

The edit page MUST require `confirm()` before `DELETE /api/admin/categories/[id]`. A successful deletion MUST return to the list; an associated-products conflict MUST display the API message.

#### Scenario: Delete empty category
- GIVEN the category has no products and deletion is confirmed
- WHEN the API returns 200
- THEN the browser redirects to `/admin/categorias`

#### Scenario: Delete category with products
- GIVEN the category has associated products
- WHEN deletion is confirmed
- THEN the API returns 409
- AND the UI shows "Esta categoría tiene productos asociados."

### Backend Requirements

### Requirement: Prevent deletion of populated categories

The categories API MUST return 409 `Esta categoría tiene productos asociados. Reasignalos antes de eliminar.` when deletion would orphan category assignments.

#### Scenario: API rejects populated category deletion
- GIVEN a category has one or more products
- WHEN `DELETE /api/admin/categories/[id]` is called
- THEN the response is 409 with the reassignment instruction
