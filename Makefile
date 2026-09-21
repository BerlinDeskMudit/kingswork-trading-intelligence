# KingStop convenience targets. Windows users without `make` can run the
# underlying commands directly (see COMMENTS above each target).

.PHONY: help dev-backend dev-frontend test typecheck build compose-up compose-down

help:
	@echo "Targets:"
	@echo "  make dev-backend   Start the FastAPI dev server  ->  cd backend && uvicorn main:app --reload --port 8000"
	@echo "  make dev-frontend  Start the Vite dev server     ->  cd frontend && npm run dev"
	@echo "  make test          Run backend and frontend tests"
	@echo "  make typecheck     Run the frontend TypeScript check"
	@echo "  make build         Build the frontend for production"
	@echo "  make compose-up    Start the full stack with Docker"
	@echo "  make compose-down  Stop the Docker stack"

dev-backend:
	cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && python -m pytest
	cd frontend && npm test

typecheck:
	cd frontend && npm run typecheck

build:
	cd frontend && npm run build

compose-up:
	docker compose up --build -d

compose-down:
	docker compose down