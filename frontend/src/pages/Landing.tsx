import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  Gauge,
  LineChart,
  LockKeyhole,
  Play,
  RadioTower,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const marketRows = [
  { ticker: "NVDA", price: 824.15, change: 4.32, signal: "BUY", volume: "95.1M" },
  { ticker: "AAPL", price: 218.45, change: 1.87, signal: "BUY", volume: "58.2M" },
  { ticker: "TSLA", price: 245.6, change: -0.82, signal: "HOLD", volume: "72.8M" },
  { ticker: "META", price: 512.3, change: 3.45, signal: "BUY", volume: "22.5M" },
  { ticker: "AMZN", price: 195.75, change: 0.95, signal: "NEUTRAL", volume: "38.7M" },
  { ticker: "GOOGL", price: 178.9, change: -0.45, signal: "WATCH", volume: "19.4M" },
]

const models = [
  {
    name: "Preloaded Ensemble v1",
    icon: BrainCircuit,
    value: "Balanced",
  },
  {
    name: "Real-Time Fusion Intelligence",
    icon: RadioTower,
    value: "Adaptive",
  },
]

function MarketWall() {
  const pathPoints = useMemo(
    () => [
      "8,70",
      "18,62",
      "27,66",
      "36,51",
      "48,56",
      "59,42",
      "70,48",
      "82,31",
      "94,35",
    ],
    []
  )

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-[0.06]" />
      <div className="absolute inset-x-0 top-20 mx-auto h-[520px] max-w-6xl rounded-[2rem] border border-white/10 bg-black/30 shadow-ink backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="absolute left-1/2 top-24 hidden w-[84rem] max-w-[94vw] -translate-x-1/2 grid-cols-[1.2fr_0.8fr] gap-4 px-4 lg:grid"
      >
        <div className="rounded-lg border border-white/10 bg-card/70 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-primary">Signal cockpit</p>
              <h2 className="mt-2 text-2xl font-semibold">NVDA momentum lock</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-market-up/30 bg-market-up/10 px-3 py-1 text-sm text-market-up">
              <span className="h-2 w-2 rounded-full bg-market-up animate-pulse" />
              Live
            </div>
          </div>
          <div className="relative h-64 overflow-hidden rounded-lg border border-white/10 bg-background">
            <svg viewBox="0 0 100 80" className="h-full w-full" role="img" aria-label="Market signal chart">
              <defs>
                <linearGradient id="kingstopChart" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#28d17c" stopOpacity="0.42" />
                  <stop offset="100%" stopColor="#28d17c" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`M ${pathPoints.join(" L ")} L 94 80 L 8 80 Z`} fill="url(#kingstopChart)" />
              <polyline points={pathPoints.join(" ")} fill="none" stroke="#28d17c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              {[18, 36, 59, 82].map((x, index) => (
                <line key={x} x1={x} y1="10" x2={x} y2="76" stroke="#ffffff" strokeOpacity={index === 2 ? 0.22 : 0.08} />
              ))}
            </svg>
            <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-3 text-sm">
              {[
                ["Confidence", "76%"],
                ["Regime", "Bullish"],
                ["Drawdown", "-4.8%"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-black/40 p-3 backdrop-blur">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 font-mono font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-card/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Gauge className="h-4 w-4 text-primary" />
              Model stack
            </div>
            <div className="grid gap-3">
              {models.map((model) => {
                const Icon = model.icon
                return (
                  <div key={model.name} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm">{model.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{model.value}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-card/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4 text-primary" />
              Market tape
            </div>
            <div className="divide-y divide-white/10">
              {marketRows.slice(0, 5).map((row) => {
                const isUp = row.change >= 0
                return (
                  <div key={row.ticker} className="grid grid-cols-[0.7fr_1fr_0.8fr] items-center gap-3 py-2 text-sm">
                    <span className="font-semibold">{row.ticker}</span>
                    <span className="font-mono">${row.price.toFixed(2)}</span>
                    <span className={`flex items-center justify-end gap-1 font-mono ${isUp ? "text-market-up" : "text-market-down"}`}>
                      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {isUp ? "+" : ""}{row.change.toFixed(2)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [selectedTicker, setSelectedTicker] = useState("NVDA")

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}kingstop-mark.svg`} alt="KingStop" className="h-9 w-9" />
            <span className="text-lg font-semibold tracking-tight">KingStop</span>
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/docs")}>
              <BookOpen className="mr-2 h-4 w-4" />
              Docs
            </Button>
            <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => navigate("/login")}>
              Sign in
            </Button>
            <Button onClick={() => navigate("/login")}>
              <LockKeyhole className="mr-2 h-4 w-4" />
              Seeded demo
            </Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative min-h-[88vh] overflow-hidden px-4 pt-24 sm:px-6">
          <MarketWall />
          <div className="relative z-10 mx-auto grid max-w-7xl gap-8 pb-12 pt-14 lg:grid-cols-[0.82fr_1.18fr] lg:pt-24">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm text-primary"
              >
                <Sparkles className="h-4 w-4" />
                Preloaded trading intelligence
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl"
              >
                KingStop
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground"
              >
                A real-time data fusion and intelligence platform for stock trading, with selectable preloaded models for live signals and backtests.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <Button size="lg" className="h-12 px-6" onClick={() => navigate("/login")}>
                  <Play className="mr-2 h-4 w-4" />
                  Launch cockpit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-6" onClick={() => navigate("/signup")}>
                  Create account
                </Button>
              </motion.div>

              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                {[
                  ["SQLite", "seeded"],
                  ["Models", "2 ready"],
                  ["Tour", "first-run"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-card/60 p-3 backdrop-blur">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:hidden">
              <div className="rounded-lg border border-white/10 bg-card/85 p-4 shadow-ink">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Market tape</p>
                  <span className="text-xs text-primary">Live preview</span>
                </div>
                <div className="grid gap-2">
                  {marketRows.slice(0, 4).map((row) => (
                    <button
                      key={row.ticker}
                      onClick={() => setSelectedTicker(row.ticker)}
                      className={`grid grid-cols-[0.7fr_1fr_0.8fr] items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                        selectedTicker === row.ticker ? "bg-primary/10 text-primary" : "bg-muted/50"
                      }`}
                    >
                      <span className="font-semibold">{row.ticker}</span>
                      <span className="font-mono">${row.price.toFixed(2)}</span>
                      <span className={row.change >= 0 ? "text-market-up" : "text-market-down"}>
                        {row.change >= 0 ? "+" : ""}{row.change.toFixed(2)}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-card/40 px-4 py-8 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {[
              { icon: BrainCircuit, title: "Pick the model", text: "Select Preloaded Ensemble v1 or Fusion Intelligence separately for live trading and backtesting." },
              { icon: LineChart, title: "Trust the replay", text: "Run historical backtests with equity curves, confidence, drawdown, Sharpe, and trade counts." },
              { icon: RadioTower, title: "Keep the pulse", text: "Live market fallback data keeps the demo useful even when external feeds are unavailable." },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="flex gap-4 rounded-lg border border-white/10 bg-background/60 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-lg border border-white/10 bg-card/70 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-primary">Reviewer access</p>
              <h2 className="mt-2 text-2xl font-bold">Open with test@kingstop.dev</h2>
              <p className="mt-2 text-muted-foreground">Password: KingStop@2026. The database seeds this account automatically.</p>
            </div>
            <Button size="lg" onClick={() => navigate("/login")}>
              Start tour
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
