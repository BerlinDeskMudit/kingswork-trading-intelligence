import { useEffect, useState } from "react"
import axios from "axios"
import { ChevronDown, ChevronUp, Plus } from "lucide-react"

const api = axios.create({ baseURL: "/api/v1" })
api.interceptors.request.use((c) => {
  const t = localStorage.getItem("kingstop_token")
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
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

const emptyTradeDraft: TradeDraft = { ticker: "", side: "BUY", quantity: "", price: "" }

export default function MultiPortfolioPanel() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [detail, setDetail] = useState<Record<number, Portfolio>>({})
  const [newName, setNewName] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [trade, setTrade] = useState<Record<number, TradeDraft>>({})

  const load = () => api.get("/portfolio/portfolios").then((r) => setPortfolios(r.data.portfolios || r.data || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const loadDetail = (id: number) => {
    api.get(`/portfolio/portfolios/${id}`).then((r) => setDetail((d) => ({ ...d, [id]: r.data.portfolio || r.data }))).catch(() => {})
  }

  const toggle = (id: number) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    loadDetail(id)
  }

  const createPortfolio = async () => {
    if (!newName.trim()) return
    await api.post("/portfolio/portfolios", { name: newName.trim(), initial_cash: 100000 }).catch(() => {})
    setNewName("")
    setShowNew(false)
    load()
  }

  const execTrade = async (id: number) => {
    const t = trade[id]
    if (!t?.ticker || !t?.quantity || !t?.price) return
    await api.post(`/portfolio/portfolios/${id}/trade`, {
      ticker: t.ticker.toUpperCase(),
      side: t.side || "BUY",
      quantity: parseFloat(t.quantity),
      price: parseFloat(t.price),
    }).catch(() => {})
    setTrade((prev) => ({ ...prev, [id]: emptyTradeDraft }))
    loadDetail(id)
    load()
  }

  const setTradeField = (id: number, field: keyof TradeDraft, val: string) =>
    setTrade((prev) => {
      const current = prev[id] ?? emptyTradeDraft
      return { ...prev, [id]: { ...current, [field]: val } }
    })

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Portfolios</h2>
        <button onClick={() => setShowNew((v) => !v)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm">
          <Plus size={14} /> New Portfolio
        </button>
      </div>

      {showNew && (
        <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <input
            className="border rounded px-2 py-1 text-sm flex-1 dark:bg-gray-700 dark:border-gray-600"
            placeholder="Portfolio name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createPortfolio()}
          />
          <button onClick={createPortfolio} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">Create</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {portfolios.map((p) => (
          <div key={p.id} className="border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
            <button onClick={() => toggle(p.id)} className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-750">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${p.is_paper ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                    {p.is_paper ? "Paper" : "Live"}
                  </span>
                </div>
                {expanded === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                <span>Value: <span className="font-medium text-gray-900 dark:text-gray-100">${p.total_value?.toLocaleString()}</span></span>
                <span>Cash: <span className="font-medium text-gray-900 dark:text-gray-100">${p.cash?.toLocaleString()}</span></span>
                <span>Positions: <span className="font-medium text-gray-900 dark:text-gray-100">{detail[p.id]?.positions?.length ?? "—"}</span></span>
              </div>
            </button>

            {expanded === p.id && detail[p.id] && (
              <div className="border-t dark:border-gray-700 p-3 space-y-3">
                {/* Positions table */}
                {detail[p.id].positions && detail[p.id].positions!.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b dark:border-gray-700">
                          <th className="text-left pb-1">Ticker</th>
                          <th className="text-right pb-1">Qty</th>
                          <th className="text-right pb-1">Entry</th>
                          <th className="text-right pb-1">Current</th>
                          <th className="text-right pb-1">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail[p.id].positions!.map((pos) => (
                          <tr key={pos.ticker} className="border-b dark:border-gray-700 last:border-0">
                            <td className="py-1 font-medium">{pos.ticker}</td>
                            <td className="py-1 text-right">{pos.quantity}</td>
                            <td className="py-1 text-right">${pos.avg_entry_price?.toFixed(2)}</td>
                            <td className="py-1 text-right">${pos.current_price?.toFixed(2)}</td>
                            <td className={`py-1 text-right font-medium ${pos.unrealized_pnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                              ${pos.unrealized_pnl?.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No open positions</p>
                )}

                {/* Trade form */}
                <div className="flex flex-wrap gap-1.5 items-end pt-1">
                  <input
                    className="border rounded px-2 py-1 text-xs w-16 uppercase dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Ticker"
                    value={trade[p.id]?.ticker ?? ""}
                    onChange={(e) => setTradeField(p.id, "ticker", e.target.value)}
                  />
                  <select
                    className="border rounded px-2 py-1 text-xs dark:bg-gray-700 dark:border-gray-600"
                    value={trade[p.id]?.side ?? "BUY"}
                    onChange={(e) => setTradeField(p.id, "side", e.target.value)}
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 text-xs w-16 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Qty"
                    value={trade[p.id]?.quantity ?? ""}
                    onChange={(e) => setTradeField(p.id, "quantity", e.target.value)}
                  />
                  <input
                    type="number"
                    step="0.01"
                    className="border rounded px-2 py-1 text-xs w-20 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Price"
                    value={trade[p.id]?.price ?? ""}
                    onChange={(e) => setTradeField(p.id, "price", e.target.value)}
                  />
                  <button
                    onClick={() => execTrade(p.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                  >
                    Trade
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {portfolios.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="font-medium text-gray-900 dark:text-gray-100">No portfolios yet.</p>
            <p className="mt-1 text-gray-500 dark:text-gray-400">Create a paper portfolio to place your first trade and track performance.</p>
            <button onClick={() => setShowNew(true)} className="mt-4 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
              Create first portfolio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
