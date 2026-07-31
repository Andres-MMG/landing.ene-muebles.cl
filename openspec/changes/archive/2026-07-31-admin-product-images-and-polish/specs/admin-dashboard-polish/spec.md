# Delta for Admin Dashboard Polish

## ADDED Requirements

### Frontend Requirements

### Requirement: Search input filters products by name

A `Buscar por nombre` text input MUST filter the in-memory product list by name for lists of at most 50 products. An empty query MUST show all products.

#### Scenario: Search filters live
- GIVEN three product names contain `escritorio`
- WHEN the admin types `escritorio`
- THEN exactly those three products are shown

### Requirement: Category filter

A `Categoría` select MUST filter products by category ID and MUST default to `Todas`.

#### Scenario: Category selection filters products
- GIVEN products belong to multiple categories
- WHEN the admin selects one category
- THEN only products with that category ID are shown

### Requirement: Status filter

An `Estado` select MUST offer `Todos`, `Publicados`, and `Borradores`, filtering by the presence of `publishedAt`.

#### Scenario: Draft filter
- GIVEN published and draft products are loaded
- WHEN the admin selects `Borradores`
- THEN only products without `publishedAt` are shown

### Requirement: Stats block

A stats block above the product list MUST show `Total`, `Publicados`, `Borradores`, and `Categorías`, where category count includes only active categories.

#### Scenario: Stats reflect loaded records
- GIVEN products and categories are loaded
- WHEN the dashboard renders
- THEN product totals are partitioned by `publishedAt`
- AND `Categorías` equals the number of active categories

### Backend Requirements

### Requirement: Dashboard data availability

The dashboard data source MUST provide product publication and category identifiers plus the active category collection required by filtering and statistics.

#### Scenario: Data supports dashboard calculations
- GIVEN the dashboard requests its source data
- WHEN the responses succeed
- THEN each product exposes category and `publishedAt`
- AND categories expose active state
