#!/bin/bash
set -e

if [ ! -f .env ] || ! grep -q "^BETTER_AUTH_SECRET=" .env; then
  touch .env
  if ! grep -q "^BETTER_AUTH_SECRET=" .env; then
    echo "BETTER_AUTH_SECRET=$(openssl rand -hex 32)" >> .env
  fi
  if ! grep -q "^ADMIN_EMAILS=" .env; then
    echo "ADMIN_EMAILS=admin@algorecall.local" >> .env
  fi
  echo "[start] Generated BETTER_AUTH_SECRET in .env"
fi

docker compose up -d --build
echo "[start] App running at http://localhost:3000"
