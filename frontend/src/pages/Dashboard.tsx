import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Clock,
  BookOpen,
  Gauge,
  Globe2,
  LineChart,
  Loader2,
  Menu,
  Command,
  LogOut,
  Play,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Settings,
  TrendingDown,
  TrendingUp,
  UserCircle,
  Wallet,
  X,
  Zap,
  Newspaper,
  Bitcoin,
  Trophy,
  Filter,
  PenLine,
  Bell,
  Trash2,
  TrendingUp as TrendingUpIcon,
  CreditCard,
  Crown,
  LockKeyhole,
  ReceiptText,
  type LucideIcon,
} from "lucide-react"
import NavbarStreak from "@/components/engagement/NavbarStreak"
import HeatmapView from "@/components/HeatmapView"
import CorrelationMatrix from "@/components/CorrelationMatrix"
import RiskExposurePanel from "@/components/RiskExposurePanel"
import TradePlanCalculator from "@/components/TradePlanCalculator"
import OnboardingWizard from "@/components/OnboardingWizard"
import MultiPortfolioPanel from "@/components/MultiPortfolioPanel"
import PriceTargetTracker from "@/components/PriceTargetTracker"
import TradeCopyPanel from "@/components/TradeCopyPanel"
import SocialFeedPanel from "@/components/SocialFeedPanel"
import MarketplacePanel from "@/components/MarketplacePanel"
import BonusModal from "@/components/engagement/BonusModal"
import AchievementsPanel from "@/components/engagement/AchievementsPanel"
import DailyChallengesPanel from "@/components/engagement/DailyChallengesPanel"
import WatchlistPanel from "@/components/WatchlistPanel"
import FirstVisitWelcome from "@/features/onboarding/FirstVisitWelcome"
import FirstActionCard from "@/features/onboarding/FirstActionCard"
import DashboardNavigation from "@/features/navigation/DashboardNavigation"
import CommandPalette from "@/features/navigation/CommandPalette"
import LlmChatPanel from "@/features/chat/LlmChatPanel"
import { dashboardNavigationItems } from "@/features/navigation/navigation-items"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  getMarketOverview,
  getSignals,
  getTradingModels,
  getWallet,
  progressDailyChallenge,
  recordBacktestRun,
  runBacktest,
  updateModelPreference,
  getScreener,
  getNews,
  getJournalEntries,
  createJournalEntry,
  deleteJournalEntry,
  getLeaderboard,
  getPortfolioStats,
  getPredictMarkets,
  createPredictMarket,
  buyPredictShares,
  getPredictMarketQuote,
  sellPredictShares,
  resolveMarket,
  buyCash,
  subscribe,
  getSubscription,
  cancelSubscription,
  getPaymentHistory,
  getAccountSettings,
  updateAccountPreferences,
  changePassword,
} from "@/services/api.ts"
import { cn, formatPrice, formatVolume } from "@/lib/utils"
import { dashboardSections, paths, type DashboardSectionId } from "@/routes/paths"

type Mode = "live" | "backtesting"
type MarketKey = "us" | "nse" | "bse"
type DashTab = DashboardSectionId
type PredictSide = "YES" | "NO"

type TradingModel = {
  id: string
  name: string
  short_name: string
  description: string
  modes: Mode[]
  risk_profile: string
  latency: string
  signal_sources: string[]
  status?: string
  trained?: boolean
  training_rows?: number
}

type Preferences = Record<Mode, string>

type MarketRow = {
  ticker: string
  name: string
  market?: string
  exchange?: string
  currency?: string
  source?: string
  price: number
  change: number
  change_pct: number
  volume: number
  signal: string
}

type SignalResponse = {
  model?: TradingModel
  fused_signal?: {
    signal: string
    confidence: number
    score?: number
    sources?: string[]
  }
  technical?: {
    signal: string
    confidence: number
  }
  ml?: {
    signal: string
    confidence: number
    probabilities?: {
      sell: number
      hold: number
      buy: number
    }
    regime?: {
      regime: string
      confidence: number
    }
  }
  fusion_context?: {
    data_source?: string
    fusion_note?: string
  }
}

type WalletResponse = {
  wallet?: {
    cash: number
    total_value: number
    positions: Array<{
      ticker: string
      quantity: number
      current_price: number
      unrealized_pnl: number
      value: number
    }>
  }
  dummy_money?: number
}

type PaymentHistoryItem = {
  id: number
  amount_usd: number
  virtual_cash?: number | null
  product_type: string
  status: string
  created_at?: string | null
}

type AccountPreferences = {
  leaderboardOptIn: boolean
  publicProfile: boolean
  pushNotifications: boolean
  resolutionAlerts: boolean
  priceAlerts: boolean
  streakReminders: boolean
  keyboardShortcutsEnabled: boolean
  dailyFundingLimit: number | null
  exposureLimit: number | null
}

type AccountSettings = {
  profile?: {
    id: number
    name: string
    email: string
    created_at?: string | null
    last_login?: string | null
  }
  payment_methods?: Array<{ id: string; brand?: string; last4?: string; exp_month?: number; exp_year?: number }>
  sessions?: Array<{ id: string; label: string; last_seen?: string | null; revocable: boolean }>
  capabilities?: {
    stripe_configured: boolean
    session_revocation: boolean
    two_factor: boolean
  }
}

type BacktestResponse = {
  model?: TradingModel
  latest_signal?: {
    signal: string
    confidence: number
  }
  result?: {
    total_return: number
    annualized_return: number
    sharpe_ratio: number
    max_drawdown: number
    win_rate: number
    total_trades: number
    profit_factor: number | null
    final_capital: number
    initial_capital: number
  }
  equity_curve?: Array<{ date: string; value: number }>
  trades?: Array<{
    date: string
    action: string
    price: number
    shares: number
    pnl?: number
    pnl_pct?: number
  }>
  data_source?: string
  warning?: string | null
}

type PredictPosition = {
  id: number
  side: PredictSide
  shares: number
  avg_price: number
  current_price: number
  cost_basis: number
  market_value: number
  unrealized_pnl: number
  payout_if_wins: number
}

type PredictMarket = {
  id: number
  question: string
  ticker?: string | null
  condition?: string | null
  threshold?: number | null
  category: string
  status: string
  yes_price: number
  no_price: number
  yes_pct: number
  no_pct: number
  yes_reserve?: number
  no_reserve?: number
  liquidity?: number
  total_volume: number
  resolves_at?: string | null
  resolved_at?: string | null
  user_position?: PredictPosition[] | null
  user_exposure?: number
  user_market_value?: number
  user_unrealized_pnl?: number
}

type PredictBuyState = {
  cost: string
  side: PredictSide
}

type PredictPreview = {
  shares: number
  avgPrice: number
  selectedPrice: number
  selectedPriceAfter: number
  yesPctAfter: number
  noPctAfter: number
  impactPct: number
  slippagePct: number
}

const fallbackModels: TradingModel[] = [
  {
    id: "preloaded_ensemble_v1",
    name: "Preloaded Ensemble v1",
    short_name: "Ensemble v1",
    description: "Bundled technical and ML ensemble trained on sample market structure.",
    modes: ["live", "backtesting"],
    risk_profile: "Balanced",
    latency: "Instant",
    signal_sources: ["technical", "ml"],
    status: "ready",
    trained: true,
    training_rows: 320,
  },
  {
    id: "realtime_fusion_intelligence_v1",
    name: "Real-Time Data Fusion & Intelligence Platform",
    short_name: "Fusion Intelligence",
    description: "Live tick, multi-timeframe, technical, and ML signal fusion for stock trading.",
    modes: ["live", "backtesting"],
    risk_profile: "Adaptive",
    latency: "Streaming",
    signal_sources: ["technical", "ml", "fusion"],
    status: "ready",
    trained: true,
    training_rows: 320,
  },
  {
    id: "technical_momentum_v1",
    name: "Technical Momentum Scanner v1",
    short_name: "Momentum Scanner",
    description: "Trend-following model that leans on moving averages, breakout continuation, and technical confirmation.",
    modes: ["live", "backtesting"],
    risk_profile: "Aggressive",
    latency: "Instant",
    signal_sources: ["technical", "momentum"],
    status: "ready",
    trained: true,
    training_rows: 320,
  },
  {
    id: "rsi_mean_reversion_v1",
    name: "RSI Mean Reversion Lab v1",
    short_name: "RSI Reversion",
    description: "Contrarian model for testing oversold bounces, overbought fades, and range-bound equities.",
    modes: ["live", "backtesting"],
    risk_profile: "Tactical",
    latency: "Instant",
    signal_sources: ["technical", "rsi"],
    status: "ready",
    trained: true,
    training_rows: 320,
  },
  {
    id: "volatility_breakout_v1",
    name: "Volatility Breakout Engine v1",
    short_name: "Vol Breakout",
    description: "Breakout model that rewards expanding ranges, larger candles, and high-volume continuation.",
    modes: ["live", "backtesting"],
    risk_profile: "High beta",
    latency: "Instant",
    signal_sources: ["technical", "volatility"],
    status: "ready",
    trained: true,
    training_rows: 320,
  },
  {
    id: "conservative_risk_guard_v1",
    name: "Conservative Risk Guard v1",
    short_name: "Risk Guard",
    description: "Lower-turnover model that filters low-confidence trades and reduces strong signals to controlled exposure.",
    modes: ["live", "backtesting"],
    risk_profile: "Conservative",
    latency: "Instant",
    signal_sources: ["risk", "technical", "ml"],
    status: "ready",
    trained: true,
    training_rows: 320,
  },
]

const fallbackMarketRows: MarketRow[] = [
  { ticker: "NVDA", name: "NVIDIA Corp.", price: 824.15, change: 34.12, change_pct: 4.32, volume: 95_100_000, signal: "BUY" },
  { ticker: "AAPL", name: "Apple Inc.", price: 218.45, change: 4.01, change_pct: 1.87, volume: 58_200_000, signal: "BUY" },
  { ticker: "TSLA", name: "Tesla Inc.", price: 245.6, change: -2.03, change_pct: -0.82, volume: 72_800_000, signal: "NEUTRAL" },
  { ticker: "META", name: "Meta Platforms", price: 512.3, change: 17.08, change_pct: 3.45, volume: 22_500_000, signal: "BUY" },
  { ticker: "AMZN", name: "Amazon.com", price: 195.75, change: 1.84, change_pct: 0.95, volume: 38_700_000, signal: "NEUTRAL" },
  { ticker: "GOOGL", name: "Alphabet Inc.", price: 178.9, change: -0.81, change_pct: -0.45, volume: 19_400_000, signal: "WATCH" },
  { ticker: "MSFT", name: "Microsoft", price: 449.2, change: 3.37, change_pct: 0.76, volume: 21_800_000, signal: "BUY" },
  { ticker: "JPM", name: "JPMorgan Chase", price: 202.14, change: -0.48, change_pct: -0.24, volume: 11_900_000, signal: "NEUTRAL" },
]

const nameByTicker: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft",
  GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com",
  TSLA: "Tesla Inc.",
  NVDA: "NVIDIA Corp.",
  META: "Meta Platforms",
  JPM: "JPMorgan Chase",
  V: "Visa",
  JNJ: "Johnson & Johnson",
  "RELIANCE.NS": "Reliance Industries",
  "TCS.NS": "Tata Consultancy Services",
  "HDFCBANK.NS": "HDFC Bank",
  "INFY.NS": "Infosys",
  "ICICIBANK.NS": "ICICI Bank",
  "SBIN.NS": "State Bank of India",
  "BHARTIARTL.NS": "Bharti Airtel",
  "ITC.NS": "ITC",
  "LT.NS": "Larsen & Toubro",
  "AXISBANK.NS": "Axis Bank",
  "RELIANCE.BO": "Reliance Industries",
  "TCS.BO": "Tata Consultancy Services",
  "HDFCBANK.BO": "HDFC Bank",
  "INFY.BO": "Infosys",
  "ICICIBANK.BO": "ICICI Bank",
  "SBIN.BO": "State Bank of India",
  "BHARTIARTL.BO": "Bharti Airtel",
  "ITC.BO": "ITC",
  "LT.BO": "Larsen & Toubro",
  "AXISBANK.BO": "Axis Bank",
}

const marketOptions: Array<{ id: MarketKey; label: string; description: string }> = [
  { id: "us", label: "US", description: "NASDAQ / NYSE" },
  { id: "nse", label: "NSE", description: "India NSE" },
  { id: "bse", label: "BSE", description: "India BSE" },
]

const defaultAccountPreferences: AccountPreferences = {
  leaderboardOptIn: false,
  publicProfile: false,
  pushNotifications: false,
  resolutionAlerts: true,
  priceAlerts: true,
  streakReminders: true,
  keyboardShortcutsEnabled: true,
  dailyFundingLimit: null,
  exposureLimit: null,
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function demoNewsData(ticker: string) {
  const normalizedTicker = ticker.trim().toUpperCase() || "AAPL"
  return {
    status: "ok",
    ticker: normalizedTicker,
    news: [
      {
        title: `${normalizedTicker} holds key support as traders watch volume confirmation`,
        summary: "Demo market desk note: price action is balanced, with buyers defending the latest pullback.",
        published_at: hoursAgo(0.6),
        url: "#",
        provider: "KingStop Demo",
        sentiment: "positive",
        confidence: 0.82,
        score: 2,
      },
      {
        title: `Analysts flag risk controls before the next ${normalizedTicker} breakout attempt`,
        summary: "Position sizing and stop discipline remain important while intraday volatility stays elevated.",
        published_at: hoursAgo(2.2),
        url: "#",
        provider: "KingStop Demo",
        sentiment: "neutral",
        confidence: 0.74,
        score: 0,
      },
      {
        title: `${normalizedTicker} options flow shows hedging demand into the close`,
        summary: "Protective activity picked up after a fast move, but spot volume remains above recent averages.",
        published_at: hoursAgo(5.4),
        url: "#",
        provider: "KingStop Demo",
        sentiment: "negative",
        confidence: 0.68,
        score: -1,
      },
    ],
    sentiment_summary: {
      positive: 1,
      negative: 1,
      neutral: 1,
      score: 1,
      overall: "positive",
      trend: "improving",
    },
  }
}

const demoJournalEntries = [
  {
    id: -601,
    ticker: "NVDA",
    note: "Entered only after price reclaimed VWAP. Need to avoid chasing the first candle next time.",
    sentiment: "bullish",
    pnl: 420,
    created_at: hoursAgo(8),
  },
  {
    id: -602,
    ticker: "RELIANCE.BO",
    note: "Watchlist trade. Better confirmation came from volume expansion, not the first resistance touch.",
    sentiment: "neutral",
    pnl: null,
    created_at: hoursAgo(26),
  },
  {
    id: -603,
    ticker: "TSLA",
    note: "Cut risk quickly when the thesis failed. Good execution, but entry was early.",
    sentiment: "bearish",
    pnl: -135,
    created_at: hoursAgo(48),
  },
]

const demoPredictMarkets: PredictMarket[] = [
  {
    id: -501,
    question: "Will NVDA close above $850 this week?",
    ticker: "NVDA",
    condition: "Weekly close",
    category: "stocks",
    status: "OPEN",
    yes_price: 0.62,
    no_price: 0.38,
    yes_pct: 62,
    no_pct: 38,
    yes_reserve: 152,
    no_reserve: 248,
    liquidity: 400,
    total_volume: 1240,
    user_position: [
      {
        id: -5101,
        side: "YES",
        shares: 12.5,
        avg_price: 0.56,
        current_price: 0.62,
        cost_basis: 7,
        market_value: 7.75,
        unrealized_pnl: 0.75,
        payout_if_wins: 12.5,
      },
    ],
    user_exposure: 7,
    user_market_value: 7.75,
    user_unrealized_pnl: 0.75,
  },
  {
    id: -502,
    question: "Will BTC trade above $75,000 before Friday?",
    ticker: "BTC-USD",
    condition: "Intraday high",
    category: "crypto",
    status: "OPEN",
    yes_price: 0.44,
    no_price: 0.56,
    yes_pct: 44,
    no_pct: 56,
    yes_reserve: 252,
    no_reserve: 198,
    liquidity: 450,
    total_volume: 890,
    user_position: [],
    user_exposure: 0,
    user_market_value: 0,
    user_unrealized_pnl: 0,
  },
  {
    id: -503,
    question: "Will NIFTY finish the session green?",
    ticker: "NIFTY",
    condition: "Session close",
    category: "india",
    status: "OPEN",
    yes_price: 0.53,
    no_price: 0.47,
    yes_pct: 53,
    no_pct: 47,
    yes_reserve: 212,
    no_reserve: 238,
    liquidity: 450,
    total_volume: 675,
    user_position: [],
    user_exposure: 0,
    user_market_value: 0,
    user_unrealized_pnl: 0,
  },
]

function normalizePredictMarkets(payload: any, category?: string, status?: string): PredictMarket[] {
  const rows = Array.isArray(payload?.markets) ? payload.markets : Array.isArray(payload) ? payload : []
  const source = rows.length ? rows : demoPredictMarkets
  const filtered = source.filter((market: PredictMarket) => {
    const categoryMatch = !category || market.category === category
    const statusMatch = !status || market.status === status
    return categoryMatch && statusMatch
  })
  return filtered.length ? filtered : demoPredictMarkets.filter((market) => !status || market.status === status)
}

const tourSteps = [
  {
    title: "Choose intelligence for each mode",
    body: "Live trading and backtesting keep separate model selections, saved to SQLite for the signed-in user.",
    icon: BrainCircuit,
  },
  {
    title: "Read the market in one glance",
    body: "The live cockpit pairs the selected ticker with fused confidence, technical votes, ML probabilities, and the active model.",
    icon: Gauge,
  },
  {
    title: "Prove the idea with a replay",
    body: "Backtesting runs the same selected model against historical candles and renders returns, risk, and the equity curve.",
    icon: LineChart,
  },
]

function signalColor(signal?: string) {
  if (!signal) return "text-muted-foreground bg-muted"
  if (signal.includes("BUY")) return "text-market-up bg-market-up/10 border-market-up/25"
  if (signal.includes("SELL")) return "text-market-down bg-market-down/10 border-market-down/25"
  return "text-primary bg-primary/10 border-primary/25"
}

function percent(value = 0) {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

function signedMoney(value = 0) {
  return `${value >= 0 ? "+" : ""}${formatPrice(value)}`
}

function probabilityLabel(value = 0) {
  return `${value.toFixed(1)}%`
}

function previewPredictBuy(market: PredictMarket, state: PredictBuyState): PredictPreview | null {
  const cost = Number.parseFloat(state.cost)
  if (!Number.isFinite(cost) || cost <= 0) return null

  const yesReserve = Number(market.yes_reserve ?? (1 - market.yes_price) * 200)
  const noReserve = Number(market.no_reserve ?? market.yes_price * 200)
  if (yesReserve <= 0 || noReserve <= 0) return null

  const k = yesReserve * noReserve
  const selectedPrice = state.side === "YES" ? market.yes_price : market.no_price
  let nextYesReserve = yesReserve
  let nextNoReserve = noReserve
  let shares = 0

  if (state.side === "YES") {
    nextNoReserve = noReserve + cost
    nextYesReserve = k / nextNoReserve
    shares = yesReserve - nextYesReserve
  } else {
    nextYesReserve = yesReserve + cost
    nextNoReserve = k / nextYesReserve
    shares = noReserve - nextNoReserve
  }

  if (shares <= 0) return null

  const yesPriceAfter = nextNoReserve / (nextYesReserve + nextNoReserve)
  const noPriceAfter = 1 - yesPriceAfter
  const selectedPriceAfter = state.side === "YES" ? yesPriceAfter : noPriceAfter
  const avgPrice = cost / shares

  return {
    shares,
    avgPrice,
    selectedPrice,
    selectedPriceAfter,
    yesPctAfter: yesPriceAfter * 100,
    noPctAfter: noPriceAfter * 100,
    impactPct: (selectedPriceAfter - selectedPrice) * 100,
    slippagePct: (avgPrice - selectedPrice) * 100,
  }
}

function toMarketRows(data: Record<string, any> | undefined): MarketRow[] {
  if (!data) return fallbackMarketRows
  const rows = Object.entries(data).map(([ticker, row]) => ({
    ticker,
    name: row.name || nameByTicker[ticker] || ticker,
    market: row.market,
    exchange: row.exchange,
    currency: row.currency || "USD",
    source: row.source,
    price: Number(row.price || 0),
    change: Number(row.change || 0),
    change_pct: Number(row.change_pct || row.change || 0),
    volume: Number(row.volume || 0),
    signal: row.signal || "N/A",
  }))
  return rows.length ? rows : fallbackMarketRows
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone?: "up" | "down" | "neutral"
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-card/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "up" && "text-market-up",
            tone === "down" && "text-market-down",
            (!tone || tone === "neutral") && "text-primary"
          )}
        />
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function ModelSelector({
  mode,
  models,
  selectedId,
  onChange,
  busy,
}: {
  mode: Mode
  models: TradingModel[]
  selectedId: string
  onChange: (mode: Mode, modelId: string) => void
  busy: boolean
}) {
  const activeModel = models.find((model) => model.id === selectedId) || models[0]
  const label = mode === "live" ? "Live trading model" : "Backtest model"
  const Icon = mode === "live" ? RadioTower : LineChart

  return (
    <div className="rounded-lg border border-white/10 bg-background/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>
      <select
        value={selectedId}
        onChange={(event) => onChange(mode, event.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
      >
        {models
          .filter((model) => model.modes.includes(mode))
          .map((model) => (
            <option key={model.id} value={model.id}>
              {model.short_name || model.name}
            </option>
          ))}
      </select>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{activeModel?.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{activeModel?.risk_profile}</span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{activeModel?.latency}</span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{activeModel?.training_rows || 0} rows</span>
      </div>
    </div>
  )
}

function TourOverlay({
  open,
  step,
  onStep,
  onClose,
}: {
  open: boolean
  step: number
  onStep: (step: number) => void
  onClose: () => void
}) {
  const active = tourSteps[step]
  const Icon = active.icon

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="w-full max-w-xl rounded-lg border border-white/10 bg-background p-6 shadow-ink"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">KingStop tour</p>
                  <h2 className="mt-1 text-xl font-semibold">{active.title}</h2>
                </div>
              </div>
              <button onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close tour">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-muted-foreground leading-7">{active.body}</p>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-2">
                {tourSteps.map((item, index) => (
                  <button
                    key={item.title}
                    onClick={() => onStep(index)}
                    className={cn("h-2 rounded-full transition-all", step === index ? "w-8 bg-primary" : "w-2 bg-muted")}
                    aria-label={`Go to tour step ${index + 1}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Skip
                </Button>
                {step > 0 ? (
                  <Button variant="outline" onClick={() => onStep(step - 1)}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                ) : null}
                <Button onClick={() => (step === tourSteps.length - 1 ? onClose() : onStep(step + 1))}>
                  {step === tourSteps.length - 1 ? "Start trading" : "Next"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default function Dashboard({ sectionId }: { sectionId: DashboardSectionId }) {
  const { user, logout, streakData, setStreakData } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const mainScrollRef = useRef<HTMLElement | null>(null)
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const activeTab: DashTab = sectionId
  const [mode, setMode] = useState<Mode>(() => (queryParams.get("mode") === "backtesting" ? "backtesting" : "live"))
  const [market, setMarket] = useState<MarketKey>(() => {
    const candidate = queryParams.get("market")
    return candidate === "nse" || candidate === "bse" || candidate === "us" ? candidate : "us"
  })
  const [time, setTime] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [searchMessage, setSearchMessage] = useState("")
  const [selectedTicker, setSelectedTicker] = useState(() => queryParams.get("ticker")?.toUpperCase() || "NVDA")
  const [period, setPeriod] = useState("6mo")
  const [models, setModels] = useState<TradingModel[]>(fallbackModels)
  const [preferences, setPreferences] = useState<Preferences>({
    live: "preloaded_ensemble_v1",
    backtesting: "preloaded_ensemble_v1",
  })
  const [marketRows, setMarketRows] = useState<MarketRow[]>(fallbackMarketRows)
  const [signal, setSignal] = useState<SignalResponse | null>(null)
  const [wallet, setWallet] = useState<WalletResponse | null>(null)
  const [backtest, setBacktest] = useState<BacktestResponse | null>(null)
  const [loadingMarket, setLoadingMarket] = useState(true)
  const [loadingSignal, setLoadingSignal] = useState(true)
  const [loadingBacktest, setLoadingBacktest] = useState(true)
  const [savingModel, setSavingModel] = useState<Mode | null>(null)
  const [backtestRunId, setBacktestRunId] = useState(0)
  const [challengeRefreshKey, setChallengeRefreshKey] = useState(0)
  const [streakRefreshKey, setStreakRefreshKey] = useState(0)
  const [firstActionRefreshKey, setFirstActionRefreshKey] = useState(0)
  const [achievementRefreshKey, setAchievementRefreshKey] = useState(0)
  const [error, setError] = useState("")
  const [tourStep, setTourStep] = useState(0)
  const [tourOpen, setTourOpen] = useState(false)
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const firstVisitKey = `kingstop_first_visit_${user?.id ?? "anonymous"}`
  const [showFirstVisitWelcome, setShowFirstVisitWelcome] = useState(
    () => localStorage.getItem(firstVisitKey) !== "complete",
  )

  // Screener
  const [screenerMarket, setScreenerMarket] = useState("us")
  const [screenerSignal, setScreenerSignal] = useState("")
  const [screenerRows, setScreenerRows] = useState<any[]>([])
  const [loadingScreener, setLoadingScreener] = useState(false)

  // News
  const [newsTicker, setNewsTicker] = useState("AAPL")
  const [newsData, setNewsData] = useState<any>(null)
  const [newsFilter, setNewsFilter] = useState("all")
  const [loadingNews, setLoadingNews] = useState(false)
  const activeSectionLabel = dashboardSections.find((section) => section.id === activeTab)?.label || "Dashboard"
  const activeTitleTicker = activeTab === "news" ? newsTicker : activeTab === "overview" || activeTab === "analytics" ? selectedTicker : ""
  const activePageTitle = `${activeTitleTicker ? `${activeTitleTicker} - ` : ""}${activeSectionLabel}`

  useEffect(() => {
    document.title = `${activePageTitle} | KingStop`
  }, [activePageTitle])

  // Crypto
  const [cryptoRows, setCryptoRows] = useState<MarketRow[]>([])
  const [loadingCrypto, setLoadingCrypto] = useState(false)

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [portfolioStats, setPortfolioStats] = useState<any>(null)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)

  // Journal
  const [journalEntries, setJournalEntries] = useState<any[]>([])
  const [journalTicker, setJournalTicker] = useState("")
  const [journalNote, setJournalNote] = useState("")
  const [journalSentiment, setJournalSentiment] = useState("")
  const [loadingJournal, setLoadingJournal] = useState(false)

  // Predict
  const [predictMarkets, setPredictMarkets] = useState<PredictMarket[]>([])
  const [predictCategory, setPredictCategory] = useState("")
  const [predictStatus, setPredictStatus] = useState("OPEN")
  const [loadingPredict, setLoadingPredict] = useState(false)
  const [predictBuying, setPredictBuying] = useState<Record<number, PredictBuyState>>({})
  const [predictSelling, setPredictSelling] = useState<Record<number, Record<number, string>>>({})
  const [predictMsg, setPredictMsg] = useState<Record<number, string>>({})
  const [predictShowCreate, setPredictShowCreate] = useState(false)
  const [creatingPredict, setCreatingPredict] = useState(false)
  const [newPredictMarket, setNewPredictMarket] = useState({
    question: "",
    category: "stocks",
    ticker: "",
    condition: "",
    threshold: "",
    initialProbability: "50",
    liquidity: "200",
  })

  // Subscription
  const [subscription, setSubscription] = useState<any>(null)
  const [buyCashAmount, setBuyCashAmount] = useState("10")
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
  const [loadingAccount, setLoadingAccount] = useState(false)
  const [walletMessage, setWalletMessage] = useState("")
  const [fundingCheckout, setFundingCheckout] = useState(false)
  const [subscriptionCheckout, setSubscriptionCheckout] = useState<string | null>(null)
  const [accountSettings, setAccountSettings] = useState<AccountSettings | null>(null)
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "" })
  const [securityMessage, setSecurityMessage] = useState("")
  const accountPreferenceKey = `kingstop_account_preferences_${user?.id ?? "anonymous"}`
  const [accountPreferences, setAccountPreferences] = useState<AccountPreferences>(() => {
    const saved = localStorage.getItem(accountPreferenceKey)
    if (!saved) return defaultAccountPreferences
    try {
      return { ...defaultAccountPreferences, ...JSON.parse(saved) }
    } catch {
      return defaultAccountPreferences
    }
  })
  const [bonusModalOpen, setBonusModalOpen] = useState(() => {
    const saved = localStorage.getItem("kingstop_bonus_shown")
    if (saved === "true") return false
    const sd = localStorage.getItem("kingstop_streak_data")
    if (sd) {
      try {
        const parsed = JSON.parse(sd)
        return parsed.is_new_day === true && parsed.bonus_claimed_today === false
      } catch { return false }
    }
    return false
  })

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!showFirstVisitWelcome) localStorage.setItem(firstVisitKey, "complete")
  }, [firstVisitKey, showFirstVisitWelcome])

  useEffect(() => {
    const scrollElement = mainScrollRef.current
    if (!scrollElement) return

    const key = `kingstop_dashboard_scroll_${activeTab}`
    const savedScroll = Number(sessionStorage.getItem(key) || 0)
    requestAnimationFrame(() => {
      scrollElement.scrollTop = Number.isFinite(savedScroll) ? savedScroll : 0
    })

    return () => {
      sessionStorage.setItem(key, String(scrollElement.scrollTop))
    }
  }, [activeTab])

  useEffect(() => {
    const saved = localStorage.getItem(accountPreferenceKey)
    if (!saved) {
      setAccountPreferences(defaultAccountPreferences)
      return
    }

    try {
      setAccountPreferences({ ...defaultAccountPreferences, ...JSON.parse(saved) })
    } catch {
      setAccountPreferences(defaultAccountPreferences)
    }
  }, [accountPreferenceKey])

  useEffect(() => {
    localStorage.setItem(accountPreferenceKey, JSON.stringify(accountPreferences))
  }, [accountPreferenceKey, accountPreferences])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      setLoadingMarket(true)
      try {
        const [modelResult, marketResult, walletResult] = await Promise.allSettled([
          getTradingModels(),
          getMarketOverview(market),
          getWallet(),
        ])

        if (cancelled) return

        if (modelResult.status === "fulfilled") {
          setModels(modelResult.value.models || fallbackModels)
          setPreferences({
            live: modelResult.value.preferences?.live || "preloaded_ensemble_v1",
            backtesting: modelResult.value.preferences?.backtesting || "preloaded_ensemble_v1",
          })
        }
        if (marketResult.status === "fulfilled") {
          const rows = toMarketRows(marketResult.value.data)
          setMarketRows(rows)
          if (rows.length && !rows.some((row) => row.ticker === selectedTicker)) {
            setSelectedTicker(rows[0].ticker)
          }
        }
        if (walletResult.status === "fulfilled") {
          setWallet(walletResult.value)
        }
      } catch {
        setError("Some live data is unavailable. KingStop is showing sample market data.")
      } finally {
        if (!cancelled) setLoadingMarket(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [market])

  useEffect(() => {
    let cancelled = false
    async function loadSignal() {
      setLoadingSignal(true)
      try {
        const data = await getSignals(selectedTicker, preferences.live)
        if (!cancelled) setSignal(data)
      } catch {
        if (!cancelled) {
          setSignal({
            model: models.find((model) => model.id === preferences.live),
            fused_signal: { signal: "BUY", confidence: 0.74, score: 0.48, sources: ["technical", "ml"] },
            technical: { signal: "BUY", confidence: 0.7 },
            ml: {
              signal: "BUY",
              confidence: 0.78,
              probabilities: { sell: 0.12, hold: 0.24, buy: 0.64 },
              regime: { regime: "BULLISH", confidence: 0.68 },
            },
          })
        }
      } finally {
        if (!cancelled) setLoadingSignal(false)
      }
    }

    void loadSignal()
    return () => {
      cancelled = true
    }
  }, [selectedTicker, preferences.live, models])

  useEffect(() => {
    let cancelled = false
    async function loadBacktest() {
      setLoadingBacktest(true)
      try {
        const data = await runBacktest(selectedTicker, period, preferences.backtesting)
        if (!cancelled) setBacktest(data)
      } catch {
        if (!cancelled) {
          const values = Array.from({ length: 60 }, (_, index) => ({
            date: `D${index + 1}`,
            value: 100000 + index * 520 + Math.sin(index / 4) * 2200,
          }))
          setBacktest({
            model: models.find((model) => model.id === preferences.backtesting),
            latest_signal: { signal: "BUY", confidence: 0.72 },
            result: {
              total_return: 18.4,
              annualized_return: 28.6,
              sharpe_ratio: 1.84,
              max_drawdown: -6.2,
              win_rate: 61.5,
              total_trades: 13,
              profit_factor: 1.92,
              final_capital: values[values.length - 1].value,
              initial_capital: 100000,
            },
            equity_curve: values,
            data_source: "sample_market_data",
            trades: [],
          })
        }
      } finally {
        if (!cancelled) setLoadingBacktest(false)
      }
    }

    void loadBacktest()
    return () => {
      cancelled = true
    }
  }, [selectedTicker, period, preferences.backtesting, models, backtestRunId])

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toUpperCase()
    if (!query) return marketRows
    return marketRows.filter((row) => row.ticker.includes(query) || row.name.toUpperCase().includes(query))
  }, [marketRows, searchQuery])

  const selectedRow = marketRows.find((row) => row.ticker === selectedTicker) || marketRows[0] || fallbackMarketRows[0]
  const selectedCurrency = selectedRow.currency || "USD"
  const activeMarket = marketOptions.find((item) => item.id === market) || marketOptions[0]
  const liveModel = models.find((model) => model.id === preferences.live) || models[0] || fallbackModels[0]
  const backtestModel = models.find((model) => model.id === preferences.backtesting) || models[0] || fallbackModels[0]
  const portfolioValue = wallet?.wallet?.total_value || 100000
  const cash = wallet?.wallet?.cash || 100000
  const pnl = portfolioValue - (wallet?.dummy_money || 100000)
  const pnlPct = ((pnl / (wallet?.dummy_money || 100000)) * 100)
  const activeSignal = signal?.fused_signal?.signal || selectedRow?.signal || "NEUTRAL"
  const confidence = Number(signal?.fused_signal?.confidence || backtest?.latest_signal?.confidence || 0)
  const capabilityRail = [
    { label: "Auth", value: "JWT + SQLite", icon: ShieldCheck },
    { label: "Market", value: activeMarket.description, icon: Globe2 },
    { label: "Models", value: `${models.length} strategies`, icon: BrainCircuit },
    { label: "Data", value: selectedRow.source === "sample_market_data" ? "Free fallback" : "Yahoo feed", icon: RadioTower },
    { label: "Replay", value: "Backtest engine", icon: LineChart },
  ]

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const setActiveTab = useCallback(
    (tab: DashTab) => {
      if (tab === activeTab) return
      navigate(
        {
          pathname: paths.dashboardSection(tab),
          search: location.search,
          hash: location.hash,
        },
        { preventScrollReset: true }
      )
    },
    [activeTab, location.hash, location.search, navigate]
  )

  const commitTickerSearch = useCallback(() => {
    const query = searchQuery.trim().toUpperCase()
    if (!query) {
      setSearchMessage("")
      return
    }
    const match = marketRows.find((row) => row.ticker === query)
      || marketRows.find((row) => row.ticker.includes(query) || row.name.toUpperCase().includes(query))

    if (!match) {
      setSearchMessage(`No report found for "${query}".`)
      return
    }

    setSelectedTicker(match.ticker)
    setSearchQuery(match.ticker)
    setSearchMessage("")
    setActiveTab("overview")
  }, [marketRows, searchQuery, setActiveTab])

  const handleBonusClaimed = (amount: number) => {
    localStorage.setItem("kingstop_bonus_shown", "true")
    setBonusModalOpen(false)
    const nextStreak = streakData ? { ...streakData, bonus_claimed_today: true, is_new_day: false } : null
    setStreakData(nextStreak)
    if (nextStreak) {
      localStorage.setItem("kingstop_streak_data", JSON.stringify(nextStreak))
    }
    setStreakRefreshKey((value) => value + 1)
    setWallet((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        wallet: prev.wallet ? { ...prev.wallet, cash: (prev.wallet.cash || 0) + amount, total_value: (prev.wallet.total_value || 0) + amount } : prev.wallet,
      }
    })
  }

  const handleChallengeRewardClaimed = (amount: number) => {
    setWallet((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        wallet: prev.wallet ? { ...prev.wallet, cash: (prev.wallet.cash || 0) + amount, total_value: (prev.wallet.total_value || 0) + amount } : prev.wallet,
      }
    })
  }

  const closeBonusModal = () => {
    localStorage.setItem("kingstop_bonus_shown", "true")
    setBonusModalOpen(false)
  }

  const handleModelChange = async (targetMode: Mode, modelId: string) => {
    setSavingModel(targetMode)
    setError("")
    const previous = preferences
    setPreferences((current) => ({ ...current, [targetMode]: modelId }))
    try {
      const data = await updateModelPreference(targetMode, modelId)
      setPreferences({
        live: data.preferences?.live || modelId,
        backtesting: data.preferences?.backtesting || modelId,
      })
    } catch {
      setPreferences(previous)
      setError("Could not save the model preference. Check that the backend is running.")
    } finally {
      setSavingModel(null)
    }
  }

  const refreshMarket = async () => {
    setLoadingMarket(true)
    try {
      const data = await getMarketOverview(market)
      const rows = toMarketRows(data.data)
      setMarketRows(rows)
      if (rows.length && !rows.some((row) => row.ticker === selectedTicker)) {
        setSelectedTicker(rows[0].ticker)
      }
    } catch {
      setError("Market refresh failed. Sample data remains visible.")
    } finally {
      setLoadingMarket(false)
    }
  }

  const handleRunBacktest = async () => {
    setBacktestRunId((value) => value + 1)
    try {
      await Promise.all([progressDailyChallenge("backtest"), recordBacktestRun()])
      setChallengeRefreshKey((value) => value + 1)
      setAchievementRefreshKey((value) => value + 1)
    } catch {
      // Backtesting still runs if challenge tracking is unavailable.
    }
  }

  // Tab data loaders
  useEffect(() => {
    if (activeTab !== "screener") return
    setLoadingScreener(true)
    getScreener(screenerMarket, screenerSignal || undefined)
      .then((d) => setScreenerRows(d.results || []))
      .catch(() => {})
      .finally(() => setLoadingScreener(false))
  }, [activeTab, screenerMarket, screenerSignal])

  useEffect(() => {
    if (activeTab !== "news") return
    setLoadingNews(true)
    getNews(newsTicker)
      .then((data) => setNewsData(data?.news?.length ? data : demoNewsData(newsTicker)))
      .catch(() => setNewsData(demoNewsData(newsTicker)))
      .finally(() => setLoadingNews(false))
  }, [activeTab, newsTicker])

  useEffect(() => {
    if (activeTab !== "crypto") return
    setLoadingCrypto(true)
    getMarketOverview("us") // will use crypto via screener
      .then(() => {})
      .catch(() => {})
    getScreener("crypto")
      .then((d) => {
        const rows: MarketRow[] = (d.results || []).map((r: any) => ({
          ticker: r.ticker,
          name: r.name || r.ticker,
          price: r.price,
          change: 0,
          change_pct: r.change_pct,
          volume: r.volume,
          signal: r.signal,
          currency: r.currency || "USD",
        }))
        setCryptoRows(rows)
      })
      .catch(() => {})
      .finally(() => setLoadingCrypto(false))
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== "leaderboard") return
    setLoadingLeaderboard(true)
    getLeaderboard()
      .then((d) => setLeaderboard(d.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoadingLeaderboard(false))
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== "journal") return
    setLoadingJournal(true)
    getJournalEntries()
      .then((data) => setJournalEntries(data?.entries?.length ? data.entries : demoJournalEntries))
      .catch(() => setJournalEntries(demoJournalEntries))
      .finally(() => setLoadingJournal(false))
  }, [activeTab])

  const handleAddJournalEntry = async () => {
    if (!journalTicker || !journalNote) return
    const localEntry = {
      id: Date.now(),
      ticker: journalTicker.toUpperCase(),
      note: journalNote,
      sentiment: journalSentiment || undefined,
      pnl: null,
      created_at: new Date().toISOString(),
    }
    try {
      await createJournalEntry({ ticker: journalTicker, note: journalNote, sentiment: journalSentiment || undefined })
      const data = await getJournalEntries()
      setJournalEntries(data?.entries?.length ? data.entries : [localEntry, ...demoJournalEntries])
    } catch {
      setJournalEntries((current) => [localEntry, ...current])
    }
    setJournalNote("")
    setJournalTicker("")
    setJournalSentiment("")
  }

  const handleDeleteJournalEntry = async (id: number) => {
    if (id > 0) await deleteJournalEntry(id).catch(() => undefined)
    setJournalEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const refreshPredictMarkets = useCallback(async () => {
    try {
      const data = await getPredictMarkets(predictCategory || undefined, predictStatus || undefined)
      setPredictMarkets(normalizePredictMarkets(data, predictCategory || undefined, predictStatus || undefined))
    } catch {
      setPredictMarkets(normalizePredictMarkets(null, predictCategory || undefined, predictStatus || undefined))
    }
  }, [predictCategory, predictStatus])

  const refreshWallet = async () => {
    try {
      const data = await getWallet()
      setWallet(data)
    } catch {
      // Wallet cards keep their last known value if the API is temporarily unavailable.
    }
  }

  const refreshAccountData = useCallback(async () => {
    setLoadingAccount(true)
    try {
      const [subscriptionResult, historyResult, walletResult, accountResult] = await Promise.allSettled([
        getSubscription(),
        getPaymentHistory(),
        getWallet(),
        getAccountSettings(),
      ])

      if (subscriptionResult.status === "fulfilled") setSubscription(subscriptionResult.value)
      if (historyResult.status === "fulfilled") setPaymentHistory(historyResult.value.payments || [])
      if (walletResult.status === "fulfilled") setWallet(walletResult.value)
      if (accountResult.status === "fulfilled") {
        setAccountSettings(accountResult.value)
        if (accountResult.value.preferences) {
          setAccountPreferences({ ...defaultAccountPreferences, ...accountResult.value.preferences })
        }
      }
    } finally {
      setLoadingAccount(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab !== "wallet" && activeTab !== "settings") return
    void refreshAccountData()
  }, [activeTab, refreshAccountData])

  const handleBuyCash = async () => {
    const amount = Number.parseFloat(buyCashAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setWalletMessage("Enter a valid funding amount.")
      return
    }

    setFundingCheckout(true)
    setWalletMessage("")
    try {
      const data = await buyCash(amount)
      if (data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      setWalletMessage("Checkout could not be created.")
    } catch (e: any) {
      setWalletMessage(e?.response?.data?.detail || "Funding is unavailable. Confirm Stripe test env vars are configured.")
    } finally {
      setFundingCheckout(false)
    }
  }

  const handleSubscribe = async (tier: "PRO" | "PREMIUM") => {
    setSubscriptionCheckout(tier)
    setWalletMessage("")
    try {
      const data = await subscribe(tier, "monthly")
      if (data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      setWalletMessage("Subscription checkout could not be created.")
    } catch (e: any) {
      setWalletMessage(e?.response?.data?.detail || "Subscription checkout is unavailable. Confirm Stripe test env vars are configured.")
    } finally {
      setSubscriptionCheckout(null)
    }
  }

  const handleCancelSubscription = async () => {
    setWalletMessage("")
    try {
      const data = await cancelSubscription()
      setWalletMessage(data.message || "Subscription cancellation scheduled.")
      await refreshAccountData()
    } catch (e: any) {
      setWalletMessage(e?.response?.data?.detail || "No active subscription to cancel.")
    }
  }

  const updateAccountPreference = async (key: keyof AccountPreferences, value: boolean) => {
    setAccountPreferences((current) => ({ ...current, [key]: value }))
    try {
      const data = await updateAccountPreferences({ [key]: value })
      setAccountPreferences({ ...defaultAccountPreferences, ...data.preferences })
    } catch (e: any) {
      setWalletMessage(e?.response?.data?.detail || "Preference update failed.")
    }
  }

  const updateAccountLimit = async (key: "dailyFundingLimit" | "exposureLimit", value: string) => {
    const parsed = value.trim() ? Number(value) : null
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      setWalletMessage("Limits must be positive numbers.")
      return
    }

    setAccountPreferences((current) => ({ ...current, [key]: parsed }))
    try {
      const data = await updateAccountPreferences({ [key]: parsed })
      setAccountPreferences({ ...defaultAccountPreferences, ...data.preferences })
      setWalletMessage("Responsible-use limit saved.")
    } catch (e: any) {
      setWalletMessage(e?.response?.data?.detail || "Limit update failed.")
    }
  }

  const handlePasswordChange = async () => {
    setSecurityMessage("")
    try {
      const data = await changePassword(passwordForm.current, passwordForm.next)
      setSecurityMessage(data.message || "Password updated.")
      setPasswordForm({ current: "", next: "" })
    } catch (e: any) {
      setSecurityMessage(e?.response?.data?.detail || "Password update failed.")
    }
  }

  // Predict loaders
  useEffect(() => {
    if (activeTab !== "predict") return
    setLoadingPredict(true)
    refreshPredictMarkets()
      .catch(() => {})
      .finally(() => setLoadingPredict(false))
  }, [activeTab, refreshPredictMarkets])

  const handleBuyPredict = async (marketId: number) => {
    const state = predictBuying[marketId] || { cost: "10", side: "YES" as const }
    const market = predictMarkets.find((m) => m.id === marketId)
    const preview = market ? previewPredictBuy(market, state) : null
    const cost = parseFloat(state.cost)
    if (!cost || cost <= 0) return
    if (marketId < 0 && market && preview) {
      setPredictMarkets((current) => current.map((item) => {
        if (item.id !== marketId) return item
        const position: PredictPosition = {
          id: Date.now(),
          side: state.side,
          shares: Number(preview.shares.toFixed(4)),
          avg_price: Number(preview.avgPrice.toFixed(4)),
          current_price: Number(preview.selectedPriceAfter.toFixed(4)),
          cost_basis: cost,
          market_value: cost,
          unrealized_pnl: 0,
          payout_if_wins: Number(preview.shares.toFixed(4)),
        }
        const positions = [position, ...(item.user_position || [])]
        const exposure = (item.user_exposure || 0) + cost
        return {
          ...item,
          yes_price: preview.yesPctAfter / 100,
          no_price: preview.noPctAfter / 100,
          yes_pct: Number(preview.yesPctAfter.toFixed(1)),
          no_pct: Number(preview.noPctAfter.toFixed(1)),
          total_volume: Number((item.total_volume + cost).toFixed(2)),
          user_position: positions,
          user_exposure: exposure,
          user_market_value: (item.user_market_value || 0) + cost,
          user_unrealized_pnl: item.user_unrealized_pnl || 0,
        }
      }))
      setFirstActionRefreshKey((value) => value + 1)
      setPredictMsg((current) => ({
        ...current,
        [marketId]: `Bought ${preview.shares.toFixed(4)} ${state.side} demo shares @ $${preview.avgPrice.toFixed(4)}.`,
      }))
      return
    }
    try {
      const quote = await getPredictMarketQuote(marketId, state.side, cost).catch(() => null)
      const res = await buyPredictShares(marketId, state.side, cost)
      setFirstActionRefreshKey((value) => value + 1)
      const impact = res.price_impact_pct ?? quote?.quote?.price_impact_pct ?? preview?.impactPct ?? 0
      setPredictMsg((p) => ({
        ...p,
        [marketId]: `Bought ${res.shares} ${state.side} shares @ $${res.price_per_share}. Price moved ${impact >= 0 ? "+" : ""}${impact.toFixed(2)} pts.`,
      }))
      await Promise.all([refreshPredictMarkets(), refreshWallet()])
    } catch (e: any) {
      setPredictMsg((p) => ({ ...p, [marketId]: `Error: ${e?.response?.data?.detail || "Trade failed"}` }))
    }
  }

  const handleSellPredict = async (marketId: number, position: PredictPosition) => {
    const requestedShares = parseFloat(predictSelling[marketId]?.[position.id] || String(position.shares))
    if (!requestedShares || requestedShares <= 0) return
    const shares = Math.min(requestedShares, position.shares)
    if (marketId < 0 || position.id < 0) {
      const ratio = shares / position.shares
      const proceeds = position.market_value * ratio
      setPredictMarkets((current) => current.map((market) => {
        if (market.id !== marketId) return market
        const nextPositions = (market.user_position || [])
          .map((item) => item.id === position.id ? {
            ...item,
            shares: Number((item.shares - shares).toFixed(4)),
            cost_basis: Number((item.cost_basis * (1 - ratio)).toFixed(2)),
            market_value: Number((item.market_value * (1 - ratio)).toFixed(2)),
          } : item)
          .filter((item) => item.shares > 0)
        return {
          ...market,
          user_position: nextPositions,
          user_exposure: Math.max(0, (market.user_exposure || 0) - proceeds),
          user_market_value: Math.max(0, (market.user_market_value || 0) - proceeds),
        }
      }))
      setPredictMsg((current) => ({ ...current, [marketId]: `Sold ${shares.toFixed(4)} demo ${position.side} shares for ${formatPrice(proceeds)}.` }))
      return
    }
    try {
      const res = await sellPredictShares(marketId, position.id, shares)
      setPredictMsg((p) => ({
        ...p,
        [marketId]: `Sold ${shares.toFixed(4)} ${position.side} shares for ${formatPrice(res.proceeds)} after spread.`,
      }))
      await Promise.all([refreshPredictMarkets(), refreshWallet()])
    } catch (e: any) {
      setPredictMsg((p) => ({ ...p, [marketId]: e?.response?.data?.detail || "Sell failed" }))
    }
  }

  const handleResolve = async (marketId: number, outcome: "YES" | "NO") => {
    if (marketId < 0) {
      setPredictMarkets((current) => current.map((market) => (
        market.id === marketId ? { ...market, status: outcome === "YES" ? "RESOLVED_YES" : "RESOLVED_NO", resolved_at: new Date().toISOString() } : market
      )))
      setPredictMsg((current) => ({ ...current, [marketId]: `Resolved demo market ${outcome}.` }))
      return
    }
    try {
      const res = await resolveMarket(marketId, outcome)
      setPredictMsg((p) => ({ ...p, [marketId]: `Resolved ${outcome}. ${formatPrice(res.total_payout)} paid out.` }))
      await Promise.all([refreshPredictMarkets(), refreshWallet()])
    } catch (e: any) {
      setPredictMsg((p) => ({ ...p, [marketId]: `Error: ${e?.response?.data?.detail || "Resolve failed"}` }))
    }
  }

  const handleCreatePredictMarket = async () => {
    const probability = parseFloat(newPredictMarket.initialProbability)
    const liquidity = parseFloat(newPredictMarket.liquidity)
    if (!newPredictMarket.question.trim() || !probability || !liquidity) return

    setCreatingPredict(true)
    try {
      const threshold = newPredictMarket.threshold.trim() ? Number(newPredictMarket.threshold) : undefined
      const created = await createPredictMarket({
        question: newPredictMarket.question.trim(),
        category: newPredictMarket.category,
        ticker: newPredictMarket.ticker.trim() || undefined,
        condition: newPredictMarket.condition.trim() || undefined,
        threshold: Number.isFinite(threshold) ? threshold : undefined,
        initial_probability: Math.max(5, Math.min(95, probability)) / 100,
        liquidity: Math.max(50, liquidity),
      })
      setPredictMsg((p) => ({ ...p, [created.market.id]: "Market created and opened for trading." }))
      setNewPredictMarket({
        question: "",
        category: "stocks",
        ticker: "",
        condition: "",
        threshold: "",
        initialProbability: "50",
        liquidity: "200",
      })
      setPredictShowCreate(false)
      setPredictStatus("OPEN")
      const data = await getPredictMarkets(predictCategory || undefined, "OPEN")
      setPredictMarkets(normalizePredictMarkets(data, predictCategory || undefined, "OPEN"))
    } catch (e: any) {
      const localMarket: PredictMarket = {
        id: Date.now(),
        question: newPredictMarket.question.trim(),
        category: newPredictMarket.category,
        ticker: newPredictMarket.ticker.trim() || undefined,
        condition: newPredictMarket.condition.trim() || undefined,
        threshold: newPredictMarket.threshold.trim() ? Number(newPredictMarket.threshold) : undefined,
        status: "OPEN",
        yes_price: Math.max(5, Math.min(95, probability)) / 100,
        no_price: 1 - Math.max(5, Math.min(95, probability)) / 100,
        yes_pct: Math.max(5, Math.min(95, probability)),
        no_pct: 100 - Math.max(5, Math.min(95, probability)),
        yes_reserve: Math.max(50, liquidity) * (1 - Math.max(5, Math.min(95, probability)) / 100),
        no_reserve: Math.max(50, liquidity) * (Math.max(5, Math.min(95, probability)) / 100),
        liquidity: Math.max(50, liquidity),
        total_volume: 0,
        user_position: [],
        user_exposure: 0,
        user_market_value: 0,
        user_unrealized_pnl: 0,
      }
      setPredictMarkets((current) => [localMarket, ...current])
      setPredictMsg((p) => ({ ...p, [localMarket.id]: e?.response?.data?.detail ? `Saved locally: ${e.response.data.detail}` : "Demo market created locally." }))
      setNewPredictMarket({
        question: "",
        category: "stocks",
        ticker: "",
        condition: "",
        threshold: "",
        initialProbability: "50",
        liquidity: "200",
      })
      setPredictShowCreate(false)
      setPredictStatus("OPEN")
    } finally {
      setCreatingPredict(false)
    }
  }

  const predictOpenCount = predictMarkets.filter((m) => m.status === "OPEN").length
  const predictUserExposure = predictMarkets.reduce((sum, m) => sum + (m.user_exposure || 0), 0)
  const predictUserValue = predictMarkets.reduce((sum, m) => sum + (m.user_market_value || 0), 0)
  const predictUserPnl = predictMarkets.reduce((sum, m) => sum + (m.user_unrealized_pnl || 0), 0)
  const feedItems = [
    {
      title: wallet?.wallet?.positions?.length ? "Open positions need a review" : "No open positions yet",
      body: wallet?.wallet?.positions?.length
        ? `${wallet.wallet.positions.length} paper positions are open. Review exposure before adding risk.`
        : "Create a paper portfolio trade to start tracking win-rate and decision quality.",
      action: "Portfolio",
      target: "portfolio" as DashTab,
      icon: Wallet,
    },
    {
      title: predictUserExposure > 0 ? "Prediction exposure is active" : "Try one prediction",
      body: predictUserExposure > 0
        ? `${formatPrice(predictUserExposure)} is currently exposed across prediction markets.`
        : "Preview YES/NO price impact with paper money before committing more.",
      action: "Predict",
      target: "predict" as DashTab,
      icon: TrendingUpIcon,
    },
    {
      title: "Market mover to watch",
      body: `${marketRows[0]?.ticker || selectedTicker} is the current top row in ${activeMarket.description}.`,
      action: "News",
      target: "news" as DashTab,
      icon: Newspaper,
    },
  ]

  return (
    <>
      <AnimatePresence>
        {showFirstVisitWelcome ? (
          <FirstVisitWelcome onComplete={() => setShowFirstVisitWelcome(false)} />
        ) : null}
      </AnimatePresence>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <OnboardingWizard
        userId={user?.id}
        open={tourOpen}
        activeSection={activeTab}
        onOpenChange={setTourOpen}
        onNavigate={setActiveTab}
        onComplete={() => setTourOpen(false)}
      />
      <CommandPalette
        enabled={accountPreferences.keyboardShortcutsEnabled}
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={setActiveTab}
      />
      <DashboardNavigation
        activeSection={activeTab}
        mobileOpen={mobileNavigationOpen}
        onMobileOpenChange={setMobileNavigationOpen}
        onNavigate={setActiveTab}
        onOpenTour={() => setTourOpen(true)}
        onOpenDocs={() => navigate(paths.docs)}
        onLogout={handleLogout}
      />

      {/* RIGHT PANEL */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-background/85 px-2 py-2 backdrop-blur-md sm:px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={() => setMobileNavigationOpen(true)}
            title="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1 sm:flex-none sm:min-w-36 sm:max-w-48">
            <h1 className="truncate text-sm font-semibold leading-tight">{activePageTitle}</h1>
          </div>
          <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
            {(["live", "backtesting"] as Mode[]).map((item) => (
              <button
                key={item}
                onClick={() => setMode(item)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all",
                  mode === item ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item === "live" ? "Live" : "Backtest"}
              </button>
            ))}
          </div>
          <div className="hidden grid-cols-3 rounded-lg bg-muted p-1 sm:grid" aria-label="Market">
            {marketOptions.map((item) => (
              <button
                key={item.id}
                onClick={() => setMarket(item.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  market === item.id ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                )}
                title={item.description}
              >
                {item.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              commitTickerSearch()
            }}
            className="relative hidden min-w-36 flex-1 max-w-52 md:block"
          >
            <button
              type="submit"
              className="absolute left-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Search ticker"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setSearchMessage("")
              }}
              placeholder="Search ticker"
              className="h-8 w-full rounded-md border border-input bg-background pl-9 pr-9 text-xs outline-none ring-offset-background focus:ring-2 focus:ring-ring"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setSearchMessage("")
                }}
                className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
                title="Clear ticker search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {searchMessage ? (
              <div className="absolute left-0 top-9 z-40 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-xs text-muted-foreground shadow-ink">
                {searchMessage}
              </div>
            ) : null}
          </form>
          <NavbarStreak
            fallback={streakData}
            refreshKey={streakRefreshKey}
            onBonusClaimed={handleBonusClaimed}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Account menu">
                <UserCircle className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block truncate">{user?.name || "Trader"}</span>
                <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setActiveTab("settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(paths.docs)}>
                <BookOpen className="mr-2 h-4 w-4" />
                Docs
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground xl:flex">
            <Clock className="h-3.5 w-3.5" />
            {time.toLocaleTimeString("en-US", { hour12: false })}
          </div>
        </header>

        <main ref={mainScrollRef} className="flex-1 overflow-y-auto">
        <div className="space-y-5 px-3 py-4 sm:px-6 sm:py-5">
        {activeTab === "chat" && <LlmChatPanel />}

        {activeTab === "overview" && (
          <>
        <FirstActionCard refreshKey={firstActionRefreshKey} onNavigate={setActiveTab} />

        <section className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
          <Card className="h-full border-white/10 bg-card/70">
            <CardContent className="flex h-full flex-col justify-between p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm text-primary">
                      <ShieldCheck className="h-4 w-4" />
                      {user?.name || "Trader"} workspace
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-muted px-3 py-1 text-sm text-muted-foreground">
                      <Globe2 className="h-4 w-4" />
                      {activeMarket.description}
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {selectedTicker} is under {activeSignal.replace("_", " ").toLowerCase()} watch.
                  </h1>
                  <p className="mt-3 max-w-3xl text-muted-foreground">
                    Live uses {liveModel.short_name}; backtesting uses {backtestModel.short_name}. Change either model in the intelligence panel.
                  </p>
                </div>
                <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[360px] lg:shrink-0">
                  <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-background/60 p-4">
                    <p className="text-sm text-muted-foreground">Selected ticker</p>
                    <p className="mt-2 break-words text-2xl font-bold leading-tight sm:text-3xl">{selectedTicker}</p>
                    <p className={cn("mt-1 font-mono text-sm", selectedRow.change_pct >= 0 ? "text-market-up" : "text-market-down")}>
                      {percent(selectedRow.change_pct)}
                    </p>
                  </div>
                  <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-background/60 p-4">
                    <p className="text-sm text-muted-foreground">Model confidence</p>
                    <p className="mt-2 text-3xl font-bold leading-tight">{Math.round(confidence * 100)}%</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{mode === "live" ? liveModel.short_name : backtestModel.short_name}</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-2 xl:grid-cols-5">
                {capabilityRail.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="truncate text-sm font-semibold">{item.value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <StatTile icon={Wallet} label="Paper value" value={formatPrice(portfolioValue)} tone={pnl >= 0 ? "up" : "down"} />
            <StatTile icon={Activity} label="Cash available" value={formatPrice(cash)} />
            <StatTile icon={pnl >= 0 ? TrendingUp : TrendingDown} label="Paper P&L" value={percent(pnlPct)} tone={pnl >= 0 ? "up" : "down"} />
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <BonusModal open={bonusModalOpen} onClose={closeBonusModal} streakDay={streakData?.current_streak || 1} onBonusClaimed={handleBonusClaimed} />

        <section className="grid items-start gap-5 xl:grid-cols-3">
          <DailyChallengesPanel refreshKey={challengeRefreshKey} onRewardClaimed={handleChallengeRewardClaimed} />
          <AchievementsPanel refreshKey={achievementRefreshKey} />
          <WatchlistPanel onSelectTicker={setSelectedTicker} />
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {feedItems.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.title} className="border-white/10 bg-card/70">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setActiveTab(item.target)}>
                      {item.action}
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            {mode === "live" ? (
              <>
                <Card className="border-white/10 bg-card/70">
                  <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Live market cockpit
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={refreshMarket} disabled={loadingMarket}>
                        <RefreshCw className={cn("mr-2 h-4 w-4", loadingMarket && "animate-spin")} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-y border-white/10 text-xs text-muted-foreground">
                            <th className="px-4 py-3 text-left font-medium">Ticker</th>
                            <th className="px-4 py-3 text-left font-medium">Name</th>
                            <th className="px-4 py-3 text-right font-medium">Price</th>
                            <th className="px-4 py-3 text-right font-medium">Change</th>
                            <th className="hidden px-4 py-3 text-right font-medium md:table-cell">Volume</th>
                            <th className="px-4 py-3 text-right font-medium">Signal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.length ? filteredRows.map((row, index) => {
                            const isUp = row.change_pct >= 0
                            return (
                              <motion.tr
                                key={row.ticker}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.025 }}
                                onClick={() => setSelectedTicker(row.ticker)}
                                className={cn(
                                  "cursor-pointer border-b border-white/10 transition-colors hover:bg-muted/30",
                                  selectedTicker === row.ticker && "bg-primary/10"
                                )}
                              >
                                <td className="px-4 py-3 font-semibold">{row.ticker}</td>
                                <td className="px-4 py-3 text-muted-foreground">{row.name}</td>
                                <td className="px-4 py-3 text-right font-mono">{formatPrice(row.price, row.currency || selectedCurrency)}</td>
                                <td className={cn("px-4 py-3 text-right font-mono", isUp ? "text-market-up" : "text-market-down")}>
                                  <span className="inline-flex items-center gap-1">
                                    {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {percent(row.change_pct)}
                                  </span>
                                </td>
                                <td className="hidden px-4 py-3 text-right font-mono text-muted-foreground md:table-cell">{formatVolume(row.volume)}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs", signalColor(row.signal))}>
                                    {row.signal}
                                  </span>
                                </td>
                              </motion.tr>
                            )
                          }) : (
                            <tr>
                              <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                                No report found for "{searchQuery}".
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-card/70">
                  <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Zap className="h-4 w-4 text-primary" />
                      Fused signal for {selectedTicker}
                    </CardTitle>
                    {loadingSignal ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
                    <div className="rounded-lg border border-white/10 bg-background/60 p-5">
                      <span className={cn("inline-flex rounded-full border px-3 py-1 text-sm font-medium", signalColor(activeSignal))}>
                        {activeSignal.replace("_", " ")}
                      </span>
                      <p className="mt-5 text-5xl font-bold">{Math.round((signal?.fused_signal?.confidence || 0) * 100)}%</p>
                      <p className="mt-2 text-sm text-muted-foreground">Fused confidence from {signal?.model?.short_name || liveModel.short_name}</p>
                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((signal?.fused_signal?.confidence || 0) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-white/10 bg-background/60 p-4">
                        <p className="text-sm text-muted-foreground">Technical</p>
                        <p className="mt-2 font-semibold">{signal?.technical?.signal || "NEUTRAL"}</p>
                        <p className="mt-1 font-mono text-sm text-primary">{Math.round((signal?.technical?.confidence || 0) * 100)}%</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-background/60 p-4">
                        <p className="text-sm text-muted-foreground">ML vote</p>
                        <p className="mt-2 font-semibold">{signal?.ml?.signal || "NEUTRAL"}</p>
                        <p className="mt-1 font-mono text-sm text-primary">{Math.round((signal?.ml?.confidence || 0) * 100)}%</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-background/60 p-4">
                        <p className="text-sm text-muted-foreground">Regime</p>
                        <p className="mt-2 font-semibold">{signal?.ml?.regime?.regime || "TRACKING"}</p>
                        <p className="mt-1 font-mono text-sm text-primary">{Math.round((signal?.ml?.regime?.confidence || 0) * 100)}%</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-background/60 p-4 sm:col-span-3">
                        <p className="mb-3 text-sm text-muted-foreground">ML probabilities</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {[
                            ["Sell", signal?.ml?.probabilities?.sell || 0],
                            ["Hold", signal?.ml?.probabilities?.hold || 0],
                            ["Buy", signal?.ml?.probabilities?.buy || 0],
                          ].map(([label, value]) => (
                            <div key={String(label)}>
                              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                                <span>{label}</span>
                                <span>{Math.round(Number(value) * 100)}%</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(Number(value) * 100)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-white/10 bg-card/70">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LineChart className="h-4 w-4 text-primary" />
                    Backtest replay
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <select
                      value={period}
                      onChange={(event) => setPeriod(event.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      {["1mo", "3mo", "6mo", "1y", "2y"].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" onClick={handleRunBacktest} disabled={loadingBacktest}>
                      <Play className="mr-2 h-4 w-4" />
                      Run
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {backtest?.warning ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                      {backtest.warning}
                    </div>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Return", `${backtest?.result?.total_return ?? 0}%`, (backtest?.result?.total_return || 0) >= 0 ? "up" : "down"],
                      ["Sharpe", String(backtest?.result?.sharpe_ratio ?? "0.00"), "neutral"],
                      ["Max DD", `${backtest?.result?.max_drawdown ?? 0}%`, "down"],
                      ["Win rate", `${backtest?.result?.win_rate ?? 0}%`, "up"],
                    ].map(([label, value, tone]) => (
                      <div key={label} className="rounded-lg border border-white/10 bg-background/60 p-4">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className={cn("mt-2 text-2xl font-semibold", tone === "up" && "text-market-up", tone === "down" && "text-market-down")}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="h-[320px] rounded-lg border border-white/10 bg-background/60 p-4">
                    {loadingBacktest ? (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Running replay...
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={backtest?.equity_curve || []}>
                          <defs>
                            <linearGradient id="equity" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#28d17c" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#28d17c" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                          <XAxis dataKey="date" hide />
                          <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} stroke="rgba(255,255,255,0.45)" width={56} />
                          <RechartsTooltip
                            formatter={(value) => [formatPrice(Number(value), selectedCurrency), "Equity"]}
                            contentStyle={{ background: "#0b0f14", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }}
                          />
                          <Area type="monotone" dataKey="value" stroke="#28d17c" strokeWidth={2} fill="url(#equity)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-background/60 p-4">
                      <p className="text-sm text-muted-foreground">Final capital</p>
                      <p className="mt-2 font-mono text-lg">{formatPrice(backtest?.result?.final_capital || 0, selectedCurrency)}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-background/60 p-4">
                      <p className="text-sm text-muted-foreground">Trades</p>
                      <p className="mt-2 font-mono text-lg">{backtest?.result?.total_trades || 0}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-background/60 p-4">
                      <p className="text-sm text-muted-foreground">Data source</p>
                      <p className="mt-2 truncate font-mono text-sm">{backtest?.data_source || "sample_market_data"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <aside className="space-y-5">
            <Card className="border-white/10 bg-card/70">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                  Intelligence stack
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ModelSelector
                  mode="live"
                  models={models}
                  selectedId={preferences.live}
                  onChange={handleModelChange}
                  busy={savingModel === "live"}
                />
                <ModelSelector
                  mode="backtesting"
                  models={models}
                  selectedId={preferences.backtesting}
                  onChange={handleModelChange}
                  busy={savingModel === "backtesting"}
                />
              </CardContent>
            </Card>

          </aside>
        </section>
          </>
        )}

        {/* SCREENER TAB */}
        {activeTab === "screener" && (
          <div className="space-y-4">
            <Card className="border-white/10 bg-card/70">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4 text-primary" />
                  Stock Screener
                </CardTitle>
                <div className="flex gap-2">
                  <select
                    value={screenerMarket}
                    onChange={(e) => setScreenerMarket(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {["us", "nse", "bse", "crypto"].map((m) => (
                      <option key={m} value={m}>{m.toUpperCase()}</option>
                    ))}
                  </select>
                  <select
                    value={screenerSignal}
                    onChange={(e) => setScreenerSignal(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">All signals</option>
                    {["BUY", "STRONG_BUY", "SELL", "STRONG_SELL", "NEUTRAL"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {loadingScreener && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground self-center" />}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-white/10 text-xs text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">Ticker</th>
                        <th className="px-4 py-3 text-left font-medium">Name</th>
                        <th className="px-4 py-3 text-right font-medium">Price</th>
                        <th className="px-4 py-3 text-right font-medium">Change %</th>
                        <th className="px-4 py-3 text-right font-medium">Volume</th>
                        <th className="px-4 py-3 text-right font-medium">Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {screenerRows.map((row, i) => (
                        <tr key={row.ticker} className="border-b border-white/10 hover:bg-muted/30 cursor-pointer" onClick={() => { setSelectedTicker(row.ticker); setActiveTab("overview") }}>
                          <td className="px-4 py-3 font-semibold">{row.ticker}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.name}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatPrice(row.price, row.currency)}</td>
                          <td className={cn("px-4 py-3 text-right font-mono", row.change_pct >= 0 ? "text-market-up" : "text-market-down")}>
                            {percent(row.change_pct)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatVolume(row.volume)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs", signalColor(row.signal))}>{row.signal}</span>
                          </td>
                        </tr>
                      ))}
                      {!screenerRows.length && !loadingScreener && (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center">
                            <div className="mx-auto max-w-md space-y-3">
                              <p className="font-medium">No matches for this screen.</p>
                              <p className="text-sm text-muted-foreground">Clear the signal filter or switch markets to discover a first ticker to watch.</p>
                              <Button size="sm" variant="outline" onClick={() => setScreenerSignal("")}>
                                Clear filter
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* NEWS & SENTIMENT TAB */}
        {activeTab === "news" && (
  <div className="space-y-4">
    <Card className="border-white/10 bg-card/70">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Newspaper className="h-4 w-4 text-primary" />
          News & Sentiment
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={newsTicker}
            onChange={(e) => setNewsTicker(e.target.value.toUpperCase())}
            placeholder="Ticker e.g. AAPL"
            className="h-9 w-32 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {/* Sentiment filter buttons */}
          {["all", "positive", "negative", "neutral"].map((f) => (
            <button
              key={f}
              onClick={() => setNewsFilter(f)}
              className={cn(
                "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
                newsFilter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-white/10 text-muted-foreground hover:text-foreground"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          {loadingNews && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent>
        {newsData && (
          <>
            {/* Sentiment bar */}
            <div className="mb-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden flex">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${Math.round((newsData.sentiment_summary?.positive || 0) / Math.max(newsData.news?.length || 1, 1) * 100)}%` }}
                  />
                  <div
                    className="h-full bg-red-500 transition-all"
                    style={{ width: `${Math.round((newsData.sentiment_summary?.negative || 0) / Math.max(newsData.news?.length || 1, 1) * 100)}%` }}
                  />
                </div>
                <span className={cn(
                  "text-sm font-semibold flex items-center gap-1",
                  newsData.sentiment_summary?.overall === "positive" ? "text-green-400" :
                  newsData.sentiment_summary?.overall === "negative" ? "text-red-400" : "text-muted-foreground"
                )}>
                  {newsData.sentiment_summary?.overall?.toUpperCase()}
                  {newsData.sentiment_summary?.trend === "improving" ? " ↑" :
                   newsData.sentiment_summary?.trend === "worsening" ? " ↓" : " →"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Score: {newsData.sentiment_summary?.score > 0 ? "+" : ""}{newsData.sentiment_summary?.score}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="text-green-400">● {newsData.sentiment_summary?.positive} positive</span>
                <span className="text-red-400">● {newsData.sentiment_summary?.negative} negative</span>
                <span>● {newsData.sentiment_summary?.neutral} neutral</span>
                <span className={cn(
                  newsData.sentiment_summary?.trend === "improving" ? "text-green-400" :
                  newsData.sentiment_summary?.trend === "worsening" ? "text-red-400" : ""
                )}>
                  Trend: {newsData.sentiment_summary?.trend}
                </span>
              </div>
            </div>

            {/* News cards */}
            <div className="space-y-2">
              {(newsData.news || [])
                .filter((item: any) => newsFilter === "all" || item.sentiment === newsFilter)
                .map((item: any, i: number) => {
                  const ago = (() => {
                    try {
                      const ms = Date.now() - new Date(item.published_at).getTime()
                      const h = Math.floor(ms / 3600000)
                      const m = Math.floor((ms % 3600000) / 60000)
                      return h > 24 ? `${Math.floor(h/24)}d ago` : h > 0 ? `${h}h ago` : `${m}m ago`
                    } catch { return item.published_at }
                  })()
                  return (
                    <a
                      key={i}
                      href={item.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex gap-3 rounded-lg border bg-background/60 p-3 hover:bg-muted/30 transition-colors",
                        item.sentiment === "positive" ? "border-l-2 border-l-green-500 border-white/10" :
                        item.sentiment === "negative" ? "border-l-2 border-l-red-500 border-white/10" :
                        "border-white/10"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-snug">{item.title}</p>
                        {item.summary && <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{item.summary}</p>}
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                          {item.provider && <span>{item.provider}</span>}
                          <span>{ago}</span>
                          {item.confidence > 0 && (
                            <span className="text-xs opacity-60">confidence {Math.round(item.confidence * 100)}%</span>
                          )}
                        </div>
                      </div>
                      <span className={cn(
                        "shrink-0 self-start mt-0.5 rounded-full border px-2 py-0.5 text-xs",
                        item.sentiment === "positive" ? "text-green-400 bg-green-500/10 border-green-500/25" :
                        item.sentiment === "negative" ? "text-red-400 bg-red-500/10 border-red-500/25" :
                        "text-muted-foreground bg-muted"
                      )}>
                        {item.sentiment}
                      </span>
                    </a>
                  )
                })}
              {!newsData.news?.length && (
                <div className="py-10 text-center">
                  <p className="font-medium">No news found for {newsTicker}.</p>
                  <p className="mt-2 text-sm text-muted-foreground">Try a more liquid ticker or use the screener to pick an active market.</p>
                  <Button className="mt-4" size="sm" variant="outline" onClick={() => setActiveTab("screener")}>
                    Open screener
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
        {!newsData && !loadingNews ? (
          <div className="py-10 text-center">
            <p className="font-medium">Search a ticker to start your news scan.</p>
            <p className="mt-2 text-sm text-muted-foreground">News sentiment helps you understand context before placing a prediction or trade.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  </div>
)}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-2">
              <RiskExposurePanel portfolioId={1} />
              <TradePlanCalculator />
            </div>
            <CorrelationMatrix />
            <HeatmapView rows={marketRows} />
          </div>
        )}

        {/* PORTFOLIO TAB */}
        {activeTab === "portfolio" && (
          <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-2">
              <MultiPortfolioPanel onTradeExecuted={() => {
                setFirstActionRefreshKey((value) => value + 1)
                setAchievementRefreshKey((value) => value + 1)
              }} />
              <div className="space-y-5">
                <PriceTargetTracker />
                <TradeCopyPanel />
              </div>
            </div>
          </div>
        )}

        {/* WALLET TAB */}
        {activeTab === "wallet" && (
          <div className="space-y-5">
            <section className="grid gap-4 md:grid-cols-3">
              <StatTile icon={Wallet} label="Available cash" value={formatPrice(wallet?.wallet?.cash ?? 0)} />
              <StatTile icon={BarChart3} label="Portfolio value" value={formatPrice(wallet?.wallet?.total_value ?? 0)} />
              <StatTile icon={CreditCard} label="Account tier" value={subscription?.tier || "FREE"} />
            </section>

            {walletMessage ? (
              <div className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
                {walletMessage}
              </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Add funds
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Funding uses Stripe Checkout in test mode when backend Stripe env vars are configured. No keys are stored in the frontend.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      type="number"
                      min="5"
                      max="500"
                      step="1"
                      value={buyCashAmount}
                      onChange={(event) => setBuyCashAmount(event.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      aria-label="Funding amount in USD"
                    />
                    <Button onClick={handleBuyCash} disabled={fundingCheckout}>
                      {fundingCheckout ? "Starting..." : "Continue to Stripe"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Allowed range is $5 to $500 per checkout session.</p>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Crown className="h-4 w-4 text-primary" />
                    Account tiers
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  {[
                    { tier: "FREE", label: "Free", features: ["Basic backtesting", "Paper wallet", "Public leaderboard"] },
                    { tier: "PRO", label: "Pro", features: ["Unlimited backtests", "Live alerts", "Trade journal"] },
                    { tier: "PREMIUM", label: "Premium", features: ["Advanced models", "Private portfolios", "API access"] },
                  ].map((tier) => {
                    const isCurrent = (subscription?.tier || "FREE") === tier.tier
                    return (
                      <div key={tier.tier} className={cn("rounded-lg border p-4", isCurrent ? "border-primary/40 bg-primary/10" : "border-white/10 bg-background/60")}>
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{tier.label}</h3>
                          {isCurrent ? <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Current</span> : null}
                        </div>
                        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                          {tier.features.map((feature) => (
                            <li key={feature}>{feature}</li>
                          ))}
                        </ul>
                        {tier.tier !== "FREE" ? (
                          <Button
                            className="mt-4 w-full"
                            variant={isCurrent ? "outline" : "default"}
                            onClick={() => handleSubscribe(tier.tier as "PRO" | "PREMIUM")}
                            disabled={isCurrent || subscriptionCheckout === tier.tier}
                          >
                            {subscriptionCheckout === tier.tier ? "Starting..." : isCurrent ? "Active" : "Upgrade"}
                          </Button>
                        ) : null}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
              <Card className="border-white/10 bg-card/70">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ReceiptText className="h-4 w-4 text-primary" />
                    Transaction history
                  </CardTitle>
                  {loadingAccount ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-y border-white/10 text-xs text-muted-foreground">
                          <th className="px-4 py-3 text-left font-medium">Type</th>
                          <th className="px-4 py-3 text-right font-medium">Amount</th>
                          <th className="px-4 py-3 text-right font-medium">Status</th>
                          <th className="px-4 py-3 text-right font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment) => (
                          <tr key={payment.id} className="border-b border-white/10">
                            <td className="px-4 py-3">{payment.product_type.replace("_", " ")}</td>
                            <td className="px-4 py-3 text-right font-mono">{formatPrice(payment.amount_usd)}</td>
                            <td className="px-4 py-3 text-right">{payment.status}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : "Pending"}
                            </td>
                          </tr>
                        ))}
                        {!paymentHistory.length && !loadingAccount ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                              No transactions yet. Add funds to create your first checkout record.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Responsible-use guardrails
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg border border-white/10 bg-background/60 p-3">
                    <p className="text-muted-foreground">Prediction exposure</p>
                    <p className="mt-1 font-mono text-lg">{formatPrice(predictUserExposure)}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-background/60 p-3">
                    <p className="text-muted-foreground">Open prediction P&L</p>
                    <p className={cn("mt-1 font-mono text-lg", predictUserPnl >= 0 ? "text-market-up" : "text-market-down")}>{signedMoney(predictUserPnl)}</p>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-muted-foreground">Optional daily funding limit</label>
                    <input
                      type="number"
                      min="0"
                      value={accountPreferences.dailyFundingLimit ?? ""}
                      onChange={(event) => setAccountPreferences((current) => ({ ...current, dailyFundingLimit: event.target.value ? Number(event.target.value) : null }))}
                      onBlur={(event) => void updateAccountLimit("dailyFundingLimit", event.target.value)}
                      placeholder="No limit set"
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-muted-foreground">Optional prediction exposure limit</label>
                    <input
                      type="number"
                      min="0"
                      value={accountPreferences.exposureLimit ?? ""}
                      onChange={(event) => setAccountPreferences((current) => ({ ...current, exposureLimit: event.target.value ? Number(event.target.value) : null }))}
                      onBlur={(event) => void updateAccountLimit("exposureLimit", event.target.value)}
                      placeholder="No limit set"
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    {accountPreferences.exposureLimit !== null && predictUserExposure > accountPreferences.exposureLimit ? (
                      <p className="rounded-md bg-market-down/10 px-3 py-2 text-xs text-market-down">
                        Current prediction exposure is above your self-set limit.
                      </p>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground">
                    Withdrawals are intentionally not auto-triggered. A real payout processor must be configured before withdrawal execution is enabled.
                  </p>
                  {subscription?.tier !== "FREE" ? (
                    <Button variant="outline" className="w-full" onClick={handleCancelSubscription}>
                      Cancel at period end
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-5">
              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserCircle className="h-4 w-4 text-primary" />
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="mt-1 font-medium">{accountSettings?.profile?.name || user?.name || "Trader"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="mt-1 font-mono">{accountSettings?.profile?.email || user?.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tier</p>
                    <p className="mt-1 font-medium">{subscription?.tier || "FREE"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last login</p>
                    <p className="mt-1">{accountSettings?.profile?.last_login ? new Date(accountSettings.profile.last_login).toLocaleString() : "Current session"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LockKeyhole className="h-4 w-4 text-primary" />
                    Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p className="text-muted-foreground">
                    Password changes are API-backed. 2FA is shown as a capability but is disabled until a second-factor backend is implemented.
                  </p>
                  <div className="grid gap-2">
                    <input
                      type="password"
                      value={passwordForm.current}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, current: event.target.value }))}
                      placeholder="Current password"
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="password"
                      value={passwordForm.next}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, next: event.target.value }))}
                      placeholder="New password"
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button
                      variant="outline"
                      onClick={handlePasswordChange}
                      disabled={!passwordForm.current || passwordForm.next.length < 8}
                    >
                      Update password
                    </Button>
                  </div>
                  {securityMessage ? (
                    <p className={cn("rounded-md px-3 py-2 text-sm", /updated/i.test(securityMessage) ? "bg-market-up/10 text-market-up" : "bg-market-down/10 text-market-down")}>
                      {securityMessage}
                    </p>
                  ) : null}
                  <div className="rounded-lg border border-white/10 bg-background/60 p-3">
                    <p className="font-medium text-foreground">Two-factor authentication</p>
                    <p className="mt-1 text-muted-foreground">
                      {accountSettings?.capabilities?.two_factor ? "Available" : "Not configured in this backend yet."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Linked payment methods
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {accountSettings?.payment_methods?.length ? (
                    accountSettings.payment_methods.map((method) => (
                      <div key={method.id} className="rounded-lg border border-white/10 bg-background/60 p-3">
                        <p className="font-medium">{method.brand} ending {method.last4}</p>
                        <p className="mt-1 text-muted-foreground">Expires {method.exp_month}/{method.exp_year}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-white/10 bg-background/60 p-3 text-muted-foreground">
                      No saved payment methods. Stripe Checkout can collect payment details without storing them in KingStop.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5">
              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className="h-4 w-4 text-primary" />
                    Notification preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {([
                    ["pushNotifications", "Optional push notifications"],
                    ["resolutionAlerts", "Prediction resolution alerts"],
                    ["priceAlerts", "Price alerts"],
                    ["streakReminders", "Streak reminders"],
                  ] as Array<[keyof Pick<AccountPreferences, "pushNotifications" | "resolutionAlerts" | "priceAlerts" | "streakReminders">, string]>).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-background/60 px-4 py-3 text-sm">
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={accountPreferences[key]}
                        onChange={(event) => void updateAccountPreference(key, event.target.checked)}
                        className="h-4 w-4 accent-primary"
                      />
                    </label>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Privacy controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {([
                    ["leaderboardOptIn", "Show my performance on leaderboards"],
                    ["publicProfile", "Allow public profile discovery"],
                  ] as Array<[keyof Pick<AccountPreferences, "leaderboardOptIn" | "publicProfile">, string]>).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-background/60 px-4 py-3 text-sm">
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={accountPreferences[key]}
                        onChange={(event) => void updateAccountPreference(key, event.target.checked)}
                        className="h-4 w-4 accent-primary"
                      />
                    </label>
                  ))}
                  <p className="text-sm text-muted-foreground">
                    These preferences are stored per user through the account API, with local storage used only as a UI fallback.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Command className="h-4 w-4 text-primary" />
                    Keyboard shortcuts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-background/60 px-4 py-3 text-sm">
                    <span>Enable global navigation shortcuts</span>
                    <input
                      type="checkbox"
                      checked={accountPreferences.keyboardShortcutsEnabled}
                      onChange={(event) => void updateAccountPreference("keyboardShortcutsEnabled", event.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm">
                      <span>Command palette</span>
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">Cmd/Ctrl K</kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm">
                      <span>Shortcut menu</span>
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">?</kbd>
                    </div>
                    {dashboardNavigationItems.map(({ id, label, shortcut }) => (
                      <div key={id} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm">
                        <span>{label}</span>
                        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl {shortcut}</kbd>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <RadioTower className="h-4 w-4 text-primary" />
                    Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(accountSettings?.sessions || []).map((session) => (
                    <div key={session.id} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-background/60 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">{session.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last seen {session.last_seen ? new Date(session.last_seen).toLocaleString() : "now"}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" disabled={!session.revocable}>
                        {session.revocable ? "Revoke" : "Current"}
                      </Button>
                    </div>
                  ))}
                  {!accountSettings?.capabilities?.session_revocation ? (
                    <p className="text-sm text-muted-foreground">
                      Session revocation needs a token denylist or refresh-token store before it can be safely enabled.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* MARKETPLACE TAB */}
        {activeTab === "marketplace" && (
          <div className="space-y-4">
            <Card className="border-white/10 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Signals Marketplace
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Buy and sell trading strategies. Revenue share with creators.</p>
                <MarketplacePanel />
              </CardContent>
            </Card>
          </div>
        )}

        {/* SOCIAL TAB */}
        {activeTab === "social" && (
          <div className="space-y-4">
            <SocialFeedPanel />
          </div>
        )}

        {/* CRYPTO TAB */}
        {activeTab === "crypto" && (
          <div className="space-y-4">
            <Card className="border-white/10 bg-card/70">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bitcoin className="h-4 w-4 text-primary" />
                  Crypto Markets
                </CardTitle>
                {loadingCrypto && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-white/10 text-xs text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">Ticker</th>
                        <th className="px-4 py-3 text-left font-medium">Name</th>
                        <th className="px-4 py-3 text-right font-medium">Price (USD)</th>
                        <th className="px-4 py-3 text-right font-medium">Change %</th>
                        <th className="px-4 py-3 text-right font-medium">Volume</th>
                        <th className="px-4 py-3 text-right font-medium">Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cryptoRows.map((row) => (
                        <tr key={row.ticker} className="border-b border-white/10 hover:bg-muted/30">
                          <td className="px-4 py-3 font-semibold">{row.ticker}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.name}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatPrice(row.price, "USD")}</td>
                          <td className={cn("px-4 py-3 text-right font-mono", row.change_pct >= 0 ? "text-market-up" : "text-market-down")}>
                            {percent(row.change_pct)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatVolume(row.volume)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs", signalColor(row.signal))}>{row.signal}</span>
                          </td>
                        </tr>
                      ))}
                      {!cryptoRows.length && !loadingCrypto && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading crypto data...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <Card className="border-white/10 bg-card/70">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4 text-primary" />
                  Portfolio Leaderboard
                </CardTitle>
                {loadingLeaderboard && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-white/10 text-xs text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">Rank</th>
                        <th className="px-4 py-3 text-left font-medium">Portfolio</th>
                        <th className="px-4 py-3 text-right font-medium">Total Value</th>
                        <th className="px-4 py-3 text-right font-medium">Cash</th>
                        <th className="px-4 py-3 text-right font-medium">Positions Value</th>
                        <th className="px-4 py-3 text-right font-medium">Trades</th>
                        <th className="px-4 py-3 text-right font-medium">Stats</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((row: any) => (
                        <tr key={row.portfolio_id} className="border-b border-white/10 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <span className={cn("font-bold", row.rank === 1 ? "text-yellow-400" : row.rank === 2 ? "text-slate-300" : row.rank === 3 ? "text-amber-600" : "")}>
                              #{row.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">{row.name}</td>
                          <td className="px-4 py-3 text-right font-mono text-market-up">{formatPrice(row.total_value)}</td>
                          <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatPrice(row.cash)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatPrice(row.positions_value)}</td>
                          <td className="px-4 py-3 text-right">{row.trade_count}</td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline" onClick={() =>
                              getPortfolioStats(row.portfolio_id).then(setPortfolioStats)
                            }>View</Button>
                          </td>
                        </tr>
                      ))}
                      {!leaderboard.length && !loadingLeaderboard && (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center">
                            <div className="mx-auto max-w-md space-y-3">
                              <p className="font-medium">No leaderboard entries yet.</p>
                              <p className="text-sm text-muted-foreground">Create a paper portfolio and opt in from Settings when you are ready to appear here.</p>
                              <Button size="sm" variant="outline" onClick={() => setActiveTab("portfolio")}>
                                Create portfolio
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {portfolioStats && (
              <Card className="border-white/10 bg-card/70">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-base">{portfolioStats.name} — Stats</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setPortfolioStats(null)}><X className="h-4 w-4" /></Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    {[
                      ["Total Value", formatPrice(portfolioStats.total_value), portfolioStats.total_value >= 100000 ? "up" : "down"],
                      ["Total P&L", formatPrice(portfolioStats.total_pnl), portfolioStats.total_pnl >= 0 ? "up" : "down"],
                      ["Win Rate", `${portfolioStats.win_rate}%`, "neutral"],
                      ["Total Trades", String(portfolioStats.total_trades), "neutral"],
                    ].map(([label, value, tone]) => (
                      <div key={label as string} className="rounded-lg border border-white/10 bg-background/60 p-4">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className={cn("mt-2 text-xl font-semibold", tone === "up" ? "text-market-up" : tone === "down" ? "text-market-down" : "")}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {portfolioStats.equity_curve?.length > 0 && (
                    <div className="h-[240px] rounded-lg border border-white/10 bg-background/60 p-4">
                      <p className="mb-2 text-sm text-muted-foreground">P&L over time</p>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={portfolioStats.equity_curve}>
                          <defs>
                            <linearGradient id="pnl" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#28d17c" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#28d17c" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                          <XAxis dataKey="date" hide />
                          <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} stroke="rgba(255,255,255,0.45)" width={56} />
                          <RechartsTooltip
                            formatter={(v) => [formatPrice(Number(v)), "Cumulative P&L"]}
                            contentStyle={{ background: "#0b0f14", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }}
                          />
                          <Area type="monotone" dataKey="cumulative_pnl" stroke="#28d17c" strokeWidth={2} fill="url(#pnl)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* JOURNAL TAB */}
        {activeTab === "journal" && (
          <div className="space-y-4">
            <Card className="border-white/10 bg-card/70">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PenLine className="h-4 w-4 text-primary" />
                  Add Journal Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-4">
                  <input
                    value={journalTicker}
                    onChange={(e) => setJournalTicker(e.target.value.toUpperCase())}
                    placeholder="Ticker"
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <select
                    value={journalSentiment}
                    onChange={(e) => setJournalSentiment(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Sentiment</option>
                    <option value="bullish">Bullish</option>
                    <option value="bearish">Bearish</option>
                    <option value="neutral">Neutral</option>
                  </select>
                  <input
                    value={journalNote}
                    onChange={(e) => setJournalNote(e.target.value)}
                    placeholder="Note / trade rationale..."
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:col-span-2"
                  />
                </div>
                <Button className="mt-3" onClick={handleAddJournalEntry} disabled={!journalTicker || !journalNote}>
                  Add Entry
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/70">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Journal Entries</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingJournal ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : journalEntries.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="font-medium">No journal entries yet.</p>
                    <p className="mt-2 text-sm text-muted-foreground">After your first prediction or paper trade, record the thesis here so win-rate and behavior patterns are easier to review.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {journalEntries.map((e: any) => (
                      <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{e.ticker}</span>
                            {e.sentiment && (
                              <span className={cn("rounded-full border px-2 py-0.5 text-xs",
                                e.sentiment === "bullish" ? "text-market-up bg-market-up/10 border-market-up/25" :
                                e.sentiment === "bearish" ? "text-market-down bg-market-down/10 border-market-down/25" :
                                "text-muted-foreground bg-muted"
                              )}>{e.sentiment}</span>
                            )}
                            <span className="text-xs text-muted-foreground">{e.created_at ? new Date(e.created_at).toLocaleDateString() : ""}</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{e.note}</p>
                          {e.pnl !== null && e.pnl !== undefined && (
                            <p className={cn("mt-1 text-xs font-mono", e.pnl >= 0 ? "text-market-up" : "text-market-down")}>
                              P&L: {e.pnl >= 0 ? "+" : ""}{formatPrice(e.pnl)}
                            </p>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteJournalEntry(e.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {/* PREDICT TAB */}
        {activeTab === "predict" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Prediction Markets</h2>
                <p className="text-sm text-muted-foreground">Bet paper money on Yes/No outcomes. Prices move with each trade (CPMM).</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={predictCategory}
                  onChange={(e) => setPredictCategory(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All categories</option>
                  {["stocks", "crypto", "india", "macro"].map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <select
                  value={predictStatus}
                  onChange={(e) => setPredictStatus(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All status</option>
                  <option value="OPEN">Open</option>
                  <option value="RESOLVED_YES">Resolved YES</option>
                  <option value="RESOLVED_NO">Resolved NO</option>
                </select>
                <Button size="sm" variant="outline" onClick={() => setPredictShowCreate((value) => !value)}>
                  {predictShowCreate ? "Close" : "Create market"}
                </Button>
                {loadingPredict && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Paper cash", formatPrice(wallet?.wallet?.cash ?? wallet?.dummy_money ?? 0), "neutral"],
                ["Open markets", String(predictOpenCount), "neutral"],
                ["Exposure", formatPrice(predictUserExposure), "neutral"],
                ["Mark value", formatPrice(predictUserValue), predictUserValue >= predictUserExposure ? "up" : "down"],
                ["Open P&L", signedMoney(predictUserPnl), predictUserPnl >= 0 ? "up" : "down"],
              ].map(([label, value, tone]) => (
                <div key={label as string} className="rounded-lg border border-white/10 bg-card/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className={cn("mt-2 font-mono text-lg font-semibold", tone === "up" && "text-market-up", tone === "down" && "text-market-down")}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {predictShowCreate && (
              <Card className="border-primary/25 bg-primary/5">
                <CardContent className="grid gap-3 p-4 lg:grid-cols-[2fr_0.8fr_0.8fr_0.8fr]">
                  <input
                    value={newPredictMarket.question}
                    onChange={(e) => setNewPredictMarket((p) => ({ ...p, question: e.target.value }))}
                    placeholder="Market question, e.g. Will NVDA close above $900 this week?"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring lg:col-span-2"
                  />
                  <select
                    value={newPredictMarket.category}
                    onChange={(e) => setNewPredictMarket((p) => ({ ...p, category: e.target.value }))}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {["stocks", "crypto", "india", "macro"].map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                  <input
                    value={newPredictMarket.ticker}
                    onChange={(e) => setNewPredictMarket((p) => ({ ...p, ticker: e.target.value.toUpperCase() }))}
                    placeholder="Ticker"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    value={newPredictMarket.condition}
                    onChange={(e) => setNewPredictMarket((p) => ({ ...p, condition: e.target.value }))}
                    placeholder="Condition"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="number"
                    value={newPredictMarket.threshold}
                    onChange={(e) => setNewPredictMarket((p) => ({ ...p, threshold: e.target.value }))}
                    placeholder="Threshold"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="number"
                    min="5"
                    max="95"
                    value={newPredictMarket.initialProbability}
                    onChange={(e) => setNewPredictMarket((p) => ({ ...p, initialProbability: e.target.value }))}
                    placeholder="YES %"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="number"
                    min="50"
                    value={newPredictMarket.liquidity}
                    onChange={(e) => setNewPredictMarket((p) => ({ ...p, liquidity: e.target.value }))}
                    placeholder="Liquidity"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button onClick={handleCreatePredictMarket} disabled={creatingPredict} className="h-10">
                    {creatingPredict ? "Creating..." : "Open market"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {predictMsg[-1] && (
              <p className="rounded-md bg-market-down/10 px-3 py-2 text-sm text-market-down">{predictMsg[-1]}</p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {predictMarkets.map((m) => {
                const isOpen = m.status === "OPEN"
                const buyState = predictBuying[m.id] || { cost: "10", side: "YES" as const }
                const preview = previewPredictBuy(m, buyState)
                const msg = predictMsg[m.id]
                const msgIsError = !!msg && /failed|error|insufficient|must|not enough/i.test(msg)
                const resolvedYes = m.status === "RESOLVED_YES"
                const resolvedNo = m.status === "RESOLVED_NO"
                const userPositions = m.user_position || []

                return (
                  <Card key={m.id} className={cn("border-white/10 bg-card/70", !isOpen && "opacity-75")}>
                    <CardContent className="p-5 space-y-4">
                      {/* Question + category */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium leading-snug">{m.question}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {m.ticker && <span className="rounded-full bg-muted px-2 py-0.5 font-mono">{m.ticker}</span>}
                            {m.condition && <span className="rounded-full bg-muted px-2 py-0.5">{m.condition}</span>}
                            <span className="rounded-full bg-muted px-2 py-0.5">
                              Liquidity {formatPrice(m.liquidity || 0)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{m.category}</span>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-xs",
                            isOpen ? "bg-primary/10 text-primary" : resolvedYes ? "bg-market-up/10 text-market-up" : "bg-market-down/10 text-market-down"
                          )}>
                            {isOpen ? "OPEN" : resolvedYes ? "YES won" : resolvedNo ? "NO won" : m.status}
                          </span>
                        </div>
                      </div>

                      {/* Probability bar */}
                      <div>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-market-up font-medium">YES {m.yes_pct}%</span>
                          <span className="text-market-down font-medium">NO {m.no_pct}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-market-down/30 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-market-up transition-all duration-500"
                            style={{ width: `${m.yes_pct}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                          <span>${m.yes_price.toFixed(3)}/share</span>
                          <span>Vol: ${m.total_volume}</span>
                          <span>${m.no_price.toFixed(3)}/share</span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-md bg-market-up/10 px-2 py-1">
                            <p className="text-muted-foreground">YES pool</p>
                            <p className="font-mono text-market-up">{formatPrice(m.yes_reserve || 0)}</p>
                          </div>
                          <div className="rounded-md bg-market-down/10 px-2 py-1">
                            <p className="text-muted-foreground">NO pool</p>
                            <p className="font-mono text-market-down">{formatPrice(m.no_reserve || 0)}</p>
                          </div>
                          <div className="rounded-md bg-muted px-2 py-1">
                            <p className="text-muted-foreground">CPMM k</p>
                            <p className="font-mono">{((m.yes_reserve || 0) * (m.no_reserve || 0)).toFixed(0)}</p>
                          </div>
                        </div>
                        {preview && isOpen && (
                          <div className="mt-3 rounded-lg border border-white/10 bg-background/60 p-3 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-muted-foreground">After buying {buyState.side} for {formatPrice(Number(buyState.cost) || 0)}</span>
                              <span className={preview.impactPct >= 0 ? "text-market-up" : "text-market-down"}>
                                {preview.impactPct >= 0 ? "+" : ""}{preview.impactPct.toFixed(2)} probability pts
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <div>
                                <p className="text-muted-foreground">Est. shares</p>
                                <p className="font-mono">{preview.shares.toFixed(4)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Avg price</p>
                                <p className="font-mono">${preview.avgPrice.toFixed(4)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">YES after</p>
                                <p className="font-mono text-market-up">{probabilityLabel(preview.yesPctAfter)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">NO after</p>
                                <p className="font-mono text-market-down">{probabilityLabel(preview.noPctAfter)}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Status badge */}
                      {!isOpen && (
                        <div className={cn("rounded-lg px-3 py-2 text-sm font-medium text-center",
                          resolvedYes ? "bg-market-up/15 text-market-up" : "bg-market-down/15 text-market-down"
                        )}>
                          {resolvedYes ? "Resolved YES" : "Resolved NO"}
                        </div>
                      )}

                      {/* User positions */}
                      {userPositions.length > 0 && (
                        <div className="rounded-lg border border-white/10 bg-background/60 p-3 text-xs">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-muted-foreground font-medium">Your positions</p>
                            <p className={cn("font-mono", (m.user_unrealized_pnl || 0) >= 0 ? "text-market-up" : "text-market-down")}>
                              {signedMoney(m.user_unrealized_pnl || 0)}
                            </p>
                          </div>
                          {userPositions.map((p) => (
                            <div key={p.id} className="space-y-2 border-t border-white/10 py-2 first:border-t-0 first:pt-0">
                              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                                <span className={cn("rounded-full px-2 py-0.5 font-medium", p.side === "YES" ? "bg-market-up/10 text-market-up" : "bg-market-down/10 text-market-down")}>
                                  {p.side}
                                </span>
                                <span className="font-mono text-muted-foreground">
                                  {p.shares} shares @ ${p.avg_price}
                                </span>
                                <span className={p.unrealized_pnl >= 0 ? "text-market-up" : "text-market-down"}>
                                  {signedMoney(p.unrealized_pnl)}
                                </span>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                                <input
                                  type="number"
                                  min="0"
                                  max={p.shares}
                                  step="0.0001"
                                  value={predictSelling[m.id]?.[p.id] ?? p.shares.toString()}
                                  onChange={(e) => setPredictSelling((current) => ({
                                    ...current,
                                    [m.id]: { ...(current[m.id] || {}), [p.id]: e.target.value },
                                  }))}
                                  className="h-8 rounded-md border border-input bg-background px-2 font-mono outline-none focus:ring-2 focus:ring-ring"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2"
                                  onClick={() => setPredictSelling((current) => ({
                                    ...current,
                                    [m.id]: { ...(current[m.id] || {}), [p.id]: (p.shares / 2).toFixed(4) },
                                  }))}
                                  disabled={!isOpen}
                                >
                                  Half
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2"
                                  onClick={() => setPredictSelling((current) => ({
                                    ...current,
                                    [m.id]: { ...(current[m.id] || {}), [p.id]: p.shares.toString() },
                                  }))}
                                  disabled={!isOpen}
                                >
                                  All
                                </Button>
                                <Button size="sm" className="h-8 px-2" onClick={() => handleSellPredict(m.id, p)} disabled={!isOpen}>
                                  Sell
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Buy UI */}
                      {isOpen && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2 grid grid-cols-2 rounded-lg bg-muted p-1">
                              {(["YES", "NO"] as const).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setPredictBuying((p) => ({ ...p, [m.id]: { ...buyState, side: s } }))}
                                  className={cn(
                                    "rounded-md py-1.5 text-sm font-medium transition-all",
                                    buyState.side === s
                                      ? s === "YES" ? "bg-market-up/20 text-market-up shadow" : "bg-market-down/20 text-market-down shadow"
                                      : "text-muted-foreground hover:text-foreground"
                                  )}
                                >{s}</button>
                              ))}
                            </div>
                            <input
                              type="number"
                              min="1"
                              value={buyState.cost}
                              onChange={(e) => setPredictBuying((p) => ({ ...p, [m.id]: { ...buyState, cost: e.target.value } }))}
                              placeholder="$"
                              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {[5, 10, 25, 50].map((amount) => (
                              <Button
                                key={amount}
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs"
                                onClick={() => setPredictBuying((p) => ({ ...p, [m.id]: { ...buyState, cost: String(amount) } }))}
                              >
                                ${amount}
                              </Button>
                            ))}
                          </div>
                          <Button
                            className="w-full"
                            size="sm"
                            onClick={() => handleBuyPredict(m.id)}
                            disabled={!preview}
                          >
                            Buy {buyState.side} for ${buyState.cost || "0"}
                          </Button>
                        </div>
                      )}

                      {/* Resolve buttons (demo) */}
                      {isOpen && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 text-market-up border-market-up/30 hover:bg-market-up/10" onClick={() => handleResolve(m.id, "YES")}>
                            Resolve YES
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 text-market-down border-market-down/30 hover:bg-market-down/10" onClick={() => handleResolve(m.id, "NO")}>
                            Resolve NO
                          </Button>
                        </div>
                      )}

                      {/* Feedback message */}
                      {msg && (
                        <p className={cn("text-xs rounded px-2 py-1", msgIsError ? "text-market-down bg-market-down/10" : "text-market-up bg-market-up/10")}>
                          {msg}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
              {!predictMarkets.length && !loadingPredict && (
                <Card className="col-span-2 border-primary/20 bg-primary/5">
                  <CardContent className="py-10 text-center">
                    <p className="font-medium">No prediction markets match this filter.</p>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                      Clear the filters or create a market to make your first paper-money prediction.
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                      <Button size="sm" onClick={() => setPredictShowCreate(true)}>
                        Create market
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setPredictCategory(""); setPredictStatus("OPEN") }}>
                        Reset filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
        </div>
        </main>
      </div>
      </div>
    </>
  )
}
