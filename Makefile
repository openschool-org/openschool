# OpenSchool Makefile

BACKEND_DIR=backend
FRONTEND_DIR=frontend
THUNDERID_DIR=thunderid
THUNDERID_COMPOSE=docker compose -f quickstart-compose.yml -f compose.override.yml

.PHONY: help setup seed unseed \
        dev dev-backend dev-frontend \
        build build-backend build-frontend \
        lint lint-backend lint-frontend test-integration-backend \
        migrate migrate-down sqlc \
        thunderid-up thunderid-down thunderid-logs thunderid-reset \
        version release release-tag \
        down clean

help:
	@echo "OpenSchool - available targets:"
	@echo "  setup           - One-time setup: Postgres, ThunderID, deps, .env files"
	@echo "  seed            - Seed demo class (teachers, students, parents, attendance, marks)"
	@echo "  unseed          - Safely remove seeded demo class data"
	@echo "  dev             - Run backend + frontend together"
	@echo "  dev-backend     - Run only the Go API (:8080)"
	@echo "  dev-frontend    - Run only the Vite dev server (:5173)"
	@echo "  build           - Build backend binary + frontend production bundle"
	@echo "  lint            - Lint backend (go vet) and frontend (eslint)"
	@echo "  test-integration-backend - Run database-backed backend integration tests"
	@echo "  migrate         - Apply DB migrations"
	@echo "  migrate-down    - Roll back the last migration"
	@echo "  sqlc            - Regenerate typed Go code from db/queries/"
	@echo "  thunderid-up    - Start ThunderID (quick-start + OpenSchool overlay)"
	@echo "  thunderid-down  - Stop ThunderID"
	@echo "  thunderid-logs  - Tail ThunderID server logs"
	@echo "  thunderid-reset - Stop ThunderID and wipe its volumes (fresh tenant)"
	@echo "  version         - Print the current app version"
	@echo "  release         - Prepare a release branch (BUMP=patch|minor|major|X.Y.Z, default minor)"
	@echo "  release-tag     - Tag main with the current version after the release PR merges"
	@echo "  down            - Stop Postgres and ThunderID"
	@echo "  clean           - Remove build artifacts"

setup:
	@chmod +x scripts/setup.sh
	@./scripts/setup.sh

seed:
	@chmod +x scripts/seed_demo_class.sh
	@./scripts/seed_demo_class.sh

unseed:
	@chmod +x scripts/unseed_demo_class.sh
	@./scripts/unseed_demo_class.sh

dev:
	@chmod +x scripts/start.sh
	@./scripts/start.sh

dev-backend:
	cd $(BACKEND_DIR) && go run cmd/api/main.go

dev-frontend:
	cd $(FRONTEND_DIR) && pnpm dev

build: build-backend build-frontend

build-backend:
	cd $(BACKEND_DIR) && go build -o bin/openschool-api ./cmd/api

build-frontend:
	cd $(FRONTEND_DIR) && pnpm build

lint: lint-backend lint-frontend

lint-backend:
	cd $(BACKEND_DIR) && go vet ./...

lint-frontend:
	cd $(FRONTEND_DIR) && pnpm lint

test-integration-backend:
	cd $(BACKEND_DIR) && go test -count=1 -tags=integration ./internal/modules/setup ./internal/modules/auth ./internal/modules/people ./internal/modules/academics ./internal/modules/attendance ./internal/modules/timetable ./internal/modules/notifications ./internal/modules/identity ./internal/modules/school ./internal/modules/curriculum ./internal/modules/leadership ./internal/modules/studentleadership ./internal/modules/search ./internal/modules/dashboard ./internal/modules/reports ./internal/modules/selfservice ./internal/modules/automation ./internal/modules/audit

migrate:
	cd $(BACKEND_DIR) && migrate -path db/migrations \
		-database "postgres://$${DB_USER:-postgres}:$${DB_PASSWORD:-postgres}@$${DB_HOST:-localhost}:$${DB_PORT:-5432}/$${DB_NAME:-openschool}?sslmode=$${DB_SSLMODE:-disable}" \
		up

migrate-down:
	cd $(BACKEND_DIR) && migrate -path db/migrations \
		-database "postgres://$${DB_USER:-postgres}:$${DB_PASSWORD:-postgres}@$${DB_HOST:-localhost}:$${DB_PORT:-5432}/$${DB_NAME:-openschool}?sslmode=$${DB_SSLMODE:-disable}" \
		down 1

sqlc:
	cd $(BACKEND_DIR) && sqlc generate

thunderid-up:
	cd $(THUNDERID_DIR) && $(THUNDERID_COMPOSE) up -d

thunderid-down:
	cd $(THUNDERID_DIR) && $(THUNDERID_COMPOSE) down

thunderid-logs:
	cd $(THUNDERID_DIR) && $(THUNDERID_COMPOSE) logs -f thunderid

thunderid-reset:
	cd $(THUNDERID_DIR) && $(THUNDERID_COMPOSE) down -v

version:
	@./scripts/release.sh current

release:
	@./scripts/release.sh prepare $(or $(BUMP),minor)

release-tag:
	@./scripts/release.sh tag

down:
	cd $(BACKEND_DIR) && docker compose down
	cd $(THUNDERID_DIR) && $(THUNDERID_COMPOSE) down

clean:
	rm -rf $(BACKEND_DIR)/bin
	rm -rf $(FRONTEND_DIR)/dist
