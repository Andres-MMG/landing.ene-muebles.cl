# Delta Spec: admin-panel-ux

## Purpose

Consolidate the `/admin` panel chrome into a single Next.js layout so the dashboard, the new-product page, and the edit-product page share the same brand header, breadcrumb, role pill, and logout affordance. Add a skip-link for keyboard users. The sidebar collapses to stacked tabs below the `md` breakpoint.

## Requirements

### Requirement: Single admin layout

`apps/web/src/app/admin/layout.tsx` MUST exist and MUST render a brand header (wordmark + session user.name + role pill + Cerrar sesión form), a sidebar nav (Productos / Nuevo producto) on `md+`, the page children, and a skip-link as the first focusable element.

#### Scenario: dashboard renders inside the layout

- GIVEN an authenticated user
- WHEN the user visits `/admin`
- THEN the shared header renders
- AND the dashboard children render below it

#### Scenario: editor renders inside the layout

- GIVEN an authenticated user
- WHEN the user visits `/admin/productos/:id`
- THEN the shared header renders
- AND the editor form renders below it

#### Scenario: new-product renders inside the layout

- GIVEN an authenticated user
- WHEN the user visits `/admin/productos/nuevo`
- THEN the shared header renders
- AND the create form renders below it

### Requirement: Per-page headers removed

The dashboard, new-product page, and edit-product page MUST NOT render their own `<header>` block. The layout owns the chrome.

#### Scenario: dashboard has no inline header

- GIVEN the dashboard page is rendered
- THEN the only `<header>` element in the DOM is the one from `layout.tsx`

#### Scenario: editor and new-product have no inline header

- GIVEN the editor or new-product page is rendered
- THEN no per-page `<header>` element exists in the DOM

### Requirement: Sidebar collapses on mobile

The sidebar nav MUST render as a sidebar on viewports `md` (≥ 768px) and above, and MUST render as stacked tabs on smaller viewports.

#### Scenario: mobile shows stacked tabs

- GIVEN the viewport is 390×844
- WHEN the admin route renders
- THEN the nav links stack vertically
- AND they are reachable in DOM order before the page content

#### Scenario: desktop shows sidebar

- GIVEN the viewport is ≥ 768px
- WHEN the admin route renders
- THEN the nav renders as a sidebar alongside the page content

### Requirement: Breadcrumb reflects current path

The layout MUST render a breadcrumb based on the pathname. `/admin` → `Productos`. `/admin/productos/nuevo` → `Productos / Nuevo`. `/admin/productos/:id` → `Productos / Editar :name` (best-effort; falls back to `Productos / Editar` when the product name is not preloaded).

#### Scenario: dashboard breadcrumb

- GIVEN the user is on `/admin`
- THEN the breadcrumb shows `Productos`

#### Scenario: new-product breadcrumb

- GIVEN the user is on `/admin/productos/nuevo`
- THEN the breadcrumb shows `Productos / Nuevo`

#### Scenario: editor breadcrumb

- GIVEN the user is on `/admin/productos/:id` and the product name is preloaded
- THEN the breadcrumb shows `Productos / Editar :name`

#### Scenario: editor breadcrumb fallback

- GIVEN the user is on `/admin/productos/:id` and the product name is not preloaded
- THEN the breadcrumb shows `Productos / Editar`

### Requirement: Skip-link is the first focusable element

On `/admin/*`, the first tab stop MUST be a "Saltar al contenido" anchor that moves focus to `<main>`.

#### Scenario: keyboard user reaches main on first Tab

- GIVEN a keyboard user is on `/admin`
- WHEN the user presses Tab once
- THEN focus lands on the skip-link
- AND pressing Enter scrolls to `<main>` and moves focus there