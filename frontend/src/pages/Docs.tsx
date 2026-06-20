import { Link, useNavigate } from "react-router-dom"
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bitcoin,
  Bot,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Command,
  Compass,
  CreditCard,
  Database,
  FileText,
  Filter,
  Globe2,
  KeyRound,
  LineChart,
  MessageSquare,
  Newspaper,
  PenLine,
  RadioTower,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { dashboardNavigationItems } from "@/features/navigation/navigation-items"
import { paths, type DashboardSectionId } from "@/routes/paths"
import { cn } from "@/lib/utils"

type CardItem = {
  icon: LucideIcon
  title: string
  body: string
}

type DashboardDoc = {
  id: DashboardSectionId
  summary: string
  details: string[]
}

const toc = [
  ["Start", "#start"],
  ["What Is Inside", "#inside"],
  ["Workflows", "#workflows"],
  ["Dashboard Sections", "#sections"],
  ["Search And Shortcuts", "#search"],
  ["Chat", "#chat"],
  ["Data And Backend", "#backend"],
  ["Troubleshooting", "#troubleshooting"],
]

const highlights: CardItem[] = [
  {
    icon: Compass,
    title: "One URL per workspace",
    body: "Every dashboard area has a direct route such as /dashboard/overview, /dashboard/chat, /dashboard/portfolio, and /dashboard/analytics.",
  },
  {
    icon: BrainCircuit,
    title: "Model driven trading cockpit",
    body: "Live and backtesting modes keep separate model selections so you can compare fast signals, replay results, and confidence.",
  },
  {
    icon: Wallet,
    title: "Paper-money first",
    body: "Wallets, prediction markets, portfolios, streaks, rewards, and challenges are safe demo surfaces for test users.",
  },
  {
    icon: Bot,
    title: "Groq powered chat",
    body: "The Chat section is a full dashboard workspace powered by a backend-proxied Groq key, not a browser-exposed secret.",
  },
]

const setupSteps = [
  "Sign in with the seeded test account: test@kingstop.dev / KingStop@2026.",
  "Open Overview to see the selected ticker, model confidence, wallet summary, and first-action prompt.",
  "Use the search box like a normal search bar: valid tickers open reports, invalid input shows No report found.",
  "Use Chat from the left navbar for open LLM conversation and workflow help.",
  "Use Portfolio, Analytics, Predict, Journal, News, Marketplace, and Social with built-in demo data for a fresh test user.",
]

const workflows: CardItem[] = [
  {
    icon: Target,
    title: "First low-risk action",
    body: "Start on Overview, then preview a prediction, review wallet guardrails, or scan news before making a paper trade.",
  },
  {
    icon: LineChart,
    title: "Live to backtest loop",
    body: "Pick a ticker, review the live fused signal, switch to Backtest, run a replay, and compare return, drawdown, Sharpe, and win rate.",
  },
  {
    icon: BarChart3,
    title: "Portfolio to analytics loop",
    body: "Create or inspect paper portfolios, then move to Analytics for risk exposure, trade planning, correlations, and heatmaps.",
  },
  {
    icon: MessageSquare,
    title: "Research to review loop",
    body: "Scan News, discuss context in Chat, record the decision in Journal, and share or discover ideas in Social and Marketplace.",
  },
]

const dashboardDocs: DashboardDoc[] = [
  {
    id: "overview",
    summary: "The main command center for the selected ticker, model state, paper wallet, first action prompt, watchlist, and activity feed.",
    details: ["Shows the selected ticker without overlap.", "Contains the compact first-action card above the workspace pills.", "Links to key next steps across the app."],
  },
  {
    id: "chat",
    summary: "A full Claude-style chat workspace in the left navbar, backed by the Groq chat endpoint.",
    details: ["Uses /api/v1/llm-chat through the FastAPI backend.", "Keeps API keys out of frontend code.", "Includes prompt chips and a bottom composer."],
  },
  {
    id: "screener",
    summary: "Filters US, NSE, and BSE market rows by market and signal so you can discover tickers to inspect.",
    details: ["Uses Yahoo-style symbols for India, such as RELIANCE.NS and TCS.BO.", "Shows no-match states instead of blank screens.", "Selecting a row updates the active ticker."],
  },
  {
    id: "news",
    summary: "Ticker news and sentiment summary with positive, neutral, and negative filters.",
    details: ["Fresh test users receive demo news.", "Search by ticker to refresh the scan.", "Use it before predictions or journal entries."],
  },
  {
    id: "crypto",
    summary: "Crypto market overview using the same table language and signal badges as stock views.",
    details: ["Includes BTC, ETH, BNB, SOL, XRP, and DOGE style symbols.", "Falls back safely if live market calls fail.", "Keeps pricing in USD."],
  },
  {
    id: "leaderboard",
    summary: "Paper portfolio leaderboard for comparing demo performance and trade activity.",
    details: ["Uses opt-in profile behavior from account settings.", "Shows value, cash, positions value, trades, and stats.", "Works with seeded/demo data."],
  },
  {
    id: "journal",
    summary: "Trade decision journal for ticker thesis, sentiment, notes, and P&L review.",
    details: ["Fresh test users see sample entries.", "Local fallback keeps entries visible if the backend is unavailable.", "Useful after predictions and paper trades."],
  },
  {
    id: "predict",
    summary: "Paper-money YES/NO prediction markets with CPMM style price impact previews.",
    details: ["Demo markets are interactive for buy, sell, resolve, and create actions.", "Shows exposure, mark value, and open P&L.", "Designed for reversible, low-risk experimentation."],
  },
  {
    id: "analytics",
    summary: "Trading analytics tools for risk exposure, trade planning, correlations, and market heatmaps.",
    details: ["Uses dummy data for test users.", "Stays in the same dark/gold app theme.", "Avoids black screens when APIs return empty data."],
  },
  {
    id: "portfolio",
    summary: "Multi-portfolio paper trading workspace with price targets and trade-copy feed.",
    details: ["Includes demo portfolios, positions, target alerts, and copied trades.", "Uses compact cards and the same dashboard theme.", "Paper trades update the local UI for demo portfolios."],
  },
  {
    id: "wallet",
    summary: "Paper cash, Stripe test checkout status, funding history, and responsible-use guardrails.",
    details: ["Shows dummy-money balances.", "Subscription and checkout flows are backend-controlled.", "Funding limits and exposure limits live in account preferences."],
  },
  {
    id: "settings",
    summary: "Account, privacy, notifications, shortcuts, security, and session controls.",
    details: ["Keyboard shortcut labels use Ctrl plus the section key.", "Profile and privacy values are server-backed.", "Password change is API-backed."],
  },
  {
    id: "marketplace",
    summary: "Strategy marketplace for discovering, buying, and publishing paper strategy ideas.",
    details: ["Fresh test users see demo strategies.", "Buy actions work locally for demo rows.", "Fits the same black/gold dashboard styling."],
  },
  {
    id: "social",
    summary: "Social idea feed for sharing ticker direction, thesis, comments, and engagement.",
    details: ["Fresh test users see seeded demo ideas.", "Posting and comments fall back locally when APIs are unavailable.", "Good for reviewing trade ideas before journaling."],
  },
]

const backendCards: CardItem[] = [
  {
    icon: KeyRound,
    title: "Auth",
    body: "JWT authentication lives under /api/v1/auth. Test access is seeded for test@kingstop.dev with the shared test password.",
  },
  {
    icon: Database,
    title: "Storage",
    body: "SQLite stores users, preferences, wallets, alerts, streaks, achievements, portfolios, journal entries, prediction markets, and payments.",
  },
  {
    icon: RadioTower,
    title: "Market data",
    body: "Market data uses yfinance/Yahoo-compatible symbols with deterministic fallback rows when live requests fail or are disabled.",
  },
  {
    icon: Code2,
    title: "API",
    body: "The frontend calls /api/v1 through the Vite proxy. FastAPI OpenAPI remains available at http://127.0.0.1:8000/docs.",
  },
]

const endpoints = [
  ["POST", "/api/v1/auth/login", "Seeded reviewer login"],
  ["GET", "/api/v1/stocks/overview?market=us", "US market overview"],
  ["GET", "/api/v1/stocks/overview?market=nse", "NSE overview"],
  ["GET", "/api/v1/signals/NVDA", "Fused ticker signal"],
  ["GET", "/api/v1/portfolio/backtest/NVDA", "Backtest replay"],
  ["GET", "/api/v1/predict", "Prediction markets"],
  ["GET", "/api/v1/journal", "Journal entries"],
  ["POST", "/api/v1/llm-chat", "Groq-backed chat completion"],
]

const troubleshooting = [
  ["Black screen", "Analytics and portfolio components include demo fallbacks, but restart Vite if a stale bundle is loaded."],
  ["Chat returns an error", "Confirm backend/.env has GROQ_API_KEY and restart the FastAPI server so settings reload."],
  ["Search shows No report found", "The searched value does not match the loaded market rows. Try NVDA, AAPL, RELIANCE.BO, or TCS.NS."],
  ["Route is unavailable", "Use direct dashboard routes such as /dashboard/overview, /dashboard/chat, /dashboard/portfolio, and /dashboard/analytics."],
]

function FeatureCard({ item }: { item: CardItem }) {
  const Icon = item.icon
  return (
    <article className="rounded-lg border border-white/10 bg-card/70 p-5 shadow-ink">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
    </article>
  )
}

function SectionHeading({
  id,
  icon: Icon,
  eyebrow,
  title,
  body,
}: {
  id: string
  icon: LucideIcon
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Icon className="h-3.5 w-3.5" />
        {eyebrow}
      </div>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  )
}

function DashboardSectionCard({ section }: { section: DashboardDoc }) {
  const navItem = dashboardNavigationItems.find((item) => item.id === section.id)
  const Icon = navItem?.icon || FileText

  return (
    <article className="rounded-lg border border-white/10 bg-card/70 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{navItem?.label || section.id}</h3>
            <span className="rounded-full border border-white/10 bg-background/70 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              /dashboard/{section.id}
            </span>
            {navItem?.shortcut ? (
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                Ctrl {navItem.shortcut}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.summary}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {section.details.map((detail) => (
              <li key={detail} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}

export default function Docs() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}kingstop-mark.svg`} alt="KingStop" className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold leading-none tracking-tight">KingStop Docs</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">End-to-end guide for users, reviewers, and developers</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(paths.dashboardDefault)} className="hidden sm:inline-flex">
              Open app
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-lg border border-white/10 bg-card/70 p-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
            <nav className="space-y-1">
              {toc.map(([label, href]) => (
                <a key={href} href={href} className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground">
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-12">
          <section id="start" className="scroll-mt-24 overflow-hidden rounded-lg border border-white/10 bg-card/70 shadow-ink">
            <div className="grid gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm text-primary">
                  <BookOpen className="h-4 w-4" />
                  Complete product guide
                </div>
                <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
                  Read KingStop end to end before using the trading workspace.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                  KingStop combines market scanning, model-driven signals, backtesting, paper portfolios, prediction markets,
                  journaling, social ideas, marketplace strategies, analytics, wallet controls, and Groq-powered chat in one dashboard.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => navigate(paths.dashboardDefault)}>
                    Open dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => navigate(paths.dashboardSection("chat"))}>
                    Open Chat
                    <Bot className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-background/60 p-4">
                <p className="text-sm font-semibold">Quick start</p>
                <div className="mt-4 space-y-3">
                  {setupSteps.map((step, index) => (
                    <div key={step} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <p className="text-sm leading-6 text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <SectionHeading
              id="inside"
              icon={Sparkles}
              eyebrow="Product map"
              title="What is inside KingStop"
              body="The app is designed as a practical trading intelligence cockpit. It uses demo-safe paper money and fallback data so every test route stays readable."
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {highlights.map((item) => <FeatureCard key={item.title} item={item} />)}
            </div>
          </section>

          <section className="space-y-5">
            <SectionHeading
              id="workflows"
              icon={Activity}
              eyebrow="How to use it"
              title="Recommended workflows"
              body="These flows match how the current dashboard is wired. They keep risk low, make the UI easy to test, and connect the app sections together."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {workflows.map((item) => <FeatureCard key={item.title} item={item} />)}
            </div>
          </section>

          <section className="space-y-5">
            <SectionHeading
              id="sections"
              icon={BarChart3}
              eyebrow="Dashboard routes"
              title="Every dashboard section"
              body="The left navbar, command palette, and direct URLs all point to these sections. Each page follows the same black and gold theme."
            />
            <div className="grid gap-4 xl:grid-cols-2">
              {dashboardDocs.map((section) => <DashboardSectionCard key={section.id} section={section} />)}
            </div>
          </section>

          <section className="space-y-5">
            <SectionHeading
              id="search"
              icon={Search}
              eyebrow="Navigation"
              title="Search, shortcuts, and titles"
              body="The shell is route-aware. Browser titles, page titles, sidebar active state, and command palette results change with the current dashboard section."
            />
            <div className="grid gap-4 md:grid-cols-3">
              <FeatureCard
                item={{
                  icon: Search,
                  title: "Google-style ticker search",
                  body: "The top search selects valid loaded tickers. Invalid input shows No report found instead of loading a fake report.",
                }}
              />
              <FeatureCard
                item={{
                  icon: Command,
                  title: "Command palette",
                  body: "Open it with Cmd/Ctrl K or the bottom-right command button, search destinations, press Enter, or use Ctrl plus each section key.",
                }}
              />
              <FeatureCard
                item={{
                  icon: FileText,
                  title: "Dynamic titles",
                  body: "Dashboard titles update by route and ticker, so the page never feels like one static screen.",
                }}
              />
            </div>
          </section>

          <section className="space-y-5">
            <SectionHeading
              id="chat"
              icon={Bot}
              eyebrow="LLM assistant"
              title="Groq powered Chat"
              body="Chat is now a first-class dashboard section in the left navbar, designed like a focused conversation workspace rather than a floating side widget."
            />
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-lg border border-white/10 bg-card/70 p-5">
                <h3 className="font-semibold">How it works</h3>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />Frontend sends recent chat messages to /api/v1/llm-chat.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />FastAPI reads GROQ_API_KEY from backend/.env.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />Groq is called through the OpenAI-compatible chat completions endpoint.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />The API key is never bundled into browser JavaScript.</li>
                </ul>
              </div>
              <div className="rounded-lg border border-white/10 bg-background/60 p-5">
                <h3 className="font-semibold">Environment</h3>
                <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-xs text-muted-foreground">{`# backend/.env
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile`}</pre>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Restart the backend after changing environment variables. If Chat returns an API error, check the backend logs and key validity.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <SectionHeading
              id="backend"
              icon={Wrench}
              eyebrow="Developer reference"
              title="Data, backend, and APIs"
              body="KingStop uses Vite, React 18, TypeScript, Tailwind, Axios, FastAPI, SQLAlchemy, SQLite, yfinance, and optional Stripe/Groq integrations."
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {backendCards.map((item) => <FeatureCard key={item.title} item={item} />)}
            </div>

            <div className="overflow-hidden rounded-lg border border-white/10 bg-card/70">
              <div className="border-b border-white/10 p-5">
                <h3 className="text-lg font-semibold">Useful API calls</h3>
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
            </div>
          </section>

          <section className="space-y-5 pb-8">
            <SectionHeading
              id="troubleshooting"
              icon={ShieldCheck}
              eyebrow="Support"
              title="Troubleshooting checklist"
              body="Use this section when a route, backend feature, or search result does not behave as expected during local testing."
            />
            <div className="grid gap-3">
              {troubleshooting.map(([title, body]) => (
                <div key={title} className="rounded-lg border border-white/10 bg-card/70 p-4">
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
