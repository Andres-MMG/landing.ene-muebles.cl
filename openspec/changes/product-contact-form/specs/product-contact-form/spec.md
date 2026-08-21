# Product Contact Form Specification

## Purpose

Define product-aware contact capture by reusing the shared form while preserving general inquiries and the existing WhatsApp conversion path.

## Requirements

### Requirement: Product CTA opens the shared form

The product page MUST replace the email `mailto:` handoff with `/contacto` navigation carrying the product slug. The WhatsApp CTA MUST remain independently available and unchanged.

#### Scenario: Product email CTA

- GIVEN a visitor views an active product
- WHEN they select “Enviar correo”
- THEN the shared contact form opens with that product context requested

#### Scenario: WhatsApp remains available

- GIVEN a visitor views a product
- WHEN they select the WhatsApp CTA
- THEN the existing WhatsApp destination and behavior are used without contact-form state

### Requirement: Shared form provides product and general choices

The contact page MUST reuse the existing lead form and provide “Pregunta general” as the first enabled option, followed by active, published products. A general selection MUST submit no product context.

#### Scenario: Product selection

- GIVEN an active published product is listed
- WHEN the visitor selects it and submits valid data
- THEN the lead request carries the selected product context for server verification

#### Scenario: General inquiry

- GIVEN “Pregunta general” is selected
- WHEN the visitor submits valid data
- THEN the lead is created with a null product snapshot

### Requirement: Product context falls back safely

The system MUST resolve product context server-side. Missing, malformed, stale, deleted, inactive, unpublished, or tampered context MUST resolve to “Pregunta general” and MUST NOT attribute a client-provided label.

#### Scenario: Stale product reference

- GIVEN a previously valid product is no longer active and published
- WHEN the contact page or lead endpoint resolves its slug
- THEN the form uses “Pregunta general” and the lead product remains null

#### Scenario: Recoverable form failure

- GIVEN required data, consent, or server validation is invalid
- WHEN the visitor submits the shared form
- THEN actionable field-level errors are shown and entered values and selection are retained

#### Scenario: Unexpected submission failure

- GIVEN the lead request fails unexpectedly
- WHEN the form receives the failure
- THEN a retry-safe general error is shown, duplicate submission is prevented while pending, and form state is preserved
