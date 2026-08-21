# Lead Capture Specification

## Purpose

Constrain new lead submissions to the approved service area without changing the existing Lead snapshot or historical-read behavior.

## Requirements

### Requirement: New leads accept only supported regions

The lead boundary MUST accept only Valparaíso, Metropolitana, O’Higgins, Maule, Ñuble, Biobío, La Araucanía, Los Ríos, and Los Lagos. The server MUST be authoritative regardless of client-rendered options.

#### Scenario: Allowed region

- GIVEN a new submission contains one of the nine supported regions
- WHEN server validation runs
- THEN the submission may proceed with its verified product name or null product

#### Scenario: Unsupported or invalid region

- GIVEN a new submission contains any other region, a malformed value, or no valid region
- WHEN server validation runs
- THEN the request is rejected with a field-addressable validation error
- AND no lead is created or delivered

### Requirement: Product snapshots and historical leads remain compatible

The system MUST continue using the nullable Lead `product` string as a readable snapshot: verified product names are stored, general inquiries are stored as null, and the transient slug MUST NOT be persisted. Existing consent, rate limiting, honeypot, idempotency, delivery, admin access, and CRUD behavior MUST remain compatible.

#### Scenario: Historical out-of-area lead

- GIVEN an existing lead contains a region outside the new allowlist
- WHEN staff retrieve or display that lead
- THEN it remains readable and unchanged

#### Scenario: Product renamed or deleted after submission

- GIVEN a lead contains a previously stored product name
- WHEN the product is later renamed, unpublished, or deleted
- THEN the lead retains its historical readable snapshot

### Requirement: Server fallback and error contract

The server MUST normalize “Pregunta general”, empty product context, and invalid product slugs to null, and MUST return a recoverable validation response for invalid input without creating a partial lead.

#### Scenario: Tampered product attribution

- GIVEN a client submits an arbitrary product label or stale slug
- WHEN the server validates the request
- THEN it ignores the label, resolves the context to null, and does not confirm product attribution

#### Scenario: Existing WhatsApp flow

- GIVEN a visitor chooses WhatsApp instead of email
- WHEN they activate the WhatsApp CTA
- THEN the existing WhatsApp flow proceeds without requiring lead creation or changing lead semantics
