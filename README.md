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

Slice A / PR-3a provides the pnpm workspace, the shared UI token package, and the Next.js web scaffold. Slice B / PR-3b adds the Strapi v5 bootstrap, the Coolify Compose stack, and the environment contract. The full content types, seed scripts, populated REST queries, and test runners remain deferred to later pull requests in the `landing-page-initial` chain.

## Monorepo Layout

- `apps/web/` — Next.js App Router application
- `apps/cms/` — Strapi v5 placeholder scaffold (`site-setting` singleton only)
- `packages/ui-tokens/` — shared Tailwind theme tokens and Chilean Spanish copy
- `infrastructure/` — Coolify Compose stack (`web`, `cms`, `db`)
- `openspec/changes/landing-page-initial/` — authoritative proposal, specifications, design, and tasks
- `.github/` — contribution templates and pull-request validation workflows
- `skills-lock.json` — portable source and integrity metadata for project skills

## Development Commands

Use Node.js 20 LTS and pnpm 9.

| Task | Command |
| --- | --- |
| Install dependencies | `pnpm install` |
| Start the web app | `pnpm --filter web dev` |
| Start the CMS in dev mode | `pnpm --filter cms develop` |
| Build the web app for production | `pnpm --filter web build` |
| Build the CMS for production | `pnpm --filter cms build` |
| Lint the web app | `pnpm --filter web lint` |
| Type-check the web app | `pnpm --filter web typecheck` |
| Validate the Coolify Compose stack | `docker compose -f infrastructure/docker-compose.yml config` |

## Production Topology

The Coolify Compose stack in `infrastructure/` is the single source of truth
for the production layout: Coolify's managed proxy fronts the public web
service and routes the full `cms.ene-muebles.cl` host to the CMS on port 1337,
including Strapi `/admin`, `/api/admin`, `/api`, uploads, and static admin
assets. MySQL remains on the private Docker network. See
`infrastructure/README.md` for the full topology, health checks, volumes, and
environment contract.

Required deployment variables live in `infrastructure/.env.example`. Copy to
`.env`, generate real secret values, and load them via Coolify's Environment
UI. The `.env` filename is ignored by `.gitignore`; only `.env.example` files
are tracked.

## OpenSpec Change

The active change is `landing-page-initial` under `openspec/changes/landing-page-initial/`. Treat its proposal, capability specifications, design, and task plan as the implementation contract until the change is completed and archived.

## Verified Data Requirement

Business facts must not be invented. Contact details, addresses, operating hours, pricing, testimonials, ratings, social profiles, legal information, and other business claims must remain unset or omitted until the operator provides and verifies them.
