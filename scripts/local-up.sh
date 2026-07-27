#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(dirname "$SCRIPT_DIR")
COMPOSE_FILE="$REPO_ROOT/infrastructure/docker-compose.local.yml"
ENV_EXAMPLE_FILE="$REPO_ROOT/infrastructure/.env.local.example"
ENV_FILE="$REPO_ROOT/infrastructure/.env.local"
COMPOSE_DISPLAY="docker compose -f infrastructure/docker-compose.local.yml"
tmp_file=""

cleanup() {
  if [ -n "$tmp_file" ] && [ -f "$tmp_file" ]; then
    rm -f "$tmp_file"
  fi
}
trap cleanup EXIT HUP INT TERM

fail() {
  printf '%s\n' "ERROR: $1" >&2
  printf '%s\n' "Next step: $COMPOSE_DISPLAY ps" >&2
  printf '%s\n' "Logs:      $COMPOSE_DISPLAY logs --tail=200 <service>" >&2
  exit 1
}

random_hex() {
  byte_count=$1

  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$byte_count"
    return
  fi

  if [ -r /dev/urandom ] && command -v od >/dev/null 2>&1; then
    od -An -N "$byte_count" -tx1 /dev/urandom | tr -d ' \n'
    return
  fi

  fail "Neither openssl nor /dev/urandom with od is available for secure random generation."
}

initialize_local_environment() {
  if [ -f "$ENV_FILE" ]; then
    return
  fi

  [ -f "$ENV_EXAMPLE_FILE" ] || fail "Missing environment template: $ENV_EXAMPLE_FILE"
  tmp_file=$(mktemp "${ENV_FILE}.tmp.XXXXXX") || fail "Could not create a temporary environment file."

  while IFS= read -r line || [ -n "$line" ]; do
    line=$(printf '%s' "$line" | tr -d '\r')

    case "$line" in
      *=\<generate-random\>)
        key=${line%%=*}
        case "$key" in
          APP_KEYS)
            value="$(random_hex 16),$(random_hex 16),$(random_hex 16),$(random_hex 16)"
            ;;
          API_TOKEN_SALT|ADMIN_JWT_SECRET|TRANSFER_TOKEN_SALT|JWT_SECRET|MYSQL_PASSWORD|MYSQL_ROOT_PASSWORD|STRAPI_API_TOKEN|STRAPI_ADMIN_TOKEN|REVALIDATE_SECRET|ADMIN_SESSION_SECRET)
            value=$(random_hex 32)
            ;;
          *)
            fail "No random-value rule is defined for '$key'."
            ;;
        esac
        printf '%s=%s\n' "$key" "$value" >> "$tmp_file"
        ;;
      *)
        printf '%s\n' "$line" >> "$tmp_file"
        ;;
    esac
  done < "$ENV_EXAMPLE_FILE"

  mv "$tmp_file" "$ENV_FILE"
  tmp_file=""
  chmod 600 "$ENV_FILE" 2>/dev/null || true
  printf '%s\n' "Created infrastructure/.env.local with cryptographically secure secrets."
}

wait_for_healthchecks() {
  services="web cms db proxy"
  pending=$services
  deadline=$(( $(date +%s) + 300 ))
  delay=2

  while [ -n "$pending" ] && [ "$(date +%s)" -lt "$deadline" ]; do
    still_pending=""

    for service in $pending; do
      container_id=$(docker compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null || true)
      if [ -z "$container_id" ]; then
        still_pending="$still_pending $service"
        continue
      fi

      status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)
      case "$status" in
        healthy)
          printf '  %s is healthy.\n' "$service"
          ;;
        unhealthy|exited|dead)
          fail "Service '$service' entered state '$status'."
          ;;
        *)
          still_pending="$still_pending $service"
          ;;
      esac
    done

    pending=$(printf '%s' "$still_pending" | sed 's/^ *//')
    if [ -n "$pending" ]; then
      printf 'Waiting for healthchecks: %s\n' "$(printf '%s' "$pending" | tr ' ' ',')"
      sleep "$delay"
      delay=$((delay * 2))
      if [ "$delay" -gt 15 ]; then
        delay=15
      fi
    fi
  done

  [ -z "$pending" ] || fail "Timed out after 5 minutes waiting for: $pending."
}

if ! docker info >/dev/null 2>&1; then
  fail "Docker is not running. Start Docker Desktop and retry."
fi

initialize_local_environment

web_port_override=${WEB_PORT-}
web_port_is_set=${WEB_PORT+x}
cms_port_override=${CMS_PORT-}
cms_port_is_set=${CMS_PORT+x}
db_port_override=${DB_PORT-}
db_port_is_set=${DB_PORT+x}
proxy_http_port_override=${PROXY_HTTP_PORT-}
proxy_http_port_is_set=${PROXY_HTTP_PORT+x}
proxy_https_port_override=${PROXY_HTTPS_PORT-}
proxy_https_port_is_set=${PROXY_HTTPS_PORT+x}
proxy_dashboard_port_override=${PROXY_DASHBOARD_PORT-}
proxy_dashboard_port_is_set=${PROXY_DASHBOARD_PORT+x}

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

[ "$web_port_is_set" != x ] || WEB_PORT=$web_port_override
[ "$cms_port_is_set" != x ] || CMS_PORT=$cms_port_override
[ "$db_port_is_set" != x ] || DB_PORT=$db_port_override
[ "$proxy_http_port_is_set" != x ] || PROXY_HTTP_PORT=$proxy_http_port_override
[ "$proxy_https_port_is_set" != x ] || PROXY_HTTPS_PORT=$proxy_https_port_override
[ "$proxy_dashboard_port_is_set" != x ] || PROXY_DASHBOARD_PORT=$proxy_dashboard_port_override
export WEB_PORT CMS_PORT DB_PORT PROXY_HTTP_PORT PROXY_HTTPS_PORT PROXY_DASHBOARD_PORT

cd "$REPO_ROOT"
printf '%s\n' "Starting the local stack..."
if ! docker compose -f infrastructure/docker-compose.local.yml up -d --build --force-recreate; then
  fail "Docker Compose could not build or start the local stack."
fi

wait_for_healthchecks

printf '\n%s\n' "Local stack is healthy:"
printf '  Sitio web:          http://localhost:%s\n' "${WEB_PORT:-4780}"
printf '  Strapi admin:        http://localhost:%s/admin (first-time setup required)\n' "${CMS_PORT:-4781}"
printf '  Traefik dashboard:   http://localhost:%s/dashboard/\n' "${PROXY_DASHBOARD_PORT:-4785}"
printf '  MySQL:               localhost:%s (use any MySQL client; credentials are in infrastructure/.env.local)\n' "${DB_PORT:-4782}"
