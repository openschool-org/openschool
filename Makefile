# OpenSchool Makefile

BACKEND_DIR=backend
FRONTEND_DIR=frontend
THUNDERID_DIR=thunderid
THUNDERID_COMPOSE=docker compose -f quickstart-compose.yml -f compose.override.yml

.PHONY: help setup \
        dev dev-backend dev-frontend \
        build build-backend build-frontend \
        lint lint-backend lint-frontend \
        migrate migrate-down sqlc swag \
        thunderid-up thunderid-down thunderid-logs thunderid-reset \
        down clean

help:
	@echo "OpenSchool — available targets:"
	@echo "  setup           - One-time setup: Postgres, ThunderID, deps, .env files"
	@echo "  dev             - Run backend + frontend together"
	@echo "  dev-backend     - Run only the Go API (:8080)"
	@echo "  dev-frontend    - Run only the Vite dev server (:5173)"
	@echo "  build           - Build backend binary + frontend production bundle"
	@echo "  lint            - Lint backend (go vet) and frontend (eslint)"
	@echo "  migrate         - Apply DB migrations"
	@echo "  migrate-down    - Roll back the last migration"
	@echo "  sqlc            - Regenerate typed Go code from db/queries/"
	@echo "  swag            - Regenerate Swagger/OpenAPI docs"
	@echo "  thunderid-up    - Start ThunderID (quick-start + OpenSchool overlay)"
	@echo "  thunderid-down  - Stop ThunderID"
	@echo "  thunderid-logs  - Tail ThunderID server logs"
	@echo "  thunderid-reset - Stop ThunderID and wipe its volumes (fresh tenant)"
	@echo "  down            - Stop Postgres and ThunderID"
	@echo "  clean           - Remove build artifacts"

setup:
	@chmod +x setup.sh
	@./setup.sh

dev:
	@chmod +x start.sh
	@./start.sh

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

swag:
	cd $(BACKEND_DIR) && swag init -g cmd/api/main.go

thunderid-up:
	cd $(THUNDERID_DIR) && $(THUNDERID_COMPOSE) up -d

thunderid-down:
	cd $(THUNDERID_DIR) && $(THUNDERID_COMPOSE) down

thunderid-logs:
	cd $(THUNDERID_DIR) && $(THUNDERID_COMPOSE) logs -f thunderid

thunderid-reset:
	cd $(THUNDERID_DIR) && $(THUNDERID_COMPOSE) down -v

down:
	cd $(BACKEND_DIR) && docker compose down
	cd $(THUNDERID_DIR) && $(THUNDERID_COMPOSE) down

clean:
	rm -rf $(BACKEND_DIR)/bin
	rm -rf $(FRONTEND_DIR)/dist