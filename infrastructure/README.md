# Coolify Compose Topology

The production Compose stack lives at the repo root (`docker-compose.yml`)
because Coolify's BuildKit resolves `context: .` from the compose file location,
and the root context correctly encompasses the full source tree (apps/, packages/).

`infrastructure/` contains the environment contract (`.env.example`), the local
development compose file, and supporting documentation. The root compose file is
the single source of truth for production.

## Services

| Service | Image | Public exposure | Role |
| --- | --- | --- | --- |
| `proxy` | `traefik:v3.1` | host ports 80/443 | TLS termination, LetsEncrypt, routing |
| `web` | built from `apps/web/Dockerfile` | `ene-muebles.cl` + `www.ene-muebles.cl` → port 3000 | Next.js 16 App Router |
| `cms` | built from `apps/cms/Dockerfile` | `cms.ene-muebles.cl: /api` + `/uploads` only | Strapi v5 REST API and media; admin remains internal |
| `db` | `mysql:8.0` | **internal only** | Persistent storage |

The `proxy` service (self-hosted Traefik v3.1) publishes host ports 80/443 and
handles TLS termination via LetsEncrypt. No external proxy or Coolify-managed
proxy is needed. All services communicate exclusively through the internal
`landing_internal` Docker network.

## Network

```
Internet -> proxy (Traefik v3.1, ports 80/443, TLS)
              -> landing_internal -> web (3000):
                 Host(ene-muebles.cl) || Host(www.ene-muebles.cl)
              -> landing_internal -> cms (1337):
                 Host(cms.ene-muebles.cl) && (PathPrefix(/api) || PathPrefix(/uploads))
              -> landing_internal -> db (3306, internal only)
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
| `proxy` | `traefik healthcheck` | N/A (proxy health) |
| `db` | `mysqladmin ping` over TCP | `cms` startup |
| `cms` | `wget --spider http://localhost:1337/admin` (built into Dockerfile) | `web` readiness |
| `web` | `wget --spider http://localhost:3000/api/health` | Container liveness only; it does not probe CMS or MySQL |

## Volumes

| Volume | Mounted in | Purpose |
| --- | --- | --- |
| `proxy_letsencrypt` | `/letsencrypt` in `proxy` | TLS certificate storage |
| `cms_uploads` | `/repo/apps/cms/public/uploads` in `cms` | Media library persistence |
| `cms_tmp` | `/repo/apps/cms/.tmp` in `cms` | Strapi runtime cache |
| `db_data` | `/var/lib/mysql` in `db` | MySQL data files |

`cms` and `db` roll back independently: revert the image SHA in Coolify
and the volumes are untouched.

## Environment contract

`infrastructure/.env.example` is the source of truth for required deployment
variables. Copy it to `.env`, generate strong values for application and
database secrets, and load them via Coolify's Environment UI. Compose uses
required-variable expansion (`${VAR:?message}`) for secrets needed before
startup. The `.env` filename is ignored by `.gitignore`.

Required variables:

- Public origins: `NEXT_PUBLIC_SITE_URL`, `WEB_PUBLIC_HOSTNAME`,
  `WEB_PUBLIC_WWW_HOSTNAME`, `CMS_PUBLIC_HOSTNAME`, `CORS_ORIGINS`,
  `NEXT_PUBLIC_STRAPI_URL` (must be `https://${CMS_PUBLIC_HOSTNAME}`)
- Internal service URL: `STRAPI_INTERNAL_URL`
- Proxy: `LETSENCRYPT_EMAIL`
- Web secrets: `REVALIDATE_SECRET`, `ADMIN_SESSION_SECRET`,
  `NEXT_PUBLIC_FEATURE_LEAD_FORM`
- Strapi secrets: `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`,
  `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `CLIENT_ADMIN_PASSWORD`
- MySQL: `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`,
  `MYSQL_ROOT_PASSWORD`

Optional business facts (set later, once verified): WhatsApp number,
contact email, physical address, social profile URLs.

### DNS and domains

Create DNS records for both public hostnames before deployment and point them to
the Coolify server. For the production domain contract, configure:

```dotenv
WEB_PUBLIC_HOSTNAME=ene-muebles.cl
WEB_PUBLIC_WWW_HOSTNAME=www.ene-muebles.cl
CMS_PUBLIC_HOSTNAME=cms.ene-muebles.cl
CORS_ORIGINS=https://ene-muebles.cl,https://www.ene-muebles.cl
```

`WEB_PUBLIC_HOSTNAME` and `WEB_PUBLIC_WWW_HOSTNAME` are both required: set them
to `ene-muebles.cl` and `www.ene-muebles.cl`, respectively. The single web
router accepts both hosts and sends them to `web` on port `3000`; neither host
is a redirect-only DNS alias. Strapi reads the comma-separated `CORS_ORIGINS`
allowlist, which MUST include both HTTPS web origins and MUST NOT use the
retired `landing.ene-muebles.cl` hostname as its production origin.
`cms.ene-muebles.cl` is the CMS hostname; Traefik routes only its `/api` and
`/uploads` paths to `cms` on port `1337`. Configure the corresponding apex,
`www`, and `cms` DNS records at the DNS provider to the Coolify server IP.

### Strapi-issued tokens

`STRAPI_API_TOKEN` and `STRAPI_ADMIN_TOKEN` are not application secrets and
must never be generated locally. Start the CMS once with the required Strapi
application and database secrets, create the tokens in Strapi Admin, inject
them through Coolify, then redeploy the web service. `STRAPI_API_TOKEN` is an
optional read-only token: the public catalog makes unauthenticated requests
when it is absent, so it operates as soon as the Strapi Public role grants
catalog read permissions. `STRAPI_ADMIN_TOKEN` (or a valid API-token fallback)
is still required by protected Next.js admin operations; requests without one
are rejected.

## Local development

For the local Docker Desktop stack, copy `.env.local.example` through either
`scripts/local-up.ps1` or `scripts/local-up.sh`. Those scripts generate only
cryptographic application/database secrets. After the first CMS bootstrap,
create Strapi API tokens in the admin panel and add them to `.env.local` if the
public role is not sufficient for catalog reads or if protected admin actions
are needed. The local web image receives `NEXT_PUBLIC_STRAPI_URL` as a build
argument; leave it unset to derive `http://localhost:${CMS_PORT}` or set a
custom browser-visible origin explicitly. Local Strapi CORS defaults to
`http://localhost:3000` and `http://localhost:4780`; set `CORS_ORIGINS` when
using other browser origins.

## Validation

```bash
docker compose config
```

The command must exit `0`. The rendered output must show exactly four
services (`proxy`, `web`, `cms`, `db`), no host `ports:` bindings on app
services, a `web` build argument for `NEXT_PUBLIC_STRAPI_URL`, a web router
for both apex and www hostnames to port 3000, and a CMS router limited to
`/api` and `/uploads` on port 1337.
