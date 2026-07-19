# Project Context — landing.ene-muebles.cl

## Goal
High-conversion landing page for **Ene Muebles** (Chilean furniture brand). The
page must capture qualified leads and drive WhatsApp / contact-form conversions
for a self-hosted catalog backed by Strapi.

## Declared Stack (target — not yet scaffolded)
- **Frontend:** Next.js (App Router) + Tailwind CSS
- **CMS / Backend:** self-hosted Strapi v5
- **Database:** MySQL
- **Hosting:** self-hosted via Coolify (project skills `coolify` + `coolify-deploy`)
- **Language:** TypeScript (assumed — confirm during sdd-explore)

## Repository State (detected 2026-07-19)
- Empty repository. Only metadata present:
  - `.agents/skills/` — 7 project-level skills (coolify, coolify-deploy,
    impeccable, seo-aeo-best-practices, seo-geo-aeo, strapi-v5-expert,
    tailwind-css-patterns)
  - `.atl/skill-registry.md` — pre-existing registry index
  - `.claude/skills/` — mirror of project skills
  - `skills-lock.json` — skill version pins (all 7 project skills locked)
- No `package.json`, no source code, no test runner, no CI config.

## Conventions
- Public UI copy: Spanish (per product brief, Chilean Spanish).
- SDD technical artifacts: English (Language Domain Contract).
- Use atomic design and container-presentational patterns (per persona defaults).
- Vertical slices preferred for landing-page sections (hero, social proof,
  catalog teaser, testimonials, FAQ, lead form, footer).

## Architecture Notes
- Two deployable surfaces:
  1. Next.js frontend (static / ISR for landing, server actions for form).
  2. Strapi v5 backend (REST/GraphQL, content types for products, testimonials,
     FAQs, lead submissions).
- Inter-service boundary: Next.js fetches from Strapi over internal Docker
  network on Coolify (no public Strapi exposure).
- Lead capture: form posts to Next.js route handler → forwards to Strapi
  (validated, rate-limited) AND mirrors to WhatsApp notification webhook.

## Available Project Skills
| Skill | Path |
| --- | --- |
| `impeccable` | `.agents/skills/impeccable/SKILL.md` |
| `seo-aeo-best-practices` | `.agents/skills/seo-aeo-best-practices/SKILL.md` |
| `seo-geo-aeo` | `.agents/skills/seo-geo-aeo/SKILL.md` |
| `strapi-v5-expert` | `.agents/skills/strapi-v5-expert/SKILL.md` |
| `tailwind-css-patterns` | `.agents/skills/tailwind-css-patterns/SKILL.md` |
| `coolify` | `.agents/skills/coolify/SKILL.md` |
| `coolify-deploy` | `.agents/skills/coolify-deploy/SKILL.md` |

## Detected Commands
None. Repository must be scaffolded before any command can be detected.

## Strict TDD
**Disabled** at init time. No test runner present. Re-evaluate after scaffold.

## Next Phase
Run `sdd-explore landing-page-initial` to clarify conversion goals, copy,
content schema, and form flow before generating the proposal.
