# Coolify Compose Topology

This directory is the single source of truth for the production stack: a
Coolify-routed web service, with Strapi v5 and MySQL 8 on a private Docker
network. Coolify owns the host proxy, TLS certificates, and ports 80/443.

## Services

| Service | Image | Public exposure | Role |
| --- | --- | --- | --- |
| `web` | built from `apps/web/Dockerfile` | Coolify domain → container port `3000` | Next.js 16 App Router |
| `cms` | built from `apps/cms/Dockerfile` | Coolify public host: `/api` + `/uploads` only | Strapi v5 REST API and media; admin remains internal |
| `db` | `mysql:8.0` | **internal only** | Persistent storage |

The Compose stack does not publish host ports or run Traefik. Coolify routes the
web service to container port `3000`. Its managed proxy also routes only
`https://${CMS_PUBLIC_HOSTNAME}/api/**` and
`https://${CMS_PUBLIC_HOSTNAME}/uploads/**` to the CMS on port `1337`.
The CMS admin UI and every other CMS path have no public router; operators reach
them over the private network. `db` has no public route or port mapping.

## Network

```
Internet -> Coolify proxy (80/443, TLS)
            -> web (3000)
               -> landing_internal -> cms (1337, internal)
                                    -> db  (3306, internal)
            -> cms (1337): CMS_PUBLIC_HOSTNAME /api + /uploads only
```

`web` reaches Strapi over Docker DNS via `STRAPI_INTERNAL_URL`
(`http://cms:1337`). `NEXT_PUBLIC_STRAPI_URL` is intentionally separate: it
MUST be `https://${CMS_PUBLIC_HOSTNAME}` so browsers can fetch media and the
limited public API. It is passed as a Docker build argument because Next.js
inlines `NEXT_PUBLIC_*` values into browser bundles. No server-only token or
secret is passed as a build argument or embedded in the image.

## Health checks

| Service | Probe | Gates |
| --- | --- | --- |
| `db` | `mysqladmin ping` over TCP | `cms` startup |
| `cms` | `wget --spider http://localhost:1337/admin` | `web` readiness |
| `web` | `wget --spider http://localhost:3000/api/health` | Container liveness only; it does not probe CMS or MySQL |

## Volumes

| Volume | Mounted in | Purpose |
| --- | --- | --- |
| `cms_uploads` | `apps/cms/public/uploads` in `cms` | Media library persistence |
| `cms_tmp` | `apps/cms/.tmp` in `cms` | Strapi runtime cache |
| `db_data` | `/var/lib/mysql` in `db` | MySQL data files |

`cms` and `db` roll back independently: revert the image SHA in Coolify
and the volumes are untouched.

## Environment contract

`infrastructure/.env.example` is the source of truth for required deployment
variables. Copy it to `.env`, generate strong values for every secret, and load
them via Coolify's Environment UI. Compose uses required-variable expansion so
production startup fails before serving traffic when a value is missing. The
`.env` filename is ignored by `.gitignore`.

Required variables:

- Public origins: `NEXT_PUBLIC_SITE_URL`, `CMS_PUBLIC_HOSTNAME`,
  `NEXT_PUBLIC_STRAPI_URL` (must be `https://${CMS_PUBLIC_HOSTNAME}`)
- Internal service URL: `STRAPI_INTERNAL_URL`
- Web secrets: `STRAPI_API_TOKEN` (read-only), `STRAPI_ADMIN_TOKEN`
  (least-privileged admin), `REVALIDATE_SECRET`, `ADMIN_SESSION_SECRET`,
  `NEXT_PUBLIC_FEATURE_LEAD_FORM`
- Strapi secrets: `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`,
  `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `CLIENT_ADMIN_PASSWORD`
- MySQL: `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`,
  `MYSQL_ROOT_PASSWORD`

Optional business facts (set later, once verified): WhatsApp number,
contact email, physical address, social profile URLs.

## Local development

Slice B is a Coolify-only artifact. Local development of the web and
CMS surfaces runs against each surface's own dev server, not through
this compose file:

```bash
pnpm --filter web dev      # http://localhost:3000
pnpm --filter cms develop  # http://localhost:1337
```

The dev compose path is introduced in a later slice.

## Validation

```bash
docker compose -f infrastructure/docker-compose.yml config
```

The command must exit `0`. The rendered output must show exactly three
services (`web`, `cms`, `db`), no host `ports:` bindings, a `web` build argument
for `NEXT_PUBLIC_STRAPI_URL`, CMS router labels limited to `/api` and `/uploads`,
