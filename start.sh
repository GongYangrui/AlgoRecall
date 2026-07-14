#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE="docker compose"
APP_URL="http://localhost:3000"
APP_HEALTH_URL=""
APP_SERVICE="app"

# ── colors ───────────────────────────────────────────────
green()  { printf '\033[1;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[1;33m%s\033[0m\n' "$*"; }
red()    { printf '\033[1;31m%s\033[0m\n' "$*"; }
info()   { printf '\033[1;34m[info]\033[0m %s\n' "$*"; }

# ── helpers ──────────────────────────────────────────────
check_prereqs() {
  if ! command -v docker &>/dev/null; then
    red "Docker not found. Install Docker Desktop first."
    exit 1
  fi
  if ! docker compose version &>/dev/null; then
    red "Docker Compose not found. Install Docker Compose first."
    exit 1
  fi
}

ensure_env() {
  if [ ! -f .env ]; then
    touch .env
    info "Created .env"
  fi

  if ! grep -q "^BETTER_AUTH_SECRET=" .env 2>/dev/null; then
    secret=$(openssl rand -hex 32)
    echo "BETTER_AUTH_SECRET=$secret" >> .env
    green "Generated BETTER_AUTH_SECRET in .env"
  fi

  if ! grep -q "^BETTER_AUTH_URL=" .env 2>/dev/null; then
    echo "BETTER_AUTH_URL=http://localhost:3000" >> .env
    info "Set BETTER_AUTH_URL=http://localhost:3000"
  fi

  if ! grep -q "^ADMIN_EMAILS=" .env 2>/dev/null; then
    echo "ADMIN_EMAILS=admin@algorecall.local" >> .env
    info "Set ADMIN_EMAILS=admin@algorecall.local"
  fi

  if ! grep -q "^HOST_PORT=" .env 2>/dev/null; then
    echo "HOST_PORT=3000" >> .env
    info "Set HOST_PORT=3000"
  fi

  if ! grep -q "^COMPOSE_DATABASE_URL=" .env 2>/dev/null; then
    echo "COMPOSE_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/algorecall" >> .env
    info "Set COMPOSE_DATABASE_URL (Docker Compose default)"
  fi

  if ! grep -q "^POSTGRES_USER=" .env 2>/dev/null; then
    echo "POSTGRES_USER=postgres" >> .env
    info "Set POSTGRES_USER=postgres"
  fi

  if ! grep -q "^POSTGRES_PASSWORD=" .env 2>/dev/null; then
    echo "POSTGRES_PASSWORD=postgres" >> .env
    yellow "Set default POSTGRES_PASSWORD=postgres. Change it before production deploy."
  fi

  if ! grep -q "^POSTGRES_DB=" .env 2>/dev/null; then
    echo "POSTGRES_DB=algorecall" >> .env
    info "Set POSTGRES_DB=algorecall"
  fi

  if ! grep -q "^POSTGRES_HOST_PORT=" .env 2>/dev/null; then
    echo "POSTGRES_HOST_PORT=55432" >> .env
    info "Set POSTGRES_HOST_PORT=55432"
  fi

  if ! grep -q "^COMPOSE_REDIS_URL=" .env 2>/dev/null; then
    echo "COMPOSE_REDIS_URL=redis://redis:6379" >> .env
    info "Set COMPOSE_REDIS_URL (Docker Compose default)"
  fi

  if ! grep -q "^REDIS_URL=" .env 2>/dev/null; then
    echo "REDIS_URL=redis://localhost:6380" >> .env
    info "Set REDIS_URL=redis://localhost:6380"
  fi

  if ! grep -q "^REDIS_HOST_PORT=" .env 2>/dev/null; then
    echo "REDIS_HOST_PORT=6380" >> .env
    info "Set REDIS_HOST_PORT=6380"
  fi

  if ! grep -q "^TRUSTED_ORIGINS=" .env 2>/dev/null; then
    local auth_url
    auth_url="$(grep "^BETTER_AUTH_URL=" .env | tail -n 1 | cut -d= -f2-)"
    echo "TRUSTED_ORIGINS=${auth_url:-http://localhost:3000}" >> .env
    info "Set TRUSTED_ORIGINS=${auth_url:-http://localhost:3000}"
  fi

  if ! grep -q "^APP_VERSION=" .env 2>/dev/null; then
    local version="dev"
    if command -v git &>/dev/null && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      version="$(git rev-parse --short HEAD 2>/dev/null || echo dev)"
    fi
    echo "APP_VERSION=$version" >> .env
    info "Set APP_VERSION=$version"
  fi
}

load_env() {
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
  APP_URL="${BETTER_AUTH_URL:-http://localhost:3000}"
  APP_HEALTH_URL="${APP_HEALTH_URL:-http://127.0.0.1:${HOST_PORT:-3000}}"
}

wait_for_service_running() {
  local service="$1"
  local timeout="${2:-60}"
  local elapsed=0
  local container_id
  local status
  info "Waiting for $service to be running..."
  while [ "$elapsed" -lt "$timeout" ]; do
    container_id="$($COMPOSE ps -q "$service" 2>/dev/null || true)"
    if [ -n "$container_id" ]; then
      status="$(docker inspect --format '{{.State.Status}}' "$container_id" 2>/dev/null || true)"
    else
      status=""
    fi
    if [ "$status" = "running" ]; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  red "Timeout waiting for $service"
  return 1
}

wait_for_service_healthy() {
  local service="$1"
  local timeout="${2:-60}"
  local elapsed=0
  local container_id
  info "Waiting for $service to be healthy..."
  while [ "$elapsed" -lt "$timeout" ]; do
    container_id="$($COMPOSE ps -q "$service" 2>/dev/null || true)"
    if [ -n "$container_id" ]; then
      local health
      health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
      if [ "$health" = "healthy" ] || [ "$health" = "running" ]; then
        return 0
      fi
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  red "Timeout waiting for $service health"
  return 1
}

wait_for_app() {
  local timeout="${1:-60}"
  local elapsed=0
  info "Waiting for app at $APP_HEALTH_URL ..."
  while [ "$elapsed" -lt "$timeout" ]; do
    if curl -sf "$APP_HEALTH_URL/api/health" >/dev/null 2>&1 || \
       curl -sf "$APP_HEALTH_URL/" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  red "Timeout waiting for app"
  return 1
}

promote_admin() {
  local email="$1"
  if [ -z "$email" ]; then
    red "Usage: $0 admin <email>"
    exit 1
  fi
  info "Promoting $email to admin..."
  $COMPOSE run --rm --no-deps "$APP_SERVICE" node scripts/promote-admin.mjs "$email"
  green "Promoted $email to admin"
}

cleanup_logs() {
  local days="${1:-30}"
  info "Cleaning app_events and analytics_events older than $days days..."
  $COMPOSE run --rm --no-deps "$APP_SERVICE" node scripts/cleanup-app-events.mjs "$days"
  green "Log cleanup complete"
}

run_migrations() {
  info "Running database migrations..."
  $COMPOSE run --rm --no-deps "$APP_SERVICE" node scripts/run-migrations.mjs
  green "Migrations applied"
}

validate_production_env() {
  local failed=0

  if [[ "${BETTER_AUTH_URL:-}" != https://* ]]; then
    red "BETTER_AUTH_URL must be an https:// URL for production."
    failed=1
  fi
  if [[ "${TRUSTED_ORIGINS:-}" != *"${BETTER_AUTH_URL:-__missing__}"* ]]; then
    red "TRUSTED_ORIGINS must include BETTER_AUTH_URL."
    failed=1
  fi
  if [ "${#BETTER_AUTH_SECRET}" -lt 32 ] || [ "${BETTER_AUTH_SECRET:-}" = "your-secret-key-change-in-production" ]; then
    red "BETTER_AUTH_SECRET must be a real secret with at least 32 characters."
    failed=1
  fi
  if [ "${POSTGRES_PASSWORD:-}" = "postgres" ] || [ -z "${POSTGRES_PASSWORD:-}" ]; then
    red "POSTGRES_PASSWORD must not use the default production password."
    failed=1
  fi

  if [ "$failed" -ne 0 ]; then
    red "Production environment validation failed. Update .env and retry."
    exit 1
  fi
}

# ── commands ─────────────────────────────────────────────
cmd_up() {
  check_prereqs
  ensure_env
  load_env

  info "Building Docker image..."
  $COMPOSE build "$APP_SERVICE"

  info "Starting database service..."
  $COMPOSE up -d postgres
  wait_for_service_healthy postgres 90

  info "Starting Redis service..."
  $COMPOSE up -d redis
  wait_for_service_healthy redis 90

  run_migrations

  info "Starting app service..."
  $COMPOSE up -d "$APP_SERVICE"

  wait_for_service_running "$APP_SERVICE" 60
  wait_for_app 90

  echo ""
  green "AlgoRecall is running at $APP_URL"
  echo ""
  echo "  Frontend:  $APP_URL"
  echo "  Admin:     $APP_URL/admin"
  echo "  Logs:      docker compose logs -f app"
  echo ""
}

cmd_deploy() {
  COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
  check_prereqs
  ensure_env
  load_env
  validate_production_env
  cmd_up
}

cmd_down() {
  info "Stopping services..."
  $COMPOSE down
  green "Stopped"
}

cmd_restart() {
  cmd_down
  cmd_up
}

cmd_logs() {
  $COMPOSE logs -f "${1:-app}"
}

cmd_admin() {
  check_prereqs
  ensure_env
  load_env
  $COMPOSE up -d postgres
  wait_for_service_healthy postgres 90
  promote_admin "${1:-}"
}

cmd_cleanup() {
  check_prereqs
  ensure_env
  load_env
  $COMPOSE up -d postgres
  wait_for_service_healthy postgres 90
  cleanup_logs "${1:-30}"
}

cmd_migrate() {
  check_prereqs
  ensure_env
  load_env
  $COMPOSE up -d postgres
  wait_for_service_healthy postgres 90
  $COMPOSE up -d redis
  wait_for_service_healthy redis 90
  run_migrations
}

cmd_status() {
  $COMPOSE ps
}

cmd_shell() {
  $COMPOSE exec "$APP_SERVICE" sh
}

# ── usage ─────────────────────────────────────────────────
usage() {
  cat <<'EOF'
AlgoRecall one-click deployment script

Usage:
  ./start.sh up              Build image + start DB + run migrations + start app
  ./start.sh deploy          Production build + migrations + restart using hardened Compose settings
  ./start.sh down            Stop all services
  ./start.sh restart         Stop + rebuild + start
  ./start.sh logs [service]  Tail logs (default: app)
  ./start.sh admin <email>   Promote a user to admin
  ./start.sh cleanup [days]  Delete app_events and analytics_events older than N days (default: 30)
  ./start.sh migrate         Run DB migrations manually
  ./start.sh status          Show container status
  ./start.sh shell           Open a shell inside the app container

Examples:
  ./start.sh up                        # first deploy or update deploy
  ./start.sh deploy                    # production server deploy
  ./start.sh admin me@example.com      # make yourself admin
  ./start.sh logs app                  # watch app logs
  ./start.sh cleanup 7                 # keep only 7 days of logs
EOF
}

# ── main ──────────────────────────────────────────────────
case "${1:-}" in
  deploy)  cmd_deploy ;;
  up)        cmd_up ;;
  down)      cmd_down ;;
  restart)   cmd_restart ;;
  logs)      cmd_logs "${2:-}" ;;
  admin)     cmd_admin "${2:-}" ;;
  cleanup)   cmd_cleanup "${2:-}" ;;
  migrate)   cmd_migrate ;;
  status)    cmd_status ;;
  shell)     cmd_shell ;;
  -h|--help) usage ;;
  *)         usage; exit 1 ;;
esac
