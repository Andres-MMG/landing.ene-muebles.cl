# Performance Budget Specification

## Purpose

Define measurable loading and rendering budgets for the landing route.

## Requirements

### Requirement: Quality Gates

The production-equivalent landing route MUST score at least 95 for Lighthouse Performance, Best Practices, and SEO under simulated mobile 4G, with LCP at or below 2.5 seconds. CLS SHOULD remain at or below 0.1 and INP SHOULD remain at or below 200 milliseconds.

#### Scenario: Representative content

- GIVEN representative maximum section content is published
- WHEN Lighthouse CI runs under the defined profile
- THEN all three required scores are at least 95
- AND LCP is at most 2.5 seconds

#### Scenario: Gate regression

- GIVEN a build misses any mandatory threshold
- WHEN verification completes
- THEN the build is reported as failing rather than silently accepted

### Requirement: Optimized Media

Landing images MUST have explicit intrinsic dimensions, responsive sizing, and optimized AVIF or WebP delivery. The LCP hero image MUST be prioritized; noncritical images MUST defer loading. Each delivered content image SHOULD remain at or below 150 KB for its tested viewport.

#### Scenario: Hero loading

- GIVEN a valid hero image exists
- WHEN the page loads on simulated mobile 4G
- THEN its space is reserved and the suitable optimized source is requested early

#### Scenario: Missing or oversized media

- GIVEN media is missing or exceeds the budget
- WHEN the page is rendered or verified
- THEN layout remains stable
- AND the violation is omitted safely or reported for editorial correction

### Requirement: Font Stability

Source Serif 4 and Hanken Grotesk MUST use swap behavior and MUST NOT block access to text. Required subsets and weights MUST be minimized, and layout SHOULD remain stable when the web fonts replace fallback fonts.

#### Scenario: Font available

- GIVEN font resources load successfully
- WHEN text renders
- THEN approved font roles appear without invisible text

#### Scenario: Font failure

- GIVEN font resources fail or are delayed
- WHEN the page renders
- THEN readable fallback text remains available without blocking conversion

### Requirement: Minimal Client Work

Core content, metadata, and JSON-LD MUST be present in server-rendered HTML. The page MUST NOT load third-party JavaScript; client behavior MUST be limited to interactions that require it and MUST honor reduced motion. CMS fetches MUST NOT occur from the browser.

#### Scenario: Script-disabled rendering

- GIVEN client scripting is unavailable
- WHEN the route loads
- THEN core sections, contact information, FAQ content, and crawl metadata remain readable

#### Scenario: Interaction enhancement

- GIVEN client scripting is available
- WHEN the visitor uses the floating handoff or gallery
- THEN only the required behavior activates
- AND no tracking dependency is introduced

### Requirement: Resilient Caching

Catalog, FAQ/settings, and hero content MUST use maximum freshness windows of 300, 3600, and 86400 seconds respectively. A transient CMS failure SHOULD serve a prior valid response rather than increasing load time with repeated blocking retries.

#### Scenario: Warm response

- GIVEN valid cached content exists
- WHEN a visitor requests the page within its freshness window
- THEN the response does not wait on an unnecessary CMS round trip

#### Scenario: CMS timeout

- GIVEN revalidation times out
- WHEN a visitor requests the page
- THEN prior valid content or the defined degraded state renders within the page budget
