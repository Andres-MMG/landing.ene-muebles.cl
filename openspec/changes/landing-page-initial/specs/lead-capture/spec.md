# Lead Capture Specification

## Purpose

Define an accessible, privacy-aware fallback conversion path that persists inquiries.

## Requirements

### Requirement: Frontend Contact Form and Consent

The contact form MUST collect only the minimum contact and inquiry data required for follow-up, display professional Chilean Spanish labels, identify required fields, validate on the server, and require explicit consent to the stated data use.

#### Scenario: Valid submission

- GIVEN a visitor supplies valid required data and consent
- WHEN the form is submitted
- THEN a Lead is persisted once
- AND the visitor receives a clear success response

#### Scenario: Invalid or missing consent

- GIVEN required data is invalid or consent is absent
- WHEN the form is submitted
- THEN no Lead is created
- AND field-specific errors are programmatically associated and announced

### Requirement: Backend Abuse Controls

The submission endpoint MUST enforce 5 submission attempts per minute per client IP and a configured daily cap. It MUST reject oversized, malformed, automated, or repeated payloads without disclosing enforcement internals. Limits MUST apply server-side before persistence.

#### Scenario: Within limit

- GIVEN a valid client remains within both limits
- WHEN it submits an inquiry
- THEN normal validation and persistence proceed

#### Scenario: Limit exceeded

- GIVEN the minute or daily limit is exceeded
- WHEN another submission arrives
- THEN it is rejected with a retry-safe response
- AND no Lead or mirror attempt is created

### Requirement: Backend Persistence Before Optional Mirror

Lead persistence MUST be the source of truth. A WhatsApp mirror MAY run only when operator credentials and configuration exist, and its failure MUST NOT change a successful persisted submission into a user-visible failure.

#### Scenario: Persistence and mirror succeed

- GIVEN Strapi accepts the Lead and mirroring is configured
- WHEN submission completes
- THEN the Lead remains persisted and the mirror is attempted once

#### Scenario: Mirror or CMS failure

- GIVEN the Lead persists but mirroring fails
- WHEN the response is returned
- THEN the visitor still receives success
- AND if Lead persistence fails, the visitor instead receives a recoverable error with direct contact fallback when configured

### Requirement: Backend Privacy and Failure Safety

The system MUST NOT expose Lead records publicly, include sensitive form values in URLs, analytics, client logs, or error messages, or persist data before consent. Stored consent evidence and delivery status MUST be available only to authorized operators. Duplicate retries SHOULD avoid duplicate Leads.

#### Scenario: Private processing

- GIVEN a Lead has been persisted
- WHEN a public client or crawler requests lead data
- THEN access is denied and no personal data is returned

#### Scenario: Network retry

- GIVEN a submission result is uncertain due to a network interruption
- WHEN the same logical submission is retried
- THEN the system SHOULD return or produce one effective Lead
- AND the visitor is not encouraged to disclose details through an unsafe channel
