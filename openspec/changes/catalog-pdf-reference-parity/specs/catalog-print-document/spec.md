# Delta for Catalog Print Document

## MODIFIED Requirements

### Requirement: Branded Catalog Structure

The frontend print document MUST render a reference-faithful, fixed landscape editorial sequence: a ~56% charcoal / ~44% warm-taupe cover with editorial ENE typography, a Spanish brand statement, and a contact block; one white/off-white index with two category columns, alternating ochre/green count bullets, and a charcoal contact card; then category product pages. Every product page MUST render exactly four equal cards per row, with no more than two rows. A non-empty partial final page MUST retain blank body space rather than inventing products. It MUST NOT substitute responsive card density.
(Previously: A generic branded cover, one category index, and ordered category-card sections were required.)

#### Scenario: Reference document renders

- GIVEN an eligible CMS snapshot
- WHEN the visitor opens the print document
- THEN the fixed cover, one index page, and category pages render in reference order
- AND every category page contains no more than eight products in a four-by-two maximum grid

#### Scenario: Final page is incomplete

- GIVEN fewer than eight products remain in a category page
- WHEN the final product page renders
- THEN it keeps the four-column grid and blank remaining positions without inventing or duplicating records

### Requirement: Current Product Presentation

Each template placement MUST use the snapshot's current published name, description, category, and normalized public image URL, without inventing prices, claims, products, or placeholder editorial data.
(Previously: Current values were rendered on generic category cards.)

#### Scenario: CMS product placement renders

- GIVEN a published product has a usable image
- WHEN its template cell renders
- THEN it displays current CMS content at its assigned category-page position

#### Scenario: Missing product image

- GIVEN a product lacks a usable public image
- WHEN its template cell renders
- THEN an accessible print-safe fallback is shown and text remains readable

### Requirement: Print Layout and Accessibility

The frontend MUST use A4 landscape full-bleed print units with explicit page breaks, no-print controls, preserved backgrounds, semantic headings, index links, image alternatives, footer/ruler hooks, and page-number hooks. A print unit MUST NOT split across pages; browser-identical pagination is not promised.
(Previously: A4-oriented category/card breaks and generic header/footer hooks were required.)

#### Scenario: Visitor prints reference pages

- GIVEN the document is open in Chrome print preview
- WHEN the visitor saves or prints it
- THEN each cover, index, and category page is a separate unsplit A4 landscape page
- AND palette, rulers, footer, and page-number hooks are print-appropriate

#### Scenario: Assistive technology reads the document

- GIVEN a visitor uses a keyboard or screen reader
- WHEN they navigate the document
- THEN headings, index links, images, fallbacks, and status/error messages have meaningful order and names

## ADDED Requirements

### Requirement: Reference Visual Validation

The frontend release MUST be validated against the supplied visible reference evidence in Chrome print preview using representative multi-page CMS data. Validation MUST confirm cover composition, index hierarchy, category-page header, four-by-two maximum density, blank partial-page space, palette, typography, rulers, and page boundaries.

#### Scenario: Reference comparison passes

- GIVEN supplied reference evidence and representative CMS content are available
- WHEN visual validation is performed
- THEN evidence records a passing comparison for every required page family

#### Scenario: Reference material is unavailable

- GIVEN the supplied reference evidence or an approved logo asset required for a final mark is unavailable
- WHEN release validation is attempted
- THEN the change MUST NOT receive reference-parity sign-off
