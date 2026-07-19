# Landing Page Composition Specification

## Purpose

Define the ordered, responsive landing experience and its conversion hierarchy.

## Requirements

### Requirement: Ordered Conversion Narrative

The page MUST render one document in this order: sticky navigation, hero, category grid, featured catalog, family story, expert advice preview, testimonials and real homes, FAQ, and footer. A floating WhatsApp control MUST remain outside that sequence. The hero MUST prioritize WhatsApp and provide a secondary catalog anchor. A visible secondary contact action MUST reach the contact form without inserting a new top-level section that changes this order.

#### Scenario: Complete page

- GIVEN all publishable content is available
- WHEN `/` renders
- THEN the sections appear in the required DOM order with exactly one H1
- AND primary CTAs lead to the WhatsApp handoff

#### Scenario: Mobile navigation

- GIVEN a 390-pixel viewport
- WHEN the visitor navigates the page
- THEN content remains in the same order without horizontal overflow
- AND navigation and conversion controls remain operable

### Requirement: Section Editorial Limits and Fallbacks

The page MUST show at most 8 categories and 3 article previews. CMS-backed sections MUST omit invalid entries and MUST use a defined empty or unavailable state without inventing content. The file-backed family story MUST remain available during CMS failure, but unverified founder, year, location, material, or process facts MUST be omitted or marked for operator completion outside the public UI.

#### Scenario: Empty CMS collections

- GIVEN no publishable categories, products, articles, testimonials, real homes, or FAQs exist
- WHEN the page renders
- THEN the stable sections and contact path remain available
- AND empty sections are omitted or show professional Chilean Spanish fallback copy

#### Scenario: CMS unavailable

- GIVEN CMS requests fail
- WHEN the page renders
- THEN the page returns a usable degraded experience rather than a blank or error-only document
- AND the family story and configured contact fallback remain available

### Requirement: Brand and Content Language

Public UI copy MUST use professional Chilean Spanish. The page MUST use the approved ink, taupe, cream, and paper palette and Source Serif 4 with Hanken Grotesk. Missing business facts MUST NOT be replaced with plausible values.

#### Scenario: Approved presentation

- GIVEN the landing page is rendered
- WHEN brand tokens and copy are inspected
- THEN the approved palette and font roles are used consistently
- AND public labels and messages are in professional Chilean Spanish

#### Scenario: Unknown business fact

- GIVEN an operator has not supplied a business fact
- WHEN a component would otherwise display it
- THEN the fact-dependent element is omitted or uses a non-factual fallback
- AND no invented value appears

### Requirement: Progressive and Reduced Motion

Content MUST be available without entrance animation. Motion MAY enhance interaction, but MUST preserve meaning and MUST honor `prefers-reduced-motion`.

#### Scenario: Standard motion

- GIVEN motion is permitted
- WHEN the page loads or a control changes state
- THEN any animation does not delay access to content or conversion controls

#### Scenario: Reduced motion

- GIVEN reduced motion is requested
- WHEN the same interactions occur
- THEN nonessential movement is removed or replaced by an immediate state change
