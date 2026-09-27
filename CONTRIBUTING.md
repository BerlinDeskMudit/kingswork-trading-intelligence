# Contributing to KingStop

Thank you for your interest in contributing to KingStop! This guide covers
everything you need to get started — from setting up your local environment to
submitting your first pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Project Architecture](#project-architecture)
- [Code Map](#code-map)
- [Running the Full Stack](#running-the-full-stack)
- [Running Tests](#running-tests)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Branch Naming](#branch-naming)
- [Pull Request Process](#pull-request-process)
- [Definition of Done](#definition-of-done)
- [Finding Things to Work On](#finding-things-to-work-on)
- [Getting Help](#getting-help)

## Code of Conduct

This project follows the
[Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating,
you agree to uphold it.

## Quick Start

```sh
# Clone the repo
git clone https://github.com/BerlinDeskMudit/kingswork-trading-intelligence.git
cd kingswork-trading-intelligence

# Branch for your change
git checkout -b feat/my-change

# Start the backend (terminal 1)
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Start the frontend (terminal 2)
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173/kingswork/](http://localhost:5173/kingswork/).
The Vite dev server proxies `/api` and `/ws` to FastAPI.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.11+ | `python --version` to check |
| Node.js | 20+ | `node --version` to check |
| npm | 9+ | `npm --version` to check |
| Docker | Optional | `docker compose up --build` to run the whole stack |
| Git | 2.x+ | `git version` to check |

> **Windows users:** The instructions work in PowerShell as-is. Use
> `.venv\Scripts\activate` instead of `source .venv/bin/activate`; the rest is
> identical.

## Local Development Setup

### Option A: Native (recommended for first contributions)

Backend:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt    # runtime dependencies
pip install -r requirements-dev.txt # dev dependencies (pytest, etc.)
cp .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend (second terminal):

```sh
cd frontend
npm install
npm run dev
```

### Option B: Docker

```sh
docker compose up --build
```

This boots both services: the API on `8000` and the frontend on `5173`.

### Verify it works

```sh
curl http://localhost:8000/health    # or any /api/v1 endpoint
npm run typecheck                    # from frontend/
```

## Project Architecture

```
kingswork-trading-intelligence/
├── backend/                     # FastAPI + SQLAlchemy + SQLite
│   ├── api/                     # Versioned domain routers (/api/v1)
│   ├── auth/                    # JWT authentication and request dependencies
│   ├── signals/                 # Technical + ML signal engines
│   ├── risk/                    # Risk manager: position sizing, VaR, exposure
│   ├── backtesting/             # Backtest engine: fills, PnL, drawdown
│   ├── fusion/                  # Intelligence-stack fusion engine
│   ├── alerts/                  # Alert engine
│   ├── collectors/              # Market data acquisition (Yahoo Finance)
│   ├── models/                  # SQLAlchemy domain models
│   ├── services/                # Shared business logic
│   ├── main.py                  # FastAPI app and route registration
│   └── config.py                # Typed environment configuration
├── frontend/                    # React 18 + Vite + Tailwind + Recharts
│   └── src/
│       ├── routes/              # Route constants, config, guards
│       ├── pages/               # Landing, auth, documentation, dashboard
│       ├── components/          # Trading and analytics UI
│       ├── features/            # Navigation, onboarding, chat, feature modules
│       ├── services/            # Typed API client functions
│       └── lib/                 # Auth context, shared state
├── assets/
│   └── screenshots/             # Product screenshots used in the README
├── docker-compose.yml           # Backend + frontend stack
└── ARCHITECTURE.md              # Routing, state ownership, extension guidance
```

## Code Map

| Concern | Where it lives |
|---------|----------------|
| Identity | `backend/api/auth*`, `backend/api/account*`, `backend/auth/` |
| Market data | `backend/api/stocks*`, `backend/api/data*`, `backend/api/news*`, `backend/collectors/` |
| Signals & analysis | `backend/signals/`, `backend/api/signals*`, `backend/api/analytics*`, `backend/fusion/` |
| Portfolio & trading | `backend/api/portfolio*`, `backend/api/broker*`, `backend/backtesting/` |
| Risk | `backend/risk/`, `backend/api` risk routes, `backend/model` risk caps |
| Prediction markets | `backend/api/predict*` |
| Social & messaging | `backend/api/social*`, `backend/api/engagement*`, `backend/api/journal*`, `backend/api/alerts*` |
| AI chat | `backend/api/llm-chat*`, `backend/api/ai-explain*` |
| Frontend routes | `frontend/src/routes/` (paths, config, guards) |
| Frontend API layer | `frontend/src/services/api.ts` |

Read [ARCHITECTURE.md](ARCHITECTURE.md) before making changes — it describes
routing, state ownership, and how the dashboard sections are organized.

## Running the Full Stack

The data service, portfolio service, and onboarding seed data are all driven
through the same FastAPI surface the UI uses, so a successful boot looks like:

1. FastAPI serves `/api/v1/*` on port `8000` and initializes the SQLite
   database with demo users and sample trading data.
2. The frontend runs at `http://localhost:5173/kingswork/` and proxies `/api`
   and `/ws` to FastAPI.
3. Sign in with the demo credentials seeded by the development database, or
   register a fresh account.

Verify the API responds:

```sh
curl http://localhost:8000/docs          # interactive OpenAPI docs
curl http://localhost:8000/api/v1/...    # an endpoint you are working on
```

## Running Tests

Backend (from `backend/`):

```sh
python -m pytest          # full suite
python -m pytest tests/test_risk_manager.py -v
python -m pytest tests/test_backtesting_engine.py -v
```

The backend suite covers the risk manager (position sizing, risk scoring,
value-at-risk) and the backtest engine (fills, commission, PnL, drawdown).

Frontend (from `frontend/`):

```sh
npm run typecheck         # TypeScript, no emit
npm test                  # Vitest unit tests
npm run build             # production build (lint-checked by CI)
```

CI runs all of these on every push and pull request.

## Code Style

### Python

- **Python 3.11+**, `from __future__ import annotations` where it improves
  clarity. Prefer minimal, typed code.
- Follow PEP 8. Blank lines, imports (stdlib, third-party, local), and
  docstrings should read like the surrounding module — match the file you are
  editing.
- Use **Pydantic models** for request/response schemas and **SQLAlchemy
  models** for persistence. Do not hand-roll validation.
- Configuration flows through `backend/config.py` (typed env settings). Do not
  call `os.getenv` inside business logic.
- Wrap errors with context: `raise HTTPException(status_code=..., detail=...)`.

### TypeScript / React

- TypeScript everywhere; the check is `npm run typecheck` (strict).
- Prefer the existing component and feature structure. New API calls go
  through `frontend/src/services/`, new routes are registered in
  `frontend/src/routes/`.
- Dashboard pages are **URL-driven** (`/dashboard/:section`) and lazy-loaded.
  Keep cross-feature navigation in the dashboard shell.
- Match the existing Tailwind/Radix UI conventions — do not introduce a new
  styling system without discussing it first.

### Documentation

- Update `README.md`, `ARCHITECTURE.md`, or this file when a change affects
  public behavior, configuration, or architecture.
- Keep new screenshots in `assets/screenshots/` with the `NN-slug.png` naming
  convention.

### Security

- Never commit real keys, passwords, or DSN strings.
- `SECRET_KEY`, `STRIPE_*`, and `GROQ_API_KEY` must remain environment
  variables.
- Demo values in `backend/.env.example` are for local development only.

## Commit Messages

Use clear, descriptive commit messages following Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `ci`, `chore`

**Examples:**

```
feat(prediction): add multi-outcome CPMM markets

Adds multi-outcome resolution to the prediction engine with auditable
share redemption. Extends /api/v1/predict with outcome-level endpoints.

Closes #123
```

```
test(risk): add VaR edge cases for zero and single-asset portfolios

Covers the degenerate cases the risk manager previously treated as
normal. Relates to #456.
```

- Keep the subject line under 72 characters.
- Wrap the body at 80 characters.
- Reference issues with `Closes #N` or `Relates to #N`.

## Branch Naming

Use descriptive branch names with a type prefix:

| Prefix | Use for |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `test/` | Test additions or fixes |
| `refactor/` | Code refactoring |
| `ci/` | CI/infrastructure changes |

**Examples:**

- `feat/live-broker-integration`
- `fix/risk-var-degenerate-portfolio`
- `docs/contributor-guide`
- `test/backtest-commission-ticks`

## Pull Request Process

1. **Fork** the repository and create a branch from `main`.
2. **Make your changes** with tests.
3. **Run the full verification gates** — backend `python -m pytest`, frontend
   `npm run typecheck`, `npm test`, and `npm run build`.
4. **Update documentation** if your change affects public behavior, config, or
   architecture.
5. **Open a PR** against `main` with a clear title and description, and fill
   out the [PR template](.github/PULL_REQUEST_TEMPLATE.md) checklist.
6. **Wait for CI** to pass and for a maintainer review.

### Review expectations

- PRs require at least one maintainer review.
- CI must pass (backend tests, frontend typecheck + tests + build).
- Large changes may be split into smaller PRs for easier review.

## Definition of Done

A pull request is considered complete when:

- [ ] `python -m pytest` passes (from `backend/`)
- [ ] `npm run typecheck` passes (from `frontend/`)
- [ ] `npm test` passes (from `frontend/`)
- [ ] `npm run build` passes (from `frontend/`)
- [ ] New code has corresponding tests
- [ ] Documentation is updated (if the change affects public behavior, config,
      or architecture)
- [ ] New SQLAlchemy models are reflected in the schema/docs
- [ ] No secrets, keys, or credentials are committed
- [ ] The PR description explains the "why" behind the change

## Finding Things to Work On

- **Good first issues** are tagged
  [`good first issue`](https://github.com/BerlinDeskMudit/kingswork-trading-intelligence/labels/good%20first%20issue).
- **Help wanted** issues are tagged
  [`help wanted`](https://github.com/BerlinDeskMudit/kingswork-trading-intelligence/labels/help%20wanted).
- Check the [ROADMAP.md](ROADMAP.md) for planned features.
- Browse the
  [open issues](https://github.com/BerlinDeskMudit/kingswork-trading-intelligence/issues)
  for bugs and feature requests.

### High-impact contribution areas

| Area | Examples | Difficulty |
|------|----------|------------|
| Test coverage | Risk manager edge cases, backtest fills, API integration tests | Easy–Medium |
| Market data | New collectors, data-enrichment endpoints, index config | Medium |
| Prediction markets | New CPMM features, resolution flows, UI polish | Medium |
| AI chat | Groq prompt improvements, tool use, memory | Medium |
| Frontend | New dashboard sections, accessibility, keyboard navigation | Easy–Medium |
| Documentation | Tutorials, API examples, translations | Easy |
| Deployment | Helm/K8s manifests, Terraform, observability | Medium |
| Security | Auth hardening, dependency auditing, secret scanning | Easy–Medium |

## Getting Help

- **Issues** — [GitHub Issues](https://github.com/BerlinDeskMudit/kingswork-trading-intelligence/issues)
- **Discussions** — [GitHub Discussions](https://github.com/BerlinDeskMudit/kingswork-trading-intelligence/discussions)
- **Security** — [Security Advisories](https://github.com/BerlinDeskMudit/kingswork-trading-intelligence/security/advisories/new)

Thank you for helping build open trading infrastructure! 🚀