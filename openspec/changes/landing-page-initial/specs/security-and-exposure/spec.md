# Security and Exposure Specification

## Purpose

Define trust boundaries for the public web surface, private CMS, content API, and lead data.

## Requirements

### Requirement: Public Exposure Boundary

Only the web service MUST be publicly routable. Strapi admin, Strapi API, and MySQL MUST remain on private service networks; `cms.landing.ene-muebles.cl` MUST return 404 or be unreachable publicly. Operator admin access MUST require the approved tunnel or VPN.

#### Scenario: Public web access

- GIVEN production deployment is healthy
- WHEN the landing origin is requested over HTTPS
- THEN the web route returns 200 without exposing internal service addresses

#### Scenario: Public CMS probe

- GIVEN an internet client requests the CMS hostname or database port
- WHEN routing is evaluated
- THEN no admin, API, database banner, or login surface is reachable

### Requirement: Least-Privilege API Access

Server-to-server catalog reads MUST use a read-only token limited to required published content. Lead creation MUST use a separate least-privilege credential or controlled internal endpoint. Tokens, database credentials, and mirror credentials MUST remain server-side and MUST NOT be committed, serialized, logged, or sent to browsers.

#### Scenario: Authorized content read

- GIVEN the web service holds a valid read token
- WHEN it requests required published fields
- THEN the CMS returns permitted content only

#### Scenario: Token misuse

- GIVEN a read token is used for Lead access, mutation, or admin access
- WHEN the request is made
- THEN access is denied

### Requirement: Browser and Origin Protections

The web response MUST apply an explicit CSP and appropriate security headers. CMS CORS MUST allow only `https://landing.ene-muebles.cl` and `http://localhost:3000` where browser access is required, and MUST reject unlisted origins. Allowed sources MUST be limited to those required for self-hosted assets and explicit handoff navigation.

#### Scenario: Approved origin

- GIVEN an allowed origin makes a permitted request
- WHEN CORS is evaluated
- THEN only the required method and headers are authorized

#### Scenario: Unapproved origin or script

- GIVEN an unlisted origin or injected script attempts access
- WHEN policy is enforced
- THEN the request or execution is blocked without weakening the policy globally

### Requirement: Safe Input and Output

Lead input MUST be length-bounded, validated, rate-limited, and safely encoded. CMS text used in HTML, metadata, links, and JSON-LD MUST remain inert. Error responses MUST NOT disclose stack traces, credentials, database details, personal data, or internal topology.

#### Scenario: Malicious input

- GIVEN a lead or CMS field contains markup, script, control characters, or an unsafe URL
- WHEN it is processed
- THEN executable output and unsafe navigation are prevented
- AND valid neighboring content remains usable

#### Scenario: Dependency failure

- GIVEN CMS, database, or mirror processing fails
- WHEN an error reaches the public boundary
- THEN the user receives a generic recoverable message
- AND operational detail remains in access-controlled diagnostics without sensitive payload values

### Requirement: Lead Privacy

Lead records MUST be non-public and accessible only to authorized operators. Logs MUST minimize IP and contact data, and consent evidence MUST accompany retained inquiry data.

#### Scenario: Unauthorized lead request

- GIVEN a public or catalog credential requests Lead data
- WHEN authorization runs
- THEN no Lead fields are returned

#### Scenario: Missing consent

- GIVEN a submission lacks valid consent
- WHEN it reaches persistence
- THEN no personal inquiry data is stored
