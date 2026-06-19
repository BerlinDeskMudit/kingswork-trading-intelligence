import { useEffect, useState } from "react"
import axios from "axios"
import { CheckCircle, Trash2, Plus } from "lucide-react"

const api = axios.create({ baseURL: "/api/v1" })
api.interceptors.request.use((c) => {
  const t = localStorage.getItem("kingstop_token")
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})

interface PriceTarget {
  id: number
  ticker: string
  direction: "ABOVE" | "BELOW"
  target_price: number
  current_price: number
  note?: string
  hit: boolean
}

const distancePct = (current: number, target: number) =>
  Math.abs(((current - target) / target) * 100)

export default function PriceTargetTracker() {
  const [targets, setTargets] = useState<PriceTarget[]>([])
  const [form, setForm] = useState({ ticker: "", target_price: "", direction: "ABOVE", note: "" })
  const [loading, setLoading] = useState(false)

  const load = () => api.get("/price-targets").then((r) => setTargets(r.data)).catch(() => {})

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ticker || !form.target_price) return
    setLoading(true)
    await api.post("/price-targets", {
      ticker: form.ticker.toUpperCase(),
      target_price: parseFloat(form.target_price),
      direction: form.direction,
      note: form.note || undefined,
    }).catch(() => {})
    setForm({ ticker: "", target_price: "", direction: "ABOVE", note: "" })
    setLoading(false)
    load()
  }

  const handleDelete = async (id: number) => {
    await api.delete(`/price-targets/${id}`).catch(() => {})
    load()
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Price Target Tracker</h2>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Ticker</label>
          <input
            className="border rounded px-2 py-1 text-sm w-24 uppercase dark:bg-gray-700 dark:border-gray-600"
            placeholder="AAPL"
            value={form.ticker}
            onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Target Price</label>
          <input
            type="number"
            step="0.01"
            className="border rounded px-2 py-1 text-sm w-28 dark:bg-gray-700 dark:border-gray-600"
            placeholder="150.00"
            value={form.target_price}
            onChange={(e) => setForm((f) => ({ ...f, target_price: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Direction</label>
          <select
            className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
            value={form.direction}
            onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))}
          >
            <option value="ABOVE">ABOVE</option>
            <option value="BELOW">BELOW</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-500">Note</label>
          <input
            className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
            placeholder="Optional note"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm"
        >
          <Plus size={14} /> Add
        </button>
      </form>

      {/* Target cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {targets.map((t) => {
          const dist = distancePct(t.current_price, t.target_price)
          const barWidth = Math.min(dist, 100)
          const hit = t.hit
          return (
            <div key={t.id} className="border rounded-lg p-3 space-y-2 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{t.ticker}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${t.direction === "ABOVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {t.direction}
                  </span>
                  {hit && <CheckCircle size={14} className="text-green-500" />}
                </div>
                <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex justify-between text-xs text-gray-500">
                <span>Target: <span className="font-medium text-gray-900 dark:text-gray-100">${t.target_price.toFixed(2)}</span></span>
                <span>Current: <span className="font-medium text-gray-900 dark:text-gray-100">${t.current_price?.toFixed(2) ?? "—"}</span></span>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Distance</span>
                  <span>{dist.toFixed(2)}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${hit ? "bg-green-500" : t.direction === "ABOVE" ? "bg-blue-500" : "bg-red-500"}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>

              {t.note && <p className="text-xs text-gray-400 italic">{t.note}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
