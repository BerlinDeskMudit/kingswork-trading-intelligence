# AGENTS.md

Guidance for contributors maintaining and extending KingStop.

## Build & test commands

| Task | Command |
|------|---------|
| Backend tests | `cd backend && python -m pytest` |
| Frontend typecheck | `cd frontend && npm run typecheck` |
| Frontend tests | `cd frontend && npm test` |
| Frontend build | `cd frontend && npm run build` |
| Full stack (Docker) | `docker compose up --build` |

CI runs all of these on every push and pull request (see
`.github/workflows/ci.yml`).

## Code conventions

- **Commits:** Conventional Commits (`feat`, `fix`, `docs`, `test`,
  `refactor`, `ci`, `chore`) with a domain scope, e.g. `feat(predict): ...`.
- **Backend (Python 3.11+):** FastAPI + SQLAlchemy + Pydantic. New endpoints
  belong in `backend/api/` and are registered in `backend/main.py`. Read
  configuration through `backend/config.py` — no `os.getenv` in business logic.
- **Frontend (TypeScript, React 18):** API calls go through
  `frontend/src/services/`, routes are registered in `frontend/src/routes/`.
  Dashboard pages are URL-driven (`/dashboard/:section`) and lazy-loaded.
- **Docs:** keep `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, and
  `ROADMAP.md` in sync with public behavior changes.

## Important notes

- Never commit `backend/.env`, `*.db`, keys, or credentials (all gitignored).
- Stripe / Groq / Redis are opt-in via environment variables and ship disabled.
- KingStop is a paper-trading and education project — no real brokerage
  execution.
- Match the style of the file you are editing; do not introduce new
  dependencies without discussing them first.