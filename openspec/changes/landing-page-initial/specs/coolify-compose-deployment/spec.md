# Coolify Compose Deployment Specification

## Purpose

Define independently deployable web and CMS surfaces with private persistence on Coolify.

## Requirements

### Requirement: Three-Service Topology

The Compose stack MUST define web, cms, and MySQL db services. Traefik MUST terminate TLS and route only `landing.ene-muebles.cl` to web port 3000. CMS and db MUST use internal networking without public host ports or public Traefik routes.

#### Scenario: Healthy deployment

- GIVEN required environment values and images are available
- WHEN the stack deploys
- THEN the HTTPS landing origin serves the web service
- AND cms and db communicate only through the private network

#### Scenario: Public internal-service probe

- GIVEN an external client probes the CMS hostname or database port
- WHEN routing is evaluated
- THEN the internal services are unreachable or return 404

### Requirement: Environment Contract

Deployment MUST validate required production origin, database, CMS token, and service-secret variables before accepting traffic. Optional WhatsApp, email, address, social, pricing, and mirror values MUST remain unset until supplied by the operator. Secrets MUST NOT be embedded in images, Compose source, client-visible variables, or logs.

#### Scenario: Complete required configuration

- GIVEN all mandatory non-business infrastructure values exist
- WHEN services start
- THEN health checks can pass without exposing secret values

#### Scenario: Missing required or optional value

- GIVEN a required infrastructure value is absent
- WHEN deployment starts
- THEN the affected service fails clearly before serving traffic
- AND a missing optional business fact activates omission or fallback behavior instead of a fabricated value

### Requirement: Health and Failure Isolation

The stack MUST expose health signals for web, cms, and db and MUST prevent web readiness from depending on public CMS exposure. A CMS or db outage MUST yield the web degraded-state behavior; it MUST NOT redirect visitors to an internal service.

#### Scenario: All services healthy

- GIVEN db and cms become healthy
- WHEN web readiness is evaluated
- THEN the stack reports each service health independently

#### Scenario: CMS unavailable

- GIVEN web is running while cms is unhealthy
- WHEN a visitor requests the landing route
- THEN web serves cached or defined fallback content
- AND internal connection details are not revealed

### Requirement: Persistence, Backup, and Independent Rollback

MySQL data and CMS media MUST use persistent storage. A recoverable backup MUST precede destructive schema change. Web and CMS images MUST be independently deployable and rollback-capable; rolling back one MUST NOT automatically replace or erase the other's data.

#### Scenario: Web rollback

- GIVEN a web release fails verification
- WHEN web is reverted to its prior image
- THEN cms, database, media, and DNS remain unchanged

#### Scenario: CMS schema failure

- GIVEN a CMS release cannot use the current schema
- WHEN rollback is initiated
- THEN the previous CMS image and pre-change database backup are available
- AND persisted media remains intact

### Requirement: Production Transport

Public traffic MUST use HTTPS, and no production service MUST rely on development origins except the explicit localhost CORS allowance. Deployment verification MUST confirm HTTP 200 on the landing origin and public denial of CMS access.

#### Scenario: Transport verification

- GIVEN the production stack is deployed
- WHEN external smoke checks run
- THEN the landing HTTPS route returns 200
- AND public CMS access is denied
