# Strapi Content Model Specification

## Purpose

Define the CMS records and editorial rules required by the landing page.

## Requirements

### Requirement: Scoped Content Types

The CMS MUST provide only the scoped types: Product, Category, FAQ, Testimonial, Article, RealHome, SiteSetting singleton, and Lead. All eight types MUST support Draft & Publish; Lead records MUST remain inaccessible to the public content API regardless of publication state.

#### Scenario: Content schema is available

- GIVEN an authorized operator opens the CMS
- WHEN content types are inspected
- THEN all eight scoped types are editable
- AND no unrelated business domain is required by this change

#### Scenario: Lead access attempt

- GIVEN an unauthenticated or read-only content client
- WHEN it requests Lead records
- THEN access is denied without exposing lead data

### Requirement: Catalog and Editorial Records

Product MUST support title, slug, short description, media, optional verified price data, featured state, category, and ordering. Category MUST support name, slug, image, and ordering. FAQ MUST support question, answer, and ordering. Article MUST support title, excerpt, destination, image, optional verified author identity, and publication dates.

#### Scenario: Published catalog edit

- GIVEN an operator publishes a valid Product or Category change
- WHEN the published API is queried
- THEN the published version exposes only configured fields and media
- AND saved-but-unpublished edits remain absent

#### Scenario: Incomplete record

- GIVEN a record lacks fields required for its landing presentation
- WHEN an operator tries to publish or the client reads it
- THEN validation blocks publication where configured or the client omits the record
- AND no missing value is fabricated

### Requirement: Consent-Gated Social Proof

Testimonial and RealHome MUST include `consentOnFile`. Testimonial MUST require an attributable quote and display name; RealHome MUST require each displayed photo to have operator-supplied alt text. Only published records with `consentOnFile=true` MAY be returned for public presentation.

#### Scenario: Consented entry

- GIVEN a complete social-proof record has consent on file and is published
- WHEN the landing query runs
- THEN the entry is eligible for public display

#### Scenario: Missing consent or alt text

- GIVEN consent is false or a RealHome photo lacks alt text
- WHEN publication or public selection occurs
- THEN the affected entry or photo is excluded
- AND the CMS does not infer consent or accessibility text

### Requirement: Verified Settings and Private Leads

SiteSetting MUST hold operator-controlled brand, contact, footer, social, metadata, and structured-business facts as optional fields. Lead MUST store only submitted contact details, inquiry context, consent evidence, timestamps, and delivery status needed for follow-up. Unknown facts MUST remain empty.

#### Scenario: Operator supplies settings

- GIVEN verified settings are published
- WHEN the web application reads SiteSetting
- THEN only the published values become eligible for public use

#### Scenario: Editorial state and privacy

- GIVEN a draft setting change and persisted Lead records exist
- WHEN a public request is made
- THEN the draft change and all Lead data remain private
- AND lead retention or deletion can be performed by an authorized operator
