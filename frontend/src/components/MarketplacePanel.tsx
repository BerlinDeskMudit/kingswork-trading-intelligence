import { useEffect, useState } from "react"
import { PlusCircle, ShoppingCart } from "lucide-react"
import { buyStrategy, getMarketplaceStrategies, getMyPurchased, publishStrategy } from "@/services/api.ts"
import { cn } from "@/lib/utils"

const demoStrategies = [
  {
    id: -201,
    name: "Opening Range Momentum",
    description: "Tracks high-volume breakouts after the first 30 minutes and filters weak continuation setups.",
    price_usd: 9.99,
    is_free: false,
    total_sales: 42,
    author: "Test Trader",
  },
  {
    id: -202,
    name: "RSI Reversion Watchlist",
    description: "Scans large caps for oversold bounces with simple risk bands and confirmation levels.",
    price_usd: 0,
    is_free: true,
    total_sales: 128,
    author: "KingStop Lab",
  },
  {
    id: -203,
    name: "Earnings Drift Filter",
    description: "Ranks post-earnings drift candidates by gap quality, volume, and institutional follow-through.",
    price_usd: 14.99,
    is_free: false,
    total_sales: 27,
    author: "Market Desk",
  },
]

function normalizeStrategies(payload: any): any[] {
  const rows = Array.isArray(payload?.strategies) ? payload.strategies : Array.isArray(payload) ? payload : []
  return rows.length ? rows : demoStrategies
}

function normalizePurchased(payload: any): number[] {
  const rows = Array.isArray(payload?.purchased) ? payload.purchased : Array.isArray(payload) ? payload : []
  return rows.map((item: any) => item.strategy_id).filter((id: any) => typeof id === "number")
}

export default function MarketplacePanel() {
  const [strategies, setStrategies] = useState<any[]>(demoStrategies)
  const [purchased, setPurchased] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<Record<number, string>>({})
  const [showPublish, setShowPublish] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", signal_logic: "", price_usd: "9.99", is_free: false })

  const refresh = () => {
    setLoading(true)
    Promise.allSettled([
      getMarketplaceStrategies().then((data) => setStrategies(normalizeStrategies(data))).catch(() => setStrategies(demoStrategies)),
      getMyPurchased().then((data) => setPurchased(normalizePurchased(data))).catch(() => setPurchased([])),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleBuy = async (id: number) => {
    if (id < 0) {
      setPurchased((current) => [...new Set([...current, id])])
      setMsg((current) => ({ ...current, [id]: "Purchased with sample paper cash." }))
      return
    }

    try {
      const res = await buyStrategy(id)
      setMsg((current) => ({ ...current, [id]: `Purchased. Spent ${res.paper_cash_spent} paper cash.` }))
      refresh()
    } catch (error: any) {
      setMsg((current) => ({ ...current, [id]: error?.response?.data?.detail || "Purchase failed." }))
    }
  }

  const handlePublish = async () => {
    if (!form.name || !form.signal_logic) return
    const created = await publishStrategy({ ...form, price_usd: parseFloat(form.price_usd) || 0 }).catch(() => null)
    if (!created) {
      setStrategies((current) => [
        {
          id: Date.now(),
          name: form.name,
          description: form.description,
          price_usd: parseFloat(form.price_usd) || 0,
          is_free: form.is_free,
          total_sales: 0,
          author: "Test User",
        },
        ...current,
      ])
    }
    setShowPublish(false)
    setForm({ name: "", description: "", signal_logic: "", price_usd: "9.99", is_free: false })
    if (created) refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{strategies.length} strategies available</span>
        <button
          onClick={() => setShowPublish((current) => !current)}
          className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
        >
          <PlusCircle className="h-3.5 w-3.5" /> Publish Strategy
        </button>
      </div>

      {showPublish && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-background/60 p-4">
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Strategy name"
            className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Description"
            className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            value={form.signal_logic}
            onChange={(event) => setForm((current) => ({ ...current, signal_logic: event.target.value }))}
            placeholder="Signal logic / rules..."
            rows={2}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex flex-wrap gap-2">
            <input
              value={form.price_usd}
              onChange={(event) => setForm((current) => ({ ...current, price_usd: event.target.value }))}
              placeholder="Price USD"
              type="number"
              className="h-8 w-24 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={form.is_free} onChange={(event) => setForm((current) => ({ ...current, is_free: event.target.checked }))} />
              Free
            </label>
            <button onClick={handlePublish} className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90">
              Publish
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {strategies.map((strategy: any) => (
            <div key={strategy.id} className="space-y-2 rounded-lg border border-white/10 bg-background/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{strategy.name}</p>
                  <p className="text-xs text-muted-foreground">by {strategy.author || "Anonymous"}</p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-xs", strategy.is_free ? "bg-market-up/15 text-market-up" : "bg-primary/20 text-primary")}>
                  {strategy.is_free ? "Free" : `$${strategy.price_usd}`}
                </span>
              </div>
              {strategy.description ? <p className="text-xs leading-5 text-muted-foreground">{strategy.description}</p> : null}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{strategy.total_sales || 0} sales</span>
                {purchased.includes(strategy.id) ? (
                  <span className="text-xs text-market-up">Owned</span>
                ) : (
                  <button
                    onClick={() => handleBuy(strategy.id)}
                    className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-xs text-primary-foreground hover:bg-primary/90"
                  >
                    <ShoppingCart className="h-3 w-3" /> Buy
                  </button>
                )}
              </div>
              {msg[strategy.id] ? <p className="text-xs text-muted-foreground">{msg[strategy.id]}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
