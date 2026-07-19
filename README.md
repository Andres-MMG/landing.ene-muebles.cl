# Ene Muebles Landing Page

Monorepo for the Ene Muebles landing page, focused on catalog discovery and qualified lead capture without inventing business or contact data.

## Target Stack

- Next.js 16 App Router with strict TypeScript
- Tailwind CSS 4 with CSS-first design tokens
- React 19
- Self-hosted Strapi v5 and MySQL in a later slice
- Coolify deployment in a later slice
- pnpm 9 workspace monorepo on Node.js 20 LTS

## Current Status

Slice A / PR-3a provides the pnpm workspace, the shared UI token package, and the Next.js web scaffold. The CMS, Compose deployment, and test runners remain deferred to later pull requests in the `landing-page-initial` chain.

## Monorepo Layout

- `apps/web/` — Next.js App Router application
- `packages/ui-tokens/` — shared Tailwind theme tokens and Chilean Spanish copy
- `openspec/changes/landing-page-initial/` — authoritative proposal, specifications, design, and tasks
- `.github/` — contribution templates and pull-request validation workflows
- `skills-lock.json` — portable source and integrity metadata for project skills

## Development Commands

Use Node.js 20 LTS and pnpm 9.

| Task | Command |
| --- | --- |
| Install dependencies | `pnpm install` |
| Start the web app | `pnpm --filter web dev` |
| Lint the web app | `pnpm --filter web lint` |
| Type-check the web app | `pnpm --filter web typecheck` |

## OpenSpec Change

The active change is `landing-page-initial` under `openspec/changes/landing-page-initial/`. Treat its proposal, capability specifications, design, and task plan as the implementation contract until the change is completed and archived.

## Verified Data Requirement

Business facts must not be invented. Contact details, addresses, operating hours, pricing, testimonials, ratings, social profiles, legal information, and other business claims must remain unset or omitted until the operator provides and verifies them.
