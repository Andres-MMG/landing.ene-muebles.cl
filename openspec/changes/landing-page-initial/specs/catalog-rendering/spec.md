# Catalog Rendering Specification

## Purpose

Define safe server-rendered consumption of published Strapi content.

## Requirements

### Requirement: Published Server-Side Content

The web surface MUST consume Strapi v5 flat REST responses for `es-CL` published documents server-to-server. Queries MUST declare required scalar fields and the one-level `populate=*` contract for scoped media and relations. API credentials MUST NOT be sent to browsers. Rendered records MUST preserve operator ordering and content limits.

#### Scenario: Successful catalog fetch

- GIVEN valid published CMS records exist
- WHEN the landing route renders
- THEN up to 8 categories, all eligible featured products, and up to 3 article previews are rendered in their sections
- AND media and relations required by those entries are present

#### Scenario: Draft and unfeatured content

- GIVEN records are draft, unpublished, or products are not featured
- WHEN the public route renders
- THEN those records are excluded

### Requirement: Presentation Eligibility

A record MUST be rendered only when its required display fields are complete. Optional price MUST be shown only when the operator published the complete price value and currency policy; otherwise the product MUST remain inquiry-based. Social proof MUST satisfy its consent gate.

#### Scenario: Complete product

- GIVEN a published featured product has required copy and media
- WHEN its card renders
- THEN it shows image, title, short description, and contextual inquiry action
- AND verified price is shown only when complete

#### Scenario: Invalid record

- GIVEN a returned record lacks required copy, media, consent, or alt text
- WHEN the response is normalized
- THEN the invalid record or affected media is omitted
- AND neighboring valid records still render

### Requirement: Section-Level Degradation

Each CMS-backed section MUST fail independently. A timeout, malformed response, or unavailable CMS MUST NOT prevent the landing document, family story, or available contact path from rendering. Public fallback messages MUST use professional Chilean Spanish and MUST NOT expose internal errors.

#### Scenario: One endpoint fails

- GIVEN the FAQ request fails while catalog requests succeed
- WHEN the page renders
- THEN the catalog remains visible
- AND the FAQ is omitted or replaced by its defined fallback

#### Scenario: Empty response

- GIVEN a successful CMS response contains no eligible entries
- WHEN its section renders
- THEN the page uses the section's empty-state policy without placeholder records

### Requirement: Editorial Freshness

Published catalog content MUST become visible within 300 seconds, FAQ and SiteSetting content within 3600 seconds, and hero content within 86400 seconds, without requiring a deployment. Stale valid content SHOULD remain available during transient revalidation failure.

#### Scenario: Content publication

- GIVEN an operator publishes a valid change
- WHEN the relevant revalidation window elapses
- THEN a subsequent page response reflects that published change

#### Scenario: Revalidation failure

- GIVEN a prior valid response exists and CMS revalidation fails
- WHEN a visitor requests the page
- THEN the prior valid response remains usable
- AND credentials or exception details are not exposed
