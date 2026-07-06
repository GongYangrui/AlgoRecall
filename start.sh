#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE="docker compose"
APP_URL="${BETTER_AUTH_URL:-http://localhost:3000}"
APP_CONTAINER="algorecall-app"

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

  if ! grep -q "^DATABASE_URL=" .env 2>/dev/null; then
    echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/algorecall" >> .env
    info "Set DATABASE_URL (local dev default)"
  fi
}

wait_for_container() {
  local name="$1"
  local timeout="${2:-60}"
  local elapsed=0
  info "Waiting for $name to be healthy..."
  while [ "$elapsed" -lt "$timeout" ]; do
    if [ "$($COMPOSE ps --status running --format '{{.Name}}' 2>/dev/null | grep -c "$name")" -gt 0 ]; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  red "Timeout waiting for $name"
  return 1
}

wait_for_app() {
  local timeout="${1:-60}"
  local elapsed=0
  info "Waiting for app at $APP_URL ..."
  while [ "$elapsed" -lt "$timeout" ]; do
    if curl -sf "$APP_URL/api/health" >/dev/null 2>&1 || \
       curl -sf "$APP_URL/" >/dev/null 2>&1; then
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
  if $COMPOSE exec -T "$APP_CONTAINER" node scripts/promote-admin.mjs "$email"; then
    green "Promoted $email to admin"
  else
    # fallback: try running locally if container isn't running
    if [ -f .env ]; then
      export $(grep -v '^#' .env | xargs) 2>/dev/null || true
    fi
    node scripts/promote-admin.mjs "$email"
  fi
}

cleanup_logs() {
  local days="${1:-30}"
  info "Cleaning app_events older than $days days..."
  if $COMPOSE exec -T "$APP_CONTAINER" node scripts/cleanup-app-events.mjs "$days"; then
    green "Log cleanup complete"
  else
    yellow "Could not run cleanup inside container. Try manually:"
    echo "  docker compose exec app node scripts/cleanup-app-events.mjs $days"
  fi
}

# ── commands ─────────────────────────────────────────────
cmd_up() {
  check_prereqs
  ensure_env

  info "Building Docker image..."
  $COMPOSE build app

  info "Starting services..."
  $COMPOSE up -d

  wait_for_container "$APP_CONTAINER" 60
  wait_for_app 90

  echo ""
  green "AlgoRecall is running at $APP_URL"
  echo ""
  echo "  Frontend:  $APP_URL"
  echo "  Admin:     $APP_URL/admin"
  echo "  Logs:      docker compose logs -f app"
  echo ""
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
  promote_admin "${1:-}"
}

cmd_cleanup() {
  cleanup_logs "${1:-30}"
}

cmd_migrate() {
  info "Running migrations..."
  if $COMPOSE ps --status running --format '{{.Name}}' | grep -q "$APP_CONTAINER"; then
    $COMPOSE exec -T "$APP_CONTAINER" node -e "
      const { migrate } = require('drizzle-orm/node-postgres/migrator');
      const { db } = require('./server/db/index.ts');
      migrate(db, { migrationsFolder: './drizzle' }).then(() => console.log('[migrate] done')).catch(e => { console.error('[migrate] failed', e); process.exit(1); });
    "
    green "Migrations applied"
  else
    red "App container is not running. Start it first: $0 up"
    exit 1
  fi
}

cmd_status() {
  $COMPOSE ps
}

cmd_shell() {
  $COMPOSE exec "$APP_CONTAINER" sh
}

# ── usage ─────────────────────────────────────────────────
usage() {
  cat <<'EOF'
AlgoRecall one-click deployment script

Usage:
  ./start.sh up              Build image + start all services
  ./start.sh down            Stop all services
  ./start.sh restart         Stop + rebuild + start
  ./start.sh logs [service]  Tail logs (default: app)
  ./start.sh admin <email>   Promote a user to admin
  ./start.sh cleanup [days]  Delete app_events older than N days (default: 30)
  ./start.sh migrate         Run DB migrations manually
  ./start.sh status          Show container status
  ./start.sh shell           Open a shell inside the app container

Examples:
  ./start.sh up                        # first deploy
  ./start.sh admin me@example.com      # make yourself admin
  ./start.sh logs app                  # watch app logs
  ./start.sh cleanup 7                 # keep only 7 days of logs
EOF
}

# ── main ──────────────────────────────────────────────────
case "${1:-}" in
  up)        cmd_up ;;
  down)      cmd_down ;;
  restart)   cmd_restart ;;
  logs)      cmd_logs "$2" ;;
  admin)     cmd_admin "$2" ;;
  cleanup)   cmd_cleanup "$2" ;;
  migrate)   cmd_migrate ;;
  status)    cmd_status ;;
  shell)     cmd_shell ;;
  -h|--help) usage ;;
  *)         usage; exit 1 ;;
esac
