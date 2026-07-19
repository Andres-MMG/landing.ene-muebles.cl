# WhatsApp Handoff Specification

## Purpose

Define the primary user-initiated contact handoff and its operator-data fallbacks.

## Requirements

### Requirement: Verified Deep Links

Nav, hero, footer, floating, and product inquiry actions MUST use a single handoff builder. A WhatsApp URL MAY be produced only from an operator-supplied E.164 number. Prefilled text MUST be professional Chilean Spanish, URL-encoded, and limited to non-sensitive intent and optional product context.

#### Scenario: General handoff

- GIVEN a verified WhatsApp number is published
- WHEN a visitor activates a general WhatsApp CTA
- THEN a valid `wa.me` destination opens with the configured general inquiry text

#### Scenario: Product handoff

- GIVEN an eligible product is visible
- WHEN its inquiry CTA is activated
- THEN the message identifies that published product without adding price, availability, or personal data

### Requirement: Conditional Contact Fallback

When the WhatsApp number is absent or invalid, handoff actions MUST use the verified contact email as `mailto:` fallback. When neither value exists, external handoff actions MUST be omitted or disabled with an accessible explanation, while the contact form remains available.

#### Scenario: Email fallback

- GIVEN no valid WhatsApp number and a verified contact email exist
- WHEN a handoff CTA is activated
- THEN the email client opens with a safe inquiry subject or body

#### Scenario: No operator contact data

- GIVEN neither contact value is configured
- WHEN the page renders
- THEN no fabricated or broken destination is emitted
- AND the on-page form remains the conversion path

### Requirement: Accessible Responsive Interaction

Every handoff action MUST be keyboard reachable, have a descriptive accessible name, expose visible focus, and provide a usable target on mobile. The floating control MUST have a Spanish `aria-label` and MUST NOT obscure page content or form controls at 390×844.

#### Scenario: Keyboard activation

- GIVEN a visitor uses only a keyboard
- WHEN focus reaches any handoff action and it is activated
- THEN the same verified destination is opened as for pointer activation

#### Scenario: Mobile placement

- GIVEN a 390×844 viewport
- WHEN the floating action is present
- THEN it remains reachable without covering critical content
- AND zoom and page scrolling remain available

### Requirement: User Intent and Privacy

No handoff MUST occur before an explicit click or keyboard activation. The feature MUST NOT load third-party tracking scripts, set marketing cookies, or send page or visitor data to WhatsApp before activation.

#### Scenario: Page load

- GIVEN the landing page loads
- WHEN the visitor does not activate a handoff control
- THEN no WhatsApp navigation or third-party request occurs

#### Scenario: Unsafe configured value

- GIVEN operator data contains an unsupported scheme or injected characters
- WHEN a link is built
- THEN the value is rejected and fallback policy applies
- AND executable or malformed markup is not emitted
