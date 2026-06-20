import { FormEvent, useEffect, useState } from "react"
import axios from "axios"
import { CheckCircle, Plus, Trash2 } from "lucide-react"
import { cn, formatPrice } from "@/lib/utils"

const api = axios.create({ baseURL: "/api/v1" })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kingstop_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
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

const demoTargets: PriceTarget[] = [
  {
    id: -201,
    ticker: "NVDA",
    direction: "ABOVE",
    target_price: 850,
    current_price: 824.15,
    note: "Momentum target if volume confirms the breakout.",
    hit: false,
  },
  {
    id: -202,
    ticker: "RELIANCE.BO",
    direction: "ABOVE",
    target_price: 3025,
    current_price: 2988.4,
    note: "Watch for close above prior resistance.",
    hit: false,
  },
  {
    id: -203,
    ticker: "TSLA",
    direction: "BELOW",
    target_price: 235,
    current_price: 245.6,
    note: "Alert if weakness extends below support.",
    hit: false,
  },
]

const emptyForm = { ticker: "", target_price: "", direction: "ABOVE" as PriceTarget["direction"], note: "" }

function normalizeTargets(payload: any): PriceTarget[] {
  const rows = Array.isArray(payload?.targets) ? payload.targets : Array.isArray(payload) ? payload : []
  return rows.length ? rows : demoTargets
}

function distancePct(current: number, target: number) {
  if (!target) return 0
  return Math.abs(((current - target) / target) * 100)
}

export default function PriceTargetTracker() {
  const [targets, setTargets] = useState<PriceTarget[]>(demoTargets)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)

  const load = () =>
    api
      .get("/price-targets")
      .then((response) => setTargets(normalizeTargets(response.data)))
      .catch(() => setTargets(demoTargets))

  useEffect(() => {
    load()
  }, [])

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    const targetPrice = parseFloat(form.target_price)
    if (!form.ticker || !Number.isFinite(targetPrice) || targetPrice <= 0) return

    setLoading(true)
    const fallbackTarget: PriceTarget = {
      id: Date.now(),
      ticker: form.ticker.toUpperCase(),
      target_price: targetPrice,
      current_price: form.direction === "ABOVE" ? targetPrice * 0.96 : targetPrice * 1.04,
      direction: form.direction,
      note: form.note || undefined,
      hit: false,
    }

    try {
      await api.post("/price-targets", {
        ticker: fallbackTarget.ticker,
        target_price: fallbackTarget.target_price,
        direction: fallbackTarget.direction,
        note: fallbackTarget.note,
      })
      load()
    } catch {
      setTargets((current) => [fallbackTarget, ...current])
    } finally {
      setForm(emptyForm)
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (id > 0) await api.delete(`/price-targets/${id}`).catch(() => undefined)
    setTargets((current) => current.filter((target) => target.id !== id))
  }

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-card/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Price Target Tracker</h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Demo ready</span>
      </div>

      <form onSubmit={handleAdd} className="grid gap-2 rounded-lg border border-white/10 bg-background/60 p-3 sm:grid-cols-2 xl:grid-cols-[0.7fr_0.8fr_0.7fr_1fr_auto]">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Ticker</span>
          <input
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm uppercase outline-none focus:ring-2 focus:ring-ring"
            placeholder="AAPL"
            value={form.ticker}
            onChange={(event) => setForm((current) => ({ ...current, ticker: event.target.value.toUpperCase() }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Target Price</span>
          <input
            type="number"
            step="0.01"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="150.00"
            value={form.target_price}
            onChange={(event) => setForm((current) => ({ ...current, target_price: event.target.value }))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Direction</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={form.direction}
            onChange={(event) => setForm((current) => ({ ...current, direction: event.target.value as PriceTarget["direction"] }))}
          >
            <option value="ABOVE">ABOVE</option>
            <option value="BELOW">BELOW</option>
          </select>
        </label>
        <label className="space-y-1 sm:col-span-2 xl:col-span-1">
          <span className="text-xs text-muted-foreground">Note</span>
          <input
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Optional note"
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex h-9 items-center justify-center gap-1 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2 xl:col-span-1"
        >
          <Plus size={14} /> Add
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {targets.map((target) => {
          const dist = distancePct(target.current_price, target.target_price)
          const hit = target.hit
          return (
            <div key={target.id} className="space-y-3 rounded-lg border border-white/10 bg-background/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold">{target.ticker}</span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs font-medium",
                        target.direction === "ABOVE"
                          ? "border-market-up/25 bg-market-up/10 text-market-up"
                          : "border-market-down/25 bg-market-down/10 text-market-down",
                      )}
                    >
                      {target.direction}
                    </span>
                    {hit ? <CheckCircle size={14} className="text-market-up" /> : null}
                  </div>
                  {target.note ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{target.note}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(target.id)}
                  className="rounded-md p-1 text-muted-foreground transition hover:bg-market-down/10 hover:text-market-down"
                  title="Delete target"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted px-2 py-1">
                  <p className="text-muted-foreground">Target</p>
                  <p className="font-mono font-medium">{formatPrice(target.target_price)}</p>
                </div>
                <div className="rounded-md bg-muted px-2 py-1">
                  <p className="text-muted-foreground">Current</p>
                  <p className="font-mono font-medium">{formatPrice(target.current_price)}</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Distance</span>
                  <span>{dist.toFixed(2)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      hit ? "bg-market-up" : target.direction === "ABOVE" ? "bg-primary" : "bg-market-down",
                    )}
                    style={{ width: `${Math.min(dist, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
