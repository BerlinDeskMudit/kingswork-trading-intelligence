# KingStop Roadmap

This document outlines proposed future work beyond the current implementation.
Items are **drafts pending owner confirmation** — priorities and timelines may
change.

## Current Status

KingStop is a full-stack trading-intelligence and paper-trading platform. The
React 18 + Vite frontend, the FastAPI `/api/v1` surface (28 domain routers),
the signal/risk/backtest/fusion engines, the CPMM prediction markets, the
social layer, the Groq-powered chat, and the SQLite-first data layer are all
implemented and CI-verified. Optional Yahoo Finance, Redis, Stripe, and Groq
integrations ship **off by default**.

---

## Phase 1 — Real Broker Integration & Order Execution

> Status: **Proposed**

The trading loop is currently paper-only. Phase 1 would add pluggable broker
adapters behind the existing `broker` domain.

**Planned work:**

- [ ] Pluggable `BrokerGateway` interface (paper stays the default)
- [ ] Alpaca and/or paper-trading exchange adapter (US equities)
- [ ] Real order-type support (market, limit, stop) with client-order-ID
      idempotency
- [ ] Position and order reconciliation against the broker
- [ ] Kill-switch and responsible-use guardrails enforced before any live
      route exists

---

## Phase 2 — Live Market Data Expansion

> Status: **Proposed**

Market data currently streams from Yahoo Finance when enabled and from
deterministic fixtures otherwise.

**Planned work:**

- [ ] Additional data providers behind the collector interface (Polygon,
      Alpha Vantage, or a self-hosted feed)
- [ ] Intraday WebSocket price streaming to the dashboard
- [ ] Historical data caching with backfill jobs
- [ ] More NSE / BSE / crypto index comparisons

---

## Phase 3 — ML Signal Model Improvements

> Status: **Proposed**

The signal engine ships a preloaded ensemble. Phase 3 would make the ML layer
open and trainable by contributors.

**Planned work:**

- [ ] Feature store for labeled training windows
- [ ] Training pipeline with reproducible experiment tracking
- [ ] Model registry with versioned, auditable deployments (shadow → live
      enforcement)
- [ ] Backtest quality metrics (sharpe, max drawdown, hit rate) surfaced in UI
- [ ] Hyperparameter sweep harness + CI integration

---

## Phase 4 — Community, Moderation & Realtime Social

> Status: **Proposed**

The social feed, journals, and leaderboards exist; realtime and moderation do
not.

**Planned work:**

- [ ] WebSocket-powered live feed, comments, and reactions
- [ ] Moderation tooling (reports, flagging, quiet-confirm)
- [ ] Digest emails / notifications engine
- [ ] Referral and challenge gamification improvements

---

## Phase 5 — Mobile / PWA & Accessibility

> Status: **Proposed**

**Planned work:**

- [ ] Progressive Web App (service worker, offline shell, installable)
- [ ] Responsive dashboard audit for small screens
- [ ] Keyboard-navigation and screen-reader pass on every route
- [ ] Performance budget for route-level JS chunks

---

## Phase 6 — Production Deployment & Observability

> Status: **Proposed**

**Planned work:**

- [ ] Kubernetes manifests / Helm chart for the stack
- [ ] Prometheus metrics and Grafana dashboards
- [ ] Structured logging and OpenTelemetry tracing
- [ ] Load-testing harness (k6) for the API surface
- [ ] CI e2e tests behind the live demo (keepalive-style health checks)

---

## Ongoing — Community & Documentation

- [ ] Interactive in-browser tutorial
- [ ] API reference and endpoint examples per domain
- [ ] Translations: Spanish, French, Arabic, Hindi, Portuguese
- [ ] Kept up to date: `ARCHITECTURE.md`, `CONTRIBUTING.md`, screenshots

---

## How to suggest features

Open a [Feature Request](https://github.com/BerlinDeskMudit/kingswork-trading-intelligence/issues/new/choose)
on GitHub with the details of what you'd like to see.

## How to contribute to roadmap items

1. Comment on the relevant issue (or create one if none exists).
2. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the development workflow.
3. Read [`ARCHITECTURE.md`](ARCHITECTURE.md) for where the code lives.
4. Submit a PR with tests and documentation.