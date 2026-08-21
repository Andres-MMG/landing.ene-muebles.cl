# Catalog Data Snapshot Specification

## Purpose

Define the coherent, bounded, publication-aware data snapshot used by the browser-print catalog.

## Requirements

### Requirement: Coherent Request-Time Snapshot

The catalog print flow MUST obtain one active/published snapshot for the request, using current CMS values available at request time; the documented cache MAY make direct CMS edits stale for no more than 60 seconds.

#### Scenario: Request observes one catalog state

- GIVEN published categories and products are available
- WHEN a visitor requests the print document
- THEN all index counts, sections, cards, names, descriptions, and media come from one coherent snapshot
- AND the response states freshness as current at request/cache time where appropriate

#### Scenario: CMS mutation invalidates catalog data

- GIVEN an authorized catalog mutation occurs
- WHEN the existing `catalog` invalidation is triggered
- THEN subsequent requests can observe the updated snapshot without waiting for the normal cache interval

### Requirement: Publication, Scope, and Media Normalization

The snapshot MUST include only eligible active/published categories and products, enforce configured category/product/media bounds, preserve deterministic ordering, and normalize selected media to safe public URLs.

#### Scenario: Draft content is present

- GIVEN draft or inactive categories/products exist alongside published content
- WHEN the snapshot is built
- THEN draft or inactive records are excluded from counts, sections, and cards

#### Scenario: Media URL is unsuitable

- GIVEN a selected CMS image lacks a usable public URL
- WHEN the snapshot is normalized
- THEN that image is omitted or marked unavailable for the documented card fallback without breaking other records

### Requirement: Load and Caching Safeguards

The snapshot MUST use the existing tagged 60-second caching strategy, bounded fields/media, and bounded loading behavior; it MUST NOT add a second uncached full-catalog fetch, PDF renderer, background job, stored artifact, or production dependency.

#### Scenario: Repeated print requests arrive

- GIVEN multiple visitors request the catalog within the cache window
- WHEN the requests are served
- THEN the tagged bounded snapshot is reused and CMS/load work remains bounded

#### Scenario: Large catalog payload is encountered

- GIVEN CMS data or media would exceed configured limits
- WHEN the snapshot is requested
- THEN the response remains within the limits and returns a usable partial or explicit error state

### Requirement: Snapshot Error Semantics

Snapshot failures MUST produce a controlled, accessible print-document error state and MUST NOT expose secrets, internal stack traces, or misleading product data.

#### Scenario: CMS request fails

- GIVEN the CMS is unavailable or returns an invalid response
- WHEN the print document requests the snapshot
- THEN the visitor receives a stable error message and the application remains usable
- AND no partial data is presented as complete without an appropriate indication
