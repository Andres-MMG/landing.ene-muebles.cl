# Coolify Compose Topology

This directory is the single source of truth for the production stack: one
Coolify-routed web service, with Strapi v5 and MySQL 8 isolated on a private
Docker network. Coolify owns the host proxy, TLS certificates, and ports 80/443.

## Services

| Service | Image | Public exposure | Role |
| --- | --- | --- | --- |
| `web` | built from `apps/web/Dockerfile` | Coolify domain → container port `3000` | Next.js 16 App Router |
| `cms` | built from `apps/cms/Dockerfile` | **internal only** | Strapi v5 REST API + admin (operator tunnel) |
| `db` | `mysql:8.0` | **internal only** | Persistent storage |

The Compose stack does not publish host ports or run Traefik. In Coolify,
assign `https://landing.ene-muebles.cl:3000` to `web`; the `:3000` tells
Coolify the container port while its managed proxy handles public routing and
TLS. `cms` and `db` have no public port mapping and are reachable only through
the `landing_internal` bridge network.

## Network

```
Internet -> Coolify proxy (80/443, TLS)
            -> web (3000)
               -> landing_internal -> cms (1337, internal)
                                    -> db  (3306, internal)
```

`web` reaches Strapi over Docker DNS via `STRAPI_INTERNAL_URL`
(`http://cms:1337`). `NEXT_PUBLIC_STRAPI_URL` is intentionally separate: it
must be a browser-reachable media origin and must never be set to `cms`.
No production hostname is baked into the web image.

## Health checks

| Service | Probe | Gates |
| --- | --- | --- |
| `db` | `mysqladmin ping` over TCP | `cms` startup |
| `cms` | `wget --spider http://localhost:1337/admin` | `web` readiness |
| `web` | `wget --spider http://localhost:3000/api/health` | Coolify readiness |

## Volumes

| Volume | Mounted in | Purpose |
| --- | --- | --- |
| `cms_uploads` | `apps/cms/public/uploads` in `cms` | Media library persistence |
| `cms_tmp` | `apps/cms/.tmp` in `cms` | Strapi runtime cache |
| `db_data` | `/var/lib/mysql` in `db` | MySQL data files |

`cms` and `db` roll back independently: revert the image SHA in Coolify
and the volumes are untouched.

## Environment contract

`infrastructure/.env.example` is the source of truth for required
deployment variables. Copy it to `.env`, replace every `CHANGE_ME`
placeholder with a real value, and load via Coolify's Environment UI.
The `.env` filename is ignored by `.gitignore`.

Required variables:

- Public origins: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_STRAPI_URL`
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
services (`web`, `cms`, `db`), no host `ports:` bindings, `web` exposing
container port `3000`, and persistent `cms_uploads`, `cms_tmp`, and `db_data`
volumes.
