# Catalog content

Slice D introduces the customer-facing catalog: a furniture collection
managed in Strapi v5 and rendered by the Next.js site. This document
describes the deliverables, how to operate them locally, and the
contracts the team should know before publishing.

## Local stack

```powershell
docker compose down
.\scripts\local-up.ps1
```

The script copies `infrastructure/.env.local.example` to
`infrastructure/.env.local`, generates cryptographically random application
and database secrets on the first run, and starts the four services. Strapi API
tokens are not generated: Strapi issues them after its first bootstrap. The
stack is healthy when every container reports `healthy` in `docker compose ps`.

| Service | Local URL | Notes |
| --- | --- | --- |
| Next.js site | http://localhost:4780 | Public marketing + catalog |
| Strapi admin | http://localhost:4781/admin | First-run installer for the Super Admin |
| MySQL | localhost:4782 | Credentials live in `infrastructure/.env.local` |
| Traefik dashboard | http://localhost:4785/dashboard/ | Local diagnostics only |

## Admin users

There are two roles in the local CMS:

- **Owner / Super Admin.** Created on first run at
  `http://localhost:4781/admin`. This is the only account Strapi can
  create unattended; the bootstrap intentionally does not touch it.
- **Editor (cliente@ene-muebles.cl).** Created by the Strapi
  `bootstrap()` hook in `apps/cms/src/index.ts` on every container
  start when `CLIENT_ADMIN_PASSWORD` is set. The bootstrap never provides a
  fallback password. The role is scoped to the Content Manager for `product`
  and `category` only — no access to
  `site-setting`, Settings, Plugins, Marketplace, or any other admin
  panel.

### What the Editor can and cannot do

| Action | Editor |
| --- | --- |
| View Products | yes |
| Create Product | yes |
| Update Product | yes |
| Delete Product | **no** (Super Admin only) |
| Publish Product | **no** (Super Admin only — products are created as drafts and require Super Admin to publish) |
| View Categories | yes |
| Create/Update Category | yes |
| Delete Category | **no** |
| View Site Setting | **no** (config is reserved for Super Admin) |
| View other plugins | **no** (no Upload library in the left menu) |

The Editor logs in at `http://localhost:4781/admin` with
`cliente@ene-muebles.cl` and the password from `CLIENT_ADMIN_PASSWORD`.
The left nav will show only **Content Manager → Product** and
**Content Manager → Category**.

### Rotating the client password

The bootstrap is idempotent: if the user already exists, it does not
re-create it. The simplest path to rotate the password is to delete
the user in the Strapi admin and let the next container start
recreate it, or to update `CLIENT_ADMIN_PASSWORD` in
`infrastructure/.env.local` and run a one-shot reset script
(throwaway: log in as Super Admin, call
`strapi.service('admin::user').resetPasswordByEmail(email, password)`).

If the Editor account is locked out because the password-hash lifecycle
did not run on a previous bootstrap (older code path), delete the
record directly: `strapi.db.query('admin::user').delete({ where: { email } })`,
then restart the container so the bootstrap recreates it.

## Content types

| Type | UID | Kind | Notes |
| --- | --- | --- | --- |
| Product | `api::product.product` | collectionType | Furniture items with images, price, dimensions, materials |
| Category | `api::category.category` | collectionType | Living, Dormitorio, Comedor (3 seeded) |
| Site Setting | `api::site-setting.site-setting` | singleType | Site-wide config: siteName, tagline, contact, socialLinks, etc. |

The Public role is granted `find` and `findOne` on these three types so
the Next.js site can read them without a session. Writes require an
authenticated admin user.

## API token

The public catalog reads without `STRAPI_API_TOKEN` when the Strapi Public role
has its documented read permissions. To use a read token instead, create one
after the CMS has bootstrapped:

1. Open `http://localhost:4781/admin` and log in as the Super Admin.
2. Settings → API Tokens → Create new API Token.
3. Type: **Custom**. Name: `next-web-readonly`. Token duration: **Unlimited**.
4. Token type: **Read-only** is enough; the site never writes.
5. Copy the token into `infrastructure/.env.local` as `STRAPI_API_TOKEN=...`
   and restart the web container.

For protected Next.js admin operations, create a separately scoped
`STRAPI_ADMIN_TOKEN` after bootstrap and inject it into `.env.local` (or
Coolify in production). Neither token is a cryptographic secret that can be
locally generated.

## Seed data

`apps/cms/scripts/seed.cjs` posts the two institutional categories
(Oficina, Escolar) and the site-setting singleton. It does **not**
seed products — the catalog of 20 products is owned by
`apps/cms/scripts/_scrape/replace-catalog.cjs` (which scrapes
`ene-muebles.cl`, generates AI fallback images for slots without
photos, and uploads everything to Strapi). The seed is idempotent —
every entity is checked by slug before creation.

```bash
# From the repo root
STRAPI_URL=http://localhost:4781 \
STRAPI_API_TOKEN=<your-token> \
node apps/cms/scripts/seed.cjs
```

Run it once after creating the API token. Re-running is safe; existing
records are skipped.

## Catalog surface (Next.js)

| Route | Source | Description |
| --- | --- | --- |
| `/` | `app/(marketing)/page.tsx` | Hero, about, categories grid, featured products, contact CTA, footer |
| `/catalogo` | `app/catalogo/page.tsx` | Full catalog with category filter pills |
| `/categoria/[slug]` | `app/categoria/[slug]/page.tsx` | Products filtered by category |
| `/producto/[slug]` | `app/producto/[slug]/page.tsx` | Product detail with gallery, related products, WhatsApp CTA |

All pages read from Strapi through `apps/web/src/lib/strapi.ts` with
ISR (`revalidate: 60`). Errors propagate to the route's error boundary
so a Strapi outage does not silently mask itself as empty content.

## Style and product surface

The catalog uses the existing `packages/ui-tokens` palette (cream,
taupe, paper, ink) and the `Source Serif 4` + `Hanken Grotesk` pairing.
All visual choices live in Tailwind utilities inside the components —
no `tailwind.config.js` change was needed. Product photography is
expected to be uploaded directly to the Strapi media library per
record; the public site renders the first image as the cover and the
next three as a gallery strip on the product detail page.

## Tests

```bash
pnpm test
```

Runs the Vitest suite in `apps/web/src/lib/strapi.test.ts`, which mocks
`fetch` and exercises `getSiteSettings`, `getCategories`, `getProducts`,
`getProductBySlug`, `formatPrice`, and `buildWhatsAppLink`.
