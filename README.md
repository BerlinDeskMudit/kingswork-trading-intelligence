# KingStop (KingsWork)

**A full-stack trading intelligence and paper-trading platform.**

KingStop brings market monitoring, technical signals, portfolio workflows, backtesting, prediction markets, risk tools, social features, and AI-assisted research into one authenticated dashboard.

[Live application](https://kingswork-ruddy.vercel.app) · [Portfolio](https://mudityaraghav.vercel.app) · [Architecture notes](ARCHITECTURE.md)

> KingStop is an engineering and educational project. It does not provide financial advice or execute real brokerage trades.

## Product overview

- US, NSE, BSE, and crypto market views with historical and real-time data workflows
- Signal analysis, screeners, watchlists, news, comparisons, and price targets
- User-owned paper portfolios, wallets, positions, trade plans, and backtests
- Risk exposure, correlation, heatmap, stop-loss, and take-profit tools
- Prediction markets, leaderboards, achievements, streaks, and daily challenges
- Trading journal, social feed, marketplace, referrals, alerts, and notifications
- AI market chat powered by Groq when configured
- JWT authentication, account preferences, guided onboarding, and keyboard navigation
- Responsive URL-driven dashboard routes with WebSocket updates

## Engineering highlights

The backend is organized as domain routers behind a versioned FastAPI surface. The React frontend uses route guards, typed service functions, and lazy page loading. SQLite and deterministic market fixtures make local development self-contained, while Yahoo Finance, Redis, Stripe, and Groq integrations can be enabled independently.

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Recharts |
| Backend | FastAPI, Python, Pydantic, SQLAlchemy |
| Data | SQLite by default, Yahoo Finance integration, Pandas/NumPy |
| Intelligence | Scikit-learn, technical-analysis indicators, Groq chat |
| Realtime | FastAPI WebSockets |
| Identity | JWT bearer authentication, bcrypt password hashing |
| Optional services | Redis caching and Stripe billing |

## Architecture

```text
Browser
  └─ React/Vite application (/kingswork/)
       ├─ REST requests (/api/v1/*)
       └─ WebSocket connection (/ws/*)
            └─ FastAPI application
                 ├─ Domain routers (market, portfolio, risk, social, account)
                 ├─ SQLAlchemy models and services
                 ├─ SQLite / configurable database
                 └─ Optional Yahoo Finance, Redis, Stripe, and Groq services
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for routing, state, data ownership, and extension guidance.

## Quick start

### Prerequisites

- Python 3.11+
- Node.js 20+
- npm

### 1. Start the API

```bash
git clone https://github.com/0xMudit/kingswork-trading-intelligence.git
cd kingswork-trading-intelligence/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API is available at [http://localhost:8000](http://localhost:8000) and its interactive OpenAPI documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Start the frontend

In a second terminal:

```bash
cd kingswork-trading-intelligence/frontend
npm install
npm run dev
```

Open [http://localhost:5173/kingswork/](http://localhost:5173/kingswork/). Vite proxies `/api` and `/ws` to the local FastAPI server.

The development database seeds demo users and sample trading data. Override all demo/test account values in `backend/.env` for any shared deployment.

## Environment configuration

Copy `backend/.env.example` to `backend/.env`. The application works locally with SQLite and simulated market data; external service keys are optional.

| Group | Important variables |
| --- | --- |
| Core | `DATABASE_URL`, `SECRET_KEY`, `DEBUG`, `API_PREFIX` |
| Market data | `USE_LIVE_MARKET_DATA`, `YAHOO_REFRESH_INTERVAL`, `MARKET_DATA_TIMEOUT_SECONDS` |
| AI chat | `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_TIMEOUT_SECONDS` |
| Cache | `USE_REDIS`, `REDIS_URL` |
| Billing | `STRIPE_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Risk defaults | `MAX_POSITION_SIZE_PCT`, `MAX_PORTFOLIO_RISK_PCT`, `STOP_LOSS_PCT` |

Do not commit `backend/.env`, databases, logs, or production credentials. These are excluded by `.gitignore`.

## Docker

```bash
docker compose up --build
```

This starts the API on port `8000` and the frontend on port `5173`. Review the compose environment and reverse-proxy settings before production use.

## Verification

Frontend:

```bash
cd frontend
npm run typecheck
npm test
npm run build
```

Backend syntax check:

```bash
cd backend
python3 -m compileall -q .
```

## Project structure

```text
backend/
  api/              Versioned domain routers
  auth/             JWT authentication and request dependencies
  collectors/       Market data acquisition
  models/           SQLAlchemy domain models
  services/         Shared business logic
  main.py           FastAPI application and route registration
  config.py         Typed environment configuration
frontend/
  src/components/   Trading and analytics UI
  src/features/     Navigation, onboarding, chat, and feature modules
  src/pages/        Landing, authentication, documentation, dashboard
  src/routes/       Route definitions and guards
  src/services/     API client functions
```

## API domains

The `/api/v1` surface includes authentication, accounts, stocks, signals, portfolios, alerts, modes, trading models, screeners, news, journals, analytics, trading tools, social features, prediction markets, marketplace, price targets, referrals, watchlists, payments, and AI chat. WebSocket routes provide live update channels.
