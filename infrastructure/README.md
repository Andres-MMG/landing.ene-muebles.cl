# Coolify Compose Topology

The production Compose stack lives at the repo root (`docker-compose.yml`)
because Coolify's BuildKit resolves `context: .` from the compose file location,
and the root context correctly encompasses the full source tree (apps/, packages/).

`infrastructure/` contains the environment contract (`.env.example`), the local
development compose file, and supporting documentation. The root compose file is
the single source of truth for production.

## Topology

```
Internet -> Coolify-managed Traefik (ports 80/443, TLS, LetsEncrypt)
             -> coolify (external) -> web (port 3000)
             -> coolify (external) -> cms (port 1337)
```

**No self-hosted proxy.** Coolify already runs a managed Traefik instance on the
VPS that handles SSL termination, LetsEncrypt, and port publishing. The compose
stack only defines application services. Routing configuration is done through
Coolify's UI.

## Services

| Service | Built from | Network exposure | Role |
| --- | --- | --- | --- |
| `web` | `apps/web/Dockerfile` | `coolify` (public) + `landing_internal` | Next.js 16 App Router |
| `cms` | `apps/cms/Dockerfile` | `coolify` (public) + `landing_internal` | Strapi v5 REST API and media |
| `db` | `mysql:8.0` | `landing_internal` only | Persistent storage |

## Networks

| Network | Type | Purpose |
| --- | --- | --- |
| `coolify` | `external` (created by Coolify) | Public Traefik routing — Coolify's proxy reaches services here |
| `landing_internal` | `bridge` | Inter-service communication (web ↔ cms ↔ db) |

### Routing (Coolify UI)

Configure each public service in Coolify **Resource → Routing**:

- **web**: `ene-muebles.cl`, `www.ene-muebles.cl` → port `3000`
- **cms**: route the full `cms.ene-muebles.cl` host → port `1337`. Do not
  restrict it to `/api` and `/uploads`: Strapi Admin requires `/admin`,
  `/api/admin`, and static admin assets on the same host.

SSL and LetsEncrypt are handled automatically by Coolify once the domains are
configured and their DNS records point to the VPS IP.

## Health checks

| Service | Probe | Gates |
| --- | --- | --- |
| `db` | `mysqladmin ping` over TCP | `cms` startup |
| `cms` | `wget --spider http://localhost:1337/_health` | `web` readiness |
| `web` | `wget --spider http://localhost:3000/api/health` | Container liveness |

Strapi v5 exposes a built-in `/_health` endpoint that returns `204` with a
`strapi: You are so French!` header — suitable for load balancers and Docker
health checks.

## Volumes

| Volume | Mounted in | Purpose |
| --- | --- | --- |
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

- Public origins: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_STRAPI_URL`
  (must be `https://cms.ene-muebles.cl`)
- Internal service URL: `STRAPI_INTERNAL_URL` (must be `http://cms:1337`)
- Web secrets: `REVALIDATE_SECRET`, `ADMIN_SESSION_SECRET`,
  `NEXT_PUBLIC_FEATURE_LEAD_FORM`
- Strapi secrets: `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`,
  `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `STRAPI_BOOTSTRAP_SUPER_ADMIN_EMAIL`,
  `STRAPI_BOOTSTRAP_SUPER_ADMIN_PASSWORD`, `CLIENT_ADMIN_PASSWORD`
- MySQL: `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`,
  `MYSQL_ROOT_PASSWORD`

`NEXT_PUBLIC_STRAPI_URL` supplies the CMS `PUBLIC_URL` both as a Docker build
argument and as a runtime environment setting. Strapi embeds this value in its
Vite admin bundle during `pnpm --filter cms build`; after changing it, rebuild
the CMS image before redeploying it.

Optional business facts (set later, once verified): WhatsApp number,
contact email, physical address, social profile URLs.

Before the next CMS deployment, set `STRAPI_BOOTSTRAP_SUPER_ADMIN_EMAIL`,
`STRAPI_BOOTSTRAP_SUPER_ADMIN_PASSWORD`, and `CLIENT_ADMIN_PASSWORD` in
Coolify's Environment UI. Each password must be a generated secret of at least
16 characters containing lowercase, uppercase, numeric, and symbol characters.
The Super Admin email must be unique among Strapi admin users. Never place
these values in Compose files or version control.

### DNS and domains

Create DNS records before Coolify routing setup:

```dotenv
WEB_PUBLIC_HOSTNAME=ene-muebles.cl
WEB_PUBLIC_WWW_HOSTNAME=www.ene-muebles.cl
CMS_PUBLIC_HOSTNAME=cms.ene-muebles.cl
CORS_ORIGINS=https://ene-muebles.cl,https://www.ene-muebles.cl
```

Point all three (`@`, `www`, `cms`) to the Coolify VPS IP. Coolify's Traefik
auto-provisions LetsEncrypt certificates once DNS resolves.

### Strapi-issued tokens

`STRAPI_API_TOKEN` and `STRAPI_ADMIN_TOKEN` are not application secrets and
must never be generated locally. Start the CMS once with the required Strapi
application and database secrets, create the tokens in Strapi Admin, inject
them through Coolify, then redeploy the web service.

## Local development

For the local Docker Desktop stack, provide the intended Super Admin email on
the first run, then use either `scripts/local-up.ps1` or `scripts/local-up.sh`:

```powershell
.\scripts\local-up.ps1 -SuperAdminEmail owner@example.test
```

```sh
STRAPI_BOOTSTRAP_SUPER_ADMIN_EMAIL=owner@example.test ./scripts/local-up.sh
```

The scripts write that operator-supplied email into ignored `.env.local` and
generate both bootstrap passwords with the required 16-character, four-class
policy. Existing `.env.local` files are validated before Docker is invoked.
After the first CMS bootstrap, create Strapi API tokens in the admin panel and
add them to `.env.local` if the public role is not sufficient for catalog reads
or if protected admin actions are needed.

## Validation

```bash
docker compose config
```

The command must exit `0`. The rendered output must show exactly three services
(`web`, `cms`, `db`), no host `ports:` bindings, and both `coolify` (external)
and `landing_internal` networks.
