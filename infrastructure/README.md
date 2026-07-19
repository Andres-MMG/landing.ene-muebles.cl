# Coolify Compose Topology

This directory is the single source of truth for the production stack: a
Traefik v3 reverse proxy fronting one public web service, with Strapi v5
and MySQL 8 isolated on a private Docker network.

## Services

| Service | Image | Public exposure | Role |
| --- | --- | --- | --- |
| `proxy` | `traefik:v3.1` | host ports `80`, `443` | TLS termination and ACME |
| `web` | built from `apps/web/Dockerfile` | Traefik router on `landing.ene-muebles.cl` | Next.js 16 App Router |
| `cms` | built from `apps/cms/Dockerfile` | **internal only** | Strapi v5 REST API + admin (operator tunnel) |
| `db` | `mysql:8.0` | **internal only** | Persistent storage |

Only `proxy` publishes host ports. `cms` and `db` have no `ports:`
mapping and no `traefik.enable=true` label — they are reachable only
through the `landing_internal` bridge network.

## Network

```
Internet -> proxy (80/443, TLS, ACME)
            -> landing_internal -> web (3000, public Traefik labels)
                                 -> cms (1337, internal)
                                 -> db  (3306, internal)
```

`web` reaches Strapi over Docker DNS via `CMS_INTERNAL_URL`
(`http://cms:1337`). No production hostname is baked into the web image.

## Health checks

| Service | Probe | Gates |
| --- | --- | --- |
| `db` | `mysqladmin ping` over TCP | `cms` startup |
| `cms` | `wget --spider http://localhost:1337/_health` | `web` readiness |
| `web` | inherited from Coolify | optional `/api/health` route lives in `apps/web` |

## Volumes

| Volume | Mounted in | Purpose |
| --- | --- | --- |
| `proxy_letsencrypt` | `/letsencrypt` in `proxy` | ACME account and certificates |
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

- Public origin: `NEXT_PUBLIC_SITE_URL`, `DOMAIN`, `CMS_INTERNAL_URL`
- Web secrets: `STRAPI_API_TOKEN`, `REVALIDATE_SECRET`,
  `NEXT_PUBLIC_FEATURE_LEAD_FORM`
- Let's Encrypt: `LETSENCRYPT_EMAIL`
- Strapi secrets: `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`,
  `TRANSFER_TOKEN_SALT`, `JWT_SECRET`
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

The command must exit `0`. The rendered output must show exactly four
services (`proxy`, `web`, `cms`, `db`), only `proxy` carrying `ports:`
bindings, and only `web` carrying `traefik.enable=true`.
