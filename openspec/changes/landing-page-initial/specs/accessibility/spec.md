# Accessibility Specification

## Purpose

Define WCAG 2.1 AA behavior for the landing page and conversion flows.

## Requirements

### Requirement: Semantic Structure and Navigation

The page MUST provide one H1, logical heading levels, semantic landmarks, a skip link, descriptive links, and DOM order matching visual order. Sticky navigation and all conversion actions MUST be usable by keyboard and assistive technology.

#### Scenario: Keyboard journey

- GIVEN a visitor uses only a keyboard
- WHEN they traverse the page from load
- THEN focus moves predictably through navigation, content, CTAs, form, FAQ, and footer
- AND focus is always visible

#### Scenario: Narrow viewport

- GIVEN a 390×844 viewport at 200% zoom
- WHEN the visitor navigates and reads the page
- THEN content reflows without two-dimensional scrolling except essential media
- AND sticky or floating controls do not obscure focused content

### Requirement: Accessible Content and Media

Informative images MUST use operator-supplied meaningful alt text; decorative images MUST have empty alt text. A RealHome photo without alt text MUST NOT be displayed. Text and controls MUST meet WCAG AA contrast, and touch targets SHOULD be at least 44 by 44 CSS pixels.

#### Scenario: Complete media

- GIVEN a published image has valid alt text
- WHEN it is rendered
- THEN assistive technology receives the intended description

#### Scenario: Missing image data

- GIVEN media is absent or required alt text is missing
- WHEN a section renders
- THEN the image or affected record is omitted without a broken control
- AND surrounding content retains meaning

### Requirement: Native and Managed Interactions

FAQ items MUST use accessible disclosure semantics equivalent to `details` and `summary`. A RealHome lightbox, when present, MUST identify its dialog role, move focus inside, support Escape, contain focus, and restore focus to its trigger when closed.

#### Scenario: FAQ interaction

- GIVEN a visitor operates a FAQ with keyboard or screen reader
- WHEN a question is toggled
- THEN expanded state and answer content are perceivable

#### Scenario: Lightbox close

- GIVEN a photo dialog is open
- WHEN the visitor presses Escape
- THEN the dialog closes and focus returns to the launching photo

### Requirement: Forms, Status, and Motion

Form labels, requirements, instructions, errors, rate-limit messages, and submission status MUST be programmatically associated and announced without color alone. The page MUST honor reduced-motion preferences and MUST NOT gate content behind animation.

#### Scenario: Form error

- GIVEN a submission contains invalid fields
- WHEN validation completes
- THEN focus reaches an error summary or first invalid field
- AND each error identifies the corrective action in Spanish

#### Scenario: Reduced motion

- GIVEN `prefers-reduced-motion` is enabled
- WHEN interactive states or the lightbox change
- THEN nonessential animation is disabled without losing state feedback

### Requirement: Automated Accessibility Gate

The production landing route MUST report zero axe-core WCAG 2.1 AA violations at 390×844 and 1440×900.

#### Scenario: Accessibility verification

- GIVEN the production-equivalent page and representative CMS content
- WHEN axe-core runs at both required viewports
- THEN no WCAG 2.1 AA violations are reported
