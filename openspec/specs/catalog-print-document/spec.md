# Catalog Print Document Specification

## Purpose

Define the branded, browser-printable catalog document exposed from the public catalog.

## Requirements

### Requirement: Single Print Action

The catalog MUST expose one visible action labeled `Imprimir PDF` that opens the print document, and MUST NOT expose a visible JSON export action.

#### Scenario: Visitor starts a print export

- GIVEN a visitor can access the catalog
- WHEN the visitor views the export controls and selects `Imprimir PDF`
- THEN the print document opens using the current catalog snapshot
- AND no JSON export action is visible

### Requirement: Branded Catalog Structure

The print document MUST contain a branded cover, a category index with product counts, and ordered category sections containing product cards.

#### Scenario: Complete catalog is printable

- GIVEN published catalog categories and products exist
- WHEN the print document renders
- THEN it shows the corporate logo/colors, cover, index counts, and one section per included category
- AND category and product order are deterministic

### Requirement: Current Product Presentation

Each product card MUST use the snapshot's current published name, description, and normalized public image URL, without inventing prices or claims.

#### Scenario: Product metadata and image render

- GIVEN a published product has a name, description, and public image
- WHEN its category section renders
- THEN the card displays those current values and the image

#### Scenario: Missing product image

- GIVEN a product has no usable public image
- WHEN its card renders
- THEN a print-safe fallback is shown and the product metadata remains readable

### Requirement: Print Layout and Accessibility

The document MUST provide print-friendly A4-oriented styling, semantic headings, stable category break hooks, headers, footers, and page-number hooks, while documenting that browser pagination is not identical across browsers.

#### Scenario: Visitor prints the document

- GIVEN the document is open in a browser print dialog
- WHEN the visitor chooses print or save-to-PDF
- THEN backgrounds, logo, cards, headers, footers, and page-number hooks are print-appropriate
- AND category sections avoid avoidable splits

#### Scenario: Assistive technology reads the document

- GIVEN a visitor uses keyboard navigation or a screen reader
- WHEN the visitor navigates the print document
- THEN headings, index links, images, fallbacks, and status/error messages have meaningful accessible names and order

### Requirement: Bounded and Safe Output

The print document MUST render only the configured bounded catalog category/product scope and MUST show a truthful empty or error state without failing the page.

#### Scenario: Scope exceeds configured bounds

- GIVEN the catalog contains more data than the configured category/product/media bounds
- WHEN the snapshot is rendered
- THEN only bounded data is included and the document remains responsive

#### Scenario: Empty or failed catalog

- GIVEN no eligible products exist or the snapshot cannot be loaded
- WHEN the print document renders
- THEN it shows an accessible Spanish status explaining the empty/error state and no invented catalog content

### Requirement: JSON Consumer Policy

The system MUST remove the JSON export route when deployment and integration inventory confirms no non-UI consumer; if a verified consumer exists, the route MUST remain unlinked, documented, and tested for compatibility.

#### Scenario: No external consumer is verified

- GIVEN repository and deployment checks find no non-UI consumer
- WHEN the change is released
- THEN the JSON route is removed and no public control links to it

#### Scenario: External consumer is verified

- GIVEN a non-UI consumer is confirmed
- WHEN the print flow is released
- THEN the JSON route remains available without a visible UI link and its consumer contract is regression-tested
