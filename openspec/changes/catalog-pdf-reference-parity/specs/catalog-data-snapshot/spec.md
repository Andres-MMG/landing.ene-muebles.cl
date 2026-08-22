# Delta for Catalog Data Snapshot

## MODIFIED Requirements

### Requirement: Publication, Scope, and Media Normalization

The backend snapshot MUST include only eligible active/published categories and products, enforce configured category/product/media bounds, preserve deterministic `order` then name ordering, and normalize selected media to safe public URLs. It MUST preserve the dynamic `getCatalogSnapshot()` contract and MUST NOT hardcode, fabricate, duplicate, or replace CMS product data to fill a reference layout. The print document MAY group the returned products by their current CMS category and chunk each category at eight products, but it MUST NOT require or invent static reference placement metadata.
(Previously: Published scope, configured bounds, deterministic ordering, and safe-media normalization were required.)

#### Scenario: Valid dynamic category sequence

- GIVEN eligible products have deterministic CMS order and current categories
- WHEN the snapshot is built
- THEN it returns them in deterministic CMS sequence for category-page grouping

#### Scenario: Reference evidence lacks a final asset

- GIVEN an approved served logo asset or exact visual measurement is still unavailable
- WHEN the snapshot is requested for reference printing
- THEN it continues to return current CMS facts without fictional placement or asset data

#### Scenario: Draft content is present

- GIVEN draft or inactive categories/products exist alongside published content
- WHEN the snapshot is built
- THEN draft or inactive records are excluded from counts and print placements

#### Scenario: Media URL is unsuitable

- GIVEN a selected CMS image lacks a usable public URL
- WHEN the snapshot is normalized
- THEN that image is unavailable for the documented template fallback without breaking other records

## ADDED Requirements

### Requirement: Reference Layout Integrity

The backend MUST expose only CMS editorial metadata sufficient to render current category pages from the bounded snapshot. Layout handling MUST preserve cache, publication, normalization, empty, and error semantics; it MUST NOT add an uncached catalog fetch, PDF renderer, background job, stored artifact, or production dependency.

#### Scenario: Category snapshot remains cached

- GIVEN repeated print requests arrive within the existing cache window
- WHEN the category snapshot is served
- THEN the tagged bounded snapshot is reused with its existing invalidation behavior

#### Scenario: Category content exceeds configured bounds

- GIVEN category content would exceed configured product or media bounds
- WHEN the snapshot is requested
- THEN the result remains bounded and reports incomplete coverage rather than claiming a complete catalog
