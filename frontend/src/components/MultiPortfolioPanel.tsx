import { useEffect, useState } from "react"
import axios from "axios"
import { ChevronDown, ChevronUp, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const api = axios.create({ baseURL: "/api/v1" })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kingstop_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

interface Portfolio {
  id: number
  name: string
  total_value: number
  cash: number
  is_paper: boolean
  positions?: Position[]
}

interface Position {
  ticker: string
  quantity: number
  avg_entry_price: number
  current_price: number
  unrealized_pnl: number
  value?: number
}

interface TradeDraft {
  ticker: string
  side: string
  quantity: string
  price: string
}

const demoPortfolios: Portfolio[] = [
  {
    id: -301,
    name: "Test Growth Portfolio",
    total_value: 104825,
    cash: 61250,
    is_paper: true,
    positions: [
      { ticker: "NVDA", quantity: 18, avg_entry_price: 798, current_price: 824.15, unrealized_pnl: 470.7, value: 14834.7 },
      { ticker: "AAPL", quantity: 60, avg_entry_price: 211, current_price: 218.45, unrealized_pnl: 447, value: 13107 },
      { ticker: "MSFT", quantity: 35, avg_entry_price: 438, current_price: 449.2, unrealized_pnl: 392, value: 15722 },
    ],
  },
  {
    id: -302,
    name: "Income Watchlist",
    total_value: 100940,
    cash: 78200,
    is_paper: true,
    positions: [
      { ticker: "JPM", quantity: 55, avg_entry_price: 198, current_price: 202.14, unrealized_pnl: 227.7, value: 11117.7 },
      { ticker: "JNJ", quantity: 70, avg_entry_price: 158, current_price: 166.04, unrealized_pnl: 562.8, value: 11622.8 },
    ],
  },
]

const emptyTradeDraft: TradeDraft = { ticker: "", side: "BUY", quantity: "", price: "" }

function normalizePortfolios(payload: any): Portfolio[] {
  const rows = Array.isArray(payload?.portfolios) ? payload.portfolios : Array.isArray(payload) ? payload : []
  return rows.length ? rows : demoPortfolios
}

export default function MultiPortfolioPanel({ onTradeExecuted }: { onTradeExecuted?: () => void }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(demoPortfolios)
  const [expanded, setExpanded] = useState<number | null>(demoPortfolios[0].id)
  const [detail, setDetail] = useState<Record<number, Portfolio>>({ [demoPortfolios[0].id]: demoPortfolios[0] })
  const [newName, setNewName] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [trade, setTrade] = useState<Record<number, TradeDraft>>({})

  const load = () =>
    api
      .get("/portfolio/portfolios")
      .then((response) => {
        const next = normalizePortfolios(response.data)
        setPortfolios(next)
        if (!expanded && next.length) setExpanded(next[0].id)
        if (next.length) {
          setDetail((current) => ({ ...current, [next[0].id]: next[0] }))
        }
      })
      .catch(() => setPortfolios(demoPortfolios))

  useEffect(() => {
    load()
  }, [])

  const loadDetail = (id: number) => {
    const demo = demoPortfolios.find((portfolio) => portfolio.id === id)
    if (demo) {
      setDetail((current) => ({ ...current, [id]: demo }))
      return
    }

    api
      .get(`/portfolio/portfolios/${id}`)
      .then((response) => setDetail((current) => ({ ...current, [id]: response.data.portfolio || response.data })))
      .catch(() => undefined)
  }

  const toggle = (id: number) => {
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    loadDetail(id)
  }

  const createPortfolio = async () => {
    if (!newName.trim()) return
    const created = await api.post("/portfolio/portfolios", { name: newName.trim(), initial_cash: 100000 }).catch(() => null)
    if (!created) {
      const portfolio = { ...demoPortfolios[0], id: Date.now(), name: newName.trim(), positions: [] }
      setPortfolios((current) => [portfolio, ...current])
      setDetail((current) => ({ ...current, [portfolio.id]: portfolio }))
    }
    setNewName("")
    setShowNew(false)
    if (created) load()
  }

  const execTrade = async (id: number) => {
    const draft = trade[id]
    if (!draft?.ticker || !draft?.quantity || !draft?.price) return
    if (id < 0) {
      const quantity = parseFloat(draft.quantity)
      const price = parseFloat(draft.price)
      const nextPosition = {
        ticker: draft.ticker.toUpperCase(),
        quantity,
        avg_entry_price: price,
        current_price: price,
        unrealized_pnl: 0,
        value: quantity * price,
      }
      setDetail((current) => {
        const existing = current[id] || portfolios.find((portfolio) => portfolio.id === id)
        if (!existing) return current
        return {
          ...current,
          [id]: {
            ...existing,
            positions: [nextPosition, ...(existing.positions || [])],
            cash: existing.cash - quantity * price,
            total_value: existing.total_value,
          },
        }
      })
      setTrade((current) => ({ ...current, [id]: emptyTradeDraft }))
      onTradeExecuted?.()
      return
    }

    try {
      await api.post(`/portfolio/portfolios/${id}/trade`, {
        ticker: draft.ticker.toUpperCase(),
        side: draft.side || "BUY",
        quantity: parseFloat(draft.quantity),
        price: parseFloat(draft.price),
      })
      onTradeExecuted?.()
    } catch {
      return
    }
    setTrade((current) => ({ ...current, [id]: emptyTradeDraft }))
    loadDetail(id)
    load()
  }

  const setTradeField = (id: number, field: keyof TradeDraft, value: string) =>
    setTrade((current) => {
      const draft = current[id] ?? emptyTradeDraft
      return { ...current, [id]: { ...draft, [field]: value } }
    })

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-card/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Portfolios</h2>
        <button onClick={() => setShowNew((value) => !value)} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
          <Plus size={14} /> New Portfolio
        </button>
      </div>

      {showNew && (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-background/60 p-3">
          <input
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Portfolio name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && createPortfolio()}
          />
          <button onClick={createPortfolio} className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90">
            Create
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {portfolios.map((portfolio) => {
          const open = expanded === portfolio.id
          const currentDetail = detail[portfolio.id] || portfolio
          return (
            <div key={portfolio.id} className="overflow-hidden rounded-lg border border-white/10 bg-background/60">
              <button onClick={() => toggle(portfolio.id)} className="w-full p-3 text-left transition-colors hover:bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{portfolio.name}</span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{portfolio.is_paper ? "Paper" : "Live"}</span>
                  </div>
                  {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Value: <span className="font-medium text-foreground">${portfolio.total_value?.toLocaleString()}</span>
                  </span>
                  <span>
                    Cash: <span className="font-medium text-foreground">${portfolio.cash?.toLocaleString()}</span>
                  </span>
                  <span>
                    Positions: <span className="font-medium text-foreground">{currentDetail.positions?.length ?? 0}</span>
                  </span>
                </div>
              </button>

              {open && (
                <div className="space-y-3 border-t border-white/10 p-3">
                  {currentDetail.positions?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/10 text-muted-foreground">
                            <th className="pb-1 text-left">Ticker</th>
                            <th className="pb-1 text-right">Qty</th>
                            <th className="pb-1 text-right">Entry</th>
                            <th className="pb-1 text-right">Current</th>
                            <th className="pb-1 text-right">P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentDetail.positions.map((position) => (
                            <tr key={position.ticker} className="border-b border-white/10 last:border-0">
                              <td className="py-1 font-medium">{position.ticker}</td>
                              <td className="py-1 text-right">{position.quantity}</td>
                              <td className="py-1 text-right">${position.avg_entry_price?.toFixed(2)}</td>
                              <td className="py-1 text-right">${position.current_price?.toFixed(2)}</td>
                              <td className={cn("py-1 text-right font-medium", position.unrealized_pnl >= 0 ? "text-market-up" : "text-market-down")}>
                                ${position.unrealized_pnl?.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No open positions</p>
                  )}

                  <div className="flex flex-wrap items-end gap-1.5 pt-1">
                    <input
                      className="h-8 w-20 rounded-md border border-input bg-background px-2 text-xs uppercase outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Ticker"
                      value={trade[portfolio.id]?.ticker ?? ""}
                      onChange={(event) => setTradeField(portfolio.id, "ticker", event.target.value)}
                    />
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                      value={trade[portfolio.id]?.side ?? "BUY"}
                      onChange={(event) => setTradeField(portfolio.id, "side", event.target.value)}
                    >
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                    </select>
                    <input
                      type="number"
                      className="h-8 w-16 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Qty"
                      value={trade[portfolio.id]?.quantity ?? ""}
                      onChange={(event) => setTradeField(portfolio.id, "quantity", event.target.value)}
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="h-8 w-20 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Price"
                      value={trade[portfolio.id]?.price ?? ""}
                      onChange={(event) => setTradeField(portfolio.id, "price", event.target.value)}
                    />
                    <button onClick={() => execTrade(portfolio.id)} className="h-8 rounded-md bg-primary px-2 text-xs text-primary-foreground hover:bg-primary/90">
                      Trade
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
