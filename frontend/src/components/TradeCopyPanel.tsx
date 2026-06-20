import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { RefreshCw, UserMinus, UserPlus } from "lucide-react"
import { cn, formatPrice } from "@/lib/utils"

const api = axios.create({ baseURL: "/api/v1" })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kingstop_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

interface Following {
  id: number
  portfolio_id: number
  portfolio_name?: string
}

interface FeedTrade {
  id: number
  ticker: string
  side: "BUY" | "SELL"
  price: number
  quantity: number
  created_at: string
  portfolio_name?: string
}

const demoFollowing: Following[] = [
  { id: -701, portfolio_id: -301, portfolio_name: "Test Growth Portfolio" },
  { id: -702, portfolio_id: -302, portfolio_name: "Income Watchlist" },
]

const demoFeed: FeedTrade[] = [
  {
    id: -801,
    ticker: "NVDA",
    side: "BUY",
    price: 824.15,
    quantity: 3,
    created_at: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    portfolio_name: "Test Growth Portfolio",
  },
  {
    id: -802,
    ticker: "JPM",
    side: "BUY",
    price: 202.14,
    quantity: 8,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    portfolio_name: "Income Watchlist",
  },
  {
    id: -803,
    ticker: "TSLA",
    side: "SELL",
    price: 245.6,
    quantity: 2,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    portfolio_name: "Momentum Desk",
  },
]

function normalizeFollowing(payload: any): Following[] {
  const rows = Array.isArray(payload?.following) ? payload.following : Array.isArray(payload) ? payload : []
  return rows.length ? rows : demoFollowing
}

function normalizeFeed(payload: any): FeedTrade[] {
  const rows = Array.isArray(payload?.trades) ? payload.trades : Array.isArray(payload?.feed) ? payload.feed : Array.isArray(payload) ? payload : []
  return rows.length ? rows : demoFeed
}

export default function TradeCopyPanel() {
  const [following, setFollowing] = useState<Following[]>(demoFollowing)
  const [feed, setFeed] = useState<FeedTrade[]>(demoFeed)
  const [portfolioId, setPortfolioId] = useState("")

  const loadFollowing = () =>
    api
      .get("/trade-copy/following")
      .then((response) => setFollowing(normalizeFollowing(response.data)))
      .catch(() => setFollowing(demoFollowing))

  const loadFeed = useCallback(
    () =>
      api
        .get("/trade-copy/feed")
        .then((response) => setFeed(normalizeFeed(response.data)))
        .catch(() => setFeed(demoFeed)),
    [],
  )

  useEffect(() => {
    loadFollowing()
    loadFeed()
    const timer = window.setInterval(loadFeed, 30_000)
    return () => window.clearInterval(timer)
  }, [loadFeed])

  const follow = async () => {
    const parsedId = parseInt(portfolioId, 10)
    if (!Number.isFinite(parsedId)) return
    try {
      await api.post("/trade-copy/follow", { portfolio_id: parsedId })
      loadFollowing()
    } catch {
      setFollowing((current) => [
        { id: Date.now(), portfolio_id: parsedId, portfolio_name: `Portfolio #${parsedId}` },
        ...current,
      ])
    } finally {
      setPortfolioId("")
    }
  }

  const unfollow = async (id: number) => {
    if (id > 0) await api.delete(`/trade-copy/${id}`).catch(() => undefined)
    setFollowing((current) => current.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-5 rounded-lg border border-white/10 bg-card/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Trade Copy</h2>
        <button
          type="button"
          onClick={loadFeed}
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="Refresh copied trade feed"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-medium">Following</h3>
            <p className="text-xs text-muted-foreground">Copy ideas from demo and connected portfolios.</p>
          </div>
          <div className="flex gap-2">
            <input
              className="h-9 w-32 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
              placeholder="Portfolio ID"
              value={portfolioId}
              onChange={(event) => setPortfolioId(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void follow()}
            />
            <button
              type="button"
              onClick={follow}
              className="flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
            >
              <UserPlus size={12} /> Follow
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {following.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-background/60 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.portfolio_name ?? `Portfolio #${item.portfolio_id}`}</p>
                <p className="text-xs text-muted-foreground">ID {item.portfolio_id}</p>
              </div>
              <button
                type="button"
                onClick={() => void unfollow(item.id)}
                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-market-down transition hover:bg-market-down/10"
              >
                <UserMinus size={12} /> Unfollow
              </button>
            </div>
          ))}
          {!following.length ? <p className="rounded-lg border border-white/10 bg-background/60 p-3 text-xs text-muted-foreground">Not following any portfolios yet.</p> : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Trade Feed</h3>
            <p className="text-xs text-muted-foreground">Auto-refreshes every 30 seconds.</p>
          </div>
        </div>

        <div className="space-y-2">
          {feed.map((trade) => (
            <div key={trade.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm">
              <span className="w-16 font-mono font-semibold">{trade.ticker}</span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium",
                  trade.side === "BUY"
                    ? "border-market-up/25 bg-market-up/10 text-market-up"
                    : "border-market-down/25 bg-market-down/10 text-market-down",
                )}
              >
                {trade.side}
              </span>
              <span className="text-xs text-muted-foreground">x{trade.quantity}</span>
              <span className="font-mono text-xs">{formatPrice(trade.price)}</span>
              {trade.portfolio_name ? <span className="ml-auto text-xs text-muted-foreground">{trade.portfolio_name}</span> : null}
              <span className="text-xs text-muted-foreground">{new Date(trade.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
          {!feed.length ? <p className="rounded-lg border border-white/10 bg-background/60 p-3 text-xs text-muted-foreground">No recent copied trades.</p> : null}
        </div>
      </section>
    </div>
  )
}
