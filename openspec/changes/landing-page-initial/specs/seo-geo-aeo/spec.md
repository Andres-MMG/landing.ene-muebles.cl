# SEO GEO AEO Specification

## Purpose

Define truthful discovery metadata and structured data for the single `es-CL` landing route.

## Requirements

### Requirement: Indexable Route Metadata

The landing route MUST provide a unique title, description, canonical production URL, `es-CL` language signal, Open Graph metadata, and Twitter Card metadata from published operator data. Missing optional values MUST use approved non-factual brand defaults or be omitted; no `hreflang` map is required.

#### Scenario: Complete metadata

- GIVEN verified SiteSetting metadata and sharing media exist
- WHEN `/` renders
- THEN canonical, search, Open Graph, and Twitter metadata consistently describe the visible page

#### Scenario: Missing sharing data

- GIVEN optional metadata or image is absent
- WHEN metadata is generated
- THEN incomplete tags are omitted or use approved static brand assets
- AND no business fact or image URL is invented

### Requirement: Crawl Discovery

The system MUST expose `robots.txt` and a sitemap containing only the canonical indexable landing URL. Crawler directives MUST reflect the operator-approved policy; unresolved AI-training crawler policy MUST use the project default without claiming consent. API, admin, and internal endpoints MUST NOT be advertised.

#### Scenario: Crawler discovery

- GIVEN the production origin is configured
- WHEN robots and sitemap resources are requested
- THEN both return valid responses referencing the canonical HTTPS landing URL

#### Scenario: Unknown or non-production origin

- GIVEN the canonical production origin is missing
- WHEN a sitemap is requested
- THEN the system MUST NOT invent a host
- AND deployment validation reports the missing operator configuration

### Requirement: Eligible Structured Data

Server-rendered JSON-LD MAY include WebSite, LocalBusiness, FAQPage, Product, and Organization only when each entity is supported by visible published data. FAQ questions and answers MUST match visible content. Product blocks MUST omit Offer unless verified price, CLP currency, and availability are all published. Review and AggregateRating MUST NOT be emitted in this change.

#### Scenario: Eligible content

- GIVEN complete verified fields exist for a supported entity
- WHEN JSON-LD is generated
- THEN the block matches visible content and passes applicable validators
- AND each emitted property maps to a verified source

#### Scenario: Incomplete entity

- GIVEN required eligible fields are absent
- WHEN JSON-LD is generated
- THEN the affected block is omitted
- AND other eligible blocks remain valid

### Requirement: No Fabricated Local or Commercial Claims

LocalBusiness MUST NOT emit an address unless street line, commune, region, country, and applicable postal data are verified as a complete unit. Unknown hours, telephone, founder, social profiles, reviews, ratings, prices, and availability MUST be omitted. Testimonials MUST NOT be transformed into review schema.

#### Scenario: Partial address

- GIVEN only part of the physical address is configured
- WHEN LocalBusiness data is built
- THEN the entire address property is absent

#### Scenario: Unverified claims

- GIVEN testimonials or incomplete commercial fields exist
- WHEN structured data is inspected
- THEN no review, rating, offer, or unsupported local claim is present

### Requirement: Safe Answer-Ready Content

FAQ and expert-advice previews MUST use semantic question or topic headings and concise visible summaries. JSON-LD serialization MUST safely encode CMS text and MUST NOT execute markup supplied through editorial content.

#### Scenario: Answer extraction

- GIVEN published FAQ items exist
- WHEN a crawler reads the HTML
- THEN each answer is present in visible text and represented identically in FAQPage data

#### Scenario: Unsafe editorial text

- GIVEN CMS text contains markup or script-like characters
- WHEN metadata or JSON-LD renders
- THEN the data remains valid inert text
- AND no script execution or JSON-LD breakout occurs
