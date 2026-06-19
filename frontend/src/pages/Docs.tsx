import { Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Code2,
  Database,
  Globe2,
  KeyRound,
  LineChart,
  RadioTower,
  ShieldCheck,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const userGuides = [
  {
    icon: Globe2,
    title: "Choose a market",
    body: "Use US, NSE, or BSE in the dashboard header. NSE/BSE symbols use Yahoo Finance suffixes such as RELIANCE.NS and TCS.BO.",
  },
  {
    icon: BrainCircuit,
    title: "Switch models",
    body: "Live and backtesting keep separate model selections, so you can compare aggressive, conservative, momentum, and reversion behavior.",
  },
  {
    icon: LineChart,
    title: "Run a replay",
    body: "Backtest mode simulates the selected ticker, period, and model, then updates equity curve, risk metrics, and daily challenge progress.",
  },
  {
    icon: Wallet,
    title: "Use paper money",
    body: "The demo wallet, streak rewards, and challenge rewards are isolated paper values for reviewer-safe experimentation.",
  },
]

const developerGuides = [
  {
    icon: KeyRound,
    title: "Auth",
    body: "JWT auth lives under /api/v1/auth. Seeded reviewer access is test@kingstop.dev / KingStop@2026.",
  },
  {
    icon: Database,
    title: "Storage",
    body: "SQLite stores users, preferences, wallets, alerts, streaks, achievements, and daily challenges.",
  },
  {
    icon: RadioTower,
    title: "Data",
    body: "Free market data uses yfinance/Yahoo symbols with deterministic sample fallbacks when live requests fail or are disabled.",
  },
  {
    icon: Code2,
    title: "API",
    body: "Backend OpenAPI is available at http://127.0.0.1:8000/docs while the local API base is /api/v1.",
  },
]

const endpoints = [
  ["POST", "/api/v1/auth/login", "Seeded reviewer login"],
  ["GET", "/api/v1/stocks/overview?market=nse", "NSE overview"],
  ["GET", "/api/v1/stocks/overview?market=bse", "BSE overview"],
  ["GET", "/api/v1/signals/RELIANCE.NS", "Indian ticker signal"],
  ["GET", "/api/v1/portfolio/backtest/TCS.BO", "BSE backtest replay"],
  ["GET", "/api/v1/models", "Available live/backtest models"],
]

function GuideItem({ item }: { item: (typeof userGuides)[number] }) {
  const Icon = item.icon
  return (
    <div className="rounded-lg border border-white/10 bg-card/70 p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="font-semibold">{item.title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
    </div>
  )
}

export default function Docs() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/kingstop-mark.svg" alt="KingStop" className="h-9 w-9" />
            <div>
              <p className="text-lg font-semibold leading-none tracking-tight">KingStop</p>
              <p className="mt-1 text-xs text-muted-foreground">Docs for users and developers</p>
            </div>
          </Link>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <section className="rounded-lg border border-white/10 bg-card/70 p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm text-primary">
            <BookOpen className="h-4 w-4" />
            KingStop documentation
          </div>
          <h1 className="text-4xl font-bold tracking-tight">User guide and developer reference</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            KingStop is configured for free US, NSE, and BSE demos, model comparison, auth-protected review access, and repeatable backtesting.
          </p>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">For Users</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {userGuides.map((item) => <GuideItem key={item.title} item={item} />)}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">For Developers</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {developerGuides.map((item) => <GuideItem key={item.title} item={item} />)}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-card/70">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-xl font-semibold">Useful API Calls</h2>
            <p className="mt-2 text-sm text-muted-foreground">Run these against the local backend while the dev server is active.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Endpoint</th>
                  <th className="px-5 py-3 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map(([method, endpoint, purpose]) => (
                  <tr key={endpoint} className="border-b border-white/10 last:border-0">
                    <td className="px-5 py-3 font-mono text-primary">{method}</td>
                    <td className="px-5 py-3 font-mono">{endpoint}</td>
                    <td className="px-5 py-3 text-muted-foreground">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
