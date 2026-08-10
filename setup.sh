#!/usr/bin/env bash
# OpenSchool one-shot dev environment setup.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
THUNDERID_DIR="$ROOT_DIR/thunderid"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}==>${NC} $1"; }
ok()    { echo -e "${GREEN}✔${NC} $1"; }
warn()  { echo -e "${YELLOW}!!${NC} $1"; }
die()   { echo -e "${RED}ERROR:${NC} $1"; exit 1; }

require() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required but not installed."
}

echo "🔍 Checking prerequisites..."
require docker
require go
require node
require pnpm
docker compose version >/dev/null 2>&1 || die "docker compose (v2) is required."
ok "docker, docker compose, go, node, pnpm all present"

# ---- 1. Postgres for the backend ------------------------------------------
echo
echo "🐘 Starting PostgreSQL..."
(cd "$BACKEND_DIR" && docker compose up -d)
ok "postgres container up on :5432"

# ---- 2. ThunderID secret + environment.env ---------------------------------
echo
echo "🔑 Preparing ThunderID environment..."
if [ ! -f "$THUNDERID_DIR/environment.env" ]; then
  cp "$THUNDERID_DIR/environment.env.example" "$THUNDERID_DIR/environment.env"
  GENERATED_SECRET="$(openssl rand -base64 32 | tr -d '\n')"
  sed -i.bak "s|^OPENSCHOOL_BACKEND_CLIENT_SECRET=.*|OPENSCHOOL_BACKEND_CLIENT_SECRET=${GENERATED_SECRET}|" \
    "$THUNDERID_DIR/environment.env"
  rm -f "$THUNDERID_DIR/environment.env.bak"
  ok "generated a fresh backend client secret"
else
  GENERATED_SECRET="$(grep '^OPENSCHOOL_BACKEND_CLIENT_SECRET=' "$THUNDERID_DIR/environment.env" | cut -d= -f2-)"
  ok "thunderid/environment.env already exists, reusing existing secret"
fi

# ---- 3. Start ThunderID (quick-start + OpenSchool overlay) -----------------
echo
echo "⚡ Starting ThunderID (quick-start + OpenSchool overlay)..."
(cd "$THUNDERID_DIR" && docker compose \
  -f quickstart-compose.yml \
  -f compose.override.yml \
  up -d)
ok "thunderid-db-init / thunderid-setup complete, server starting on :8090"

echo -n "⏳ Waiting for ThunderID to be ready"
for i in $(seq 1 60); do
  if curl -sk --max-time 2 https://localhost:8090/ >/dev/null 2>&1; then
    echo
    ok "ThunderID is up"
    break
  fi
  echo -n "."
  sleep 2
  if [ "$i" -eq 60 ]; then
    echo
    die "ThunderID did not become ready in time. Check: cd thunderid && docker compose -f quickstart-compose.yml -f compose.override.yml logs thunderid"
  fi
done

# ---- 4. Backend .env -------------------------------------------------------
echo
echo "📝 Writing environment files..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
fi
sed -i.bak "s|^THUNDERID_CLIENT_SECRET=.*|THUNDERID_CLIENT_SECRET=${GENERATED_SECRET}|" "$BACKEND_DIR/.env"
rm -f "$BACKEND_DIR/.env.bak"
ok "backend/.env"

# ---- 5. Frontend .env -------------------------------------------------------
if [ ! -f "$FRONTEND_DIR/.env" ]; then
  cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
fi
ok "frontend/.env"

# ---- 6. Backend deps -------------------------------------------------------
echo
echo "🐹 Installing backend dependencies..."
(cd "$BACKEND_DIR" && go mod download)
ok "go mod download complete"

# ---- 7. Frontend deps -------------------------------------------------------
echo
echo "📦 Installing frontend dependencies..."
(cd "$FRONTEND_DIR" && pnpm install)
ok "pnpm install complete"

echo
echo "──────────────────────────────────────────────"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo
echo "   Frontend          → http://localhost:5173"
echo "   Backend           → http://localhost:8080"
echo "   ThunderID Console → https://localhost:8090/console"
echo
echo "   Run 'make dev' to start working."
echo "──────────────────────────────────────────────"