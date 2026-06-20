import { useEffect, useState } from "react"
import axios from "axios"
import { Save, TrendingDown, TrendingUp } from "lucide-react"

interface TradePlan {
  id?: number
  ticker: string
  entry: number
  target: number
  stopLoss: number
  quantity: number
  accountSize: number
  riskPct: number
}

const demoForm: TradePlan = {
  ticker: "NVDA",
  entry: 824,
  target: 872,
  stopLoss: 798,
  quantity: 12,
  accountSize: 100000,
  riskPct: 2,
}

const demoPlans: TradePlan[] = [
  { id: -1, ticker: "AAPL", entry: 218, target: 232, stopLoss: 210, quantity: 25, accountSize: 100000, riskPct: 2 },
  { id: -2, ticker: "MSFT", entry: 449, target: 476, stopLoss: 438, quantity: 10, accountSize: 100000, riskPct: 1.5 },
]

const numberValue = (value: string) => Number.parseFloat(value) || 0

function authHeaders() {
  const token = localStorage.getItem("kingstop_token")
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
}

function normalizePlans(payload: unknown): TradePlan[] {
  const rows = Array.isArray(payload) ? payload : Array.isArray((payload as { plans?: unknown })?.plans) ? (payload as { plans: unknown[] }).plans : []
  const plans = rows
    .map((item) => {
      const row = item as Partial<TradePlan>
      return {
        id: row.id,
        ticker: String(row.ticker || "").toUpperCase(),
        entry: Number(row.entry || 0),
        target: Number(row.target || 0),
        stopLoss: Number(row.stopLoss || 0),
        quantity: Number(row.quantity || 0),
        accountSize: Number(row.accountSize || 100000),
        riskPct: Number(row.riskPct || 2),
      }
    })
    .filter((plan) => plan.ticker)

  return plans.length ? plans : demoPlans
}

export default function TradePlanCalculator() {
  const [form, setForm] = useState<TradePlan>(demoForm)
  const [saved, setSaved] = useState<TradePlan[]>(demoPlans)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const setField = (key: keyof TradePlan, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: key === "ticker" ? value.toUpperCase() : numberValue(value),
    }))
  }

  const { entry, target, stopLoss, quantity, accountSize, riskPct } = form
  const rrValue = entry && stopLoss && entry !== stopLoss ? (target - entry) / Math.abs(entry - stopLoss) : null
  const riskAmount = (accountSize * riskPct) / 100
  const suggestedQty = entry && stopLoss && entry !== stopLoss ? Math.floor(riskAmount / Math.abs(entry - stopLoss)) : null
  const potentialProfit = (target - entry) * quantity
  const potentialLoss = Math.abs(entry - stopLoss) * quantity

  const fetchPlans = () =>
    axios
      .get("/api/v1/trading-tools/trade-plan", authHeaders())
      .then((response) => {
        setSaved(normalizePlans(response.data))
        setNotice(null)
      })
      .catch(() => {
        setSaved(demoPlans)
        setNotice("Showing sample saved plans until the trading-tools API is available.")
      })

  useEffect(() => {
    void fetchPlans()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await axios.post("/api/v1/trading-tools/trade-plan", form, authHeaders())
      await fetchPlans()
    } catch {
      setSaved((current) => [{ ...form, id: Date.now() }, ...current.filter((plan) => plan.id !== -1 && plan.id !== -2)])
      setNotice("Saved locally for this session. Connect the API to persist trade plans.")
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof TradePlan, placeholder = "") => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={key === "ticker" ? "text" : "number"}
        value={form[key] as string | number}
        onChange={(event) => setField(key, event.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
      />
    </div>
  )

  const stat = (label: string, value: string, color = "text-foreground") => (
    <div className="flex justify-between border-b border-white/10 py-1 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  )

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-card/70 p-4 shadow-ink">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Trade Plan Calculator</h2>
        {notice ? <p className="mt-1 text-xs text-primary">{notice}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {field("Ticker", "ticker", "e.g. NVDA")}
        {field("Entry Price", "entry")}
        {field("Target Price", "target")}
        {field("Stop Loss", "stopLoss")}
        {field("Quantity", "quantity")}
        {field("Account Size", "accountSize")}
        {field("Risk % per Trade", "riskPct")}
      </div>

      <div className="space-y-0.5 rounded-lg border border-white/10 bg-background/60 p-3">
        {stat("Risk/Reward Ratio", rrValue === null ? "n/a" : rrValue.toFixed(2), rrValue !== null && rrValue >= 2 ? "text-market-up" : "text-primary")}
        {stat("Risk Amount", `$${riskAmount.toFixed(2)}`)}
        {stat("Suggested Qty", suggestedQty === null ? "n/a" : String(suggestedQty))}
        {stat("Potential Profit", `$${potentialProfit.toFixed(2)}`, "text-market-up")}
        {stat("Potential Loss", `$${potentialLoss.toFixed(2)}`, "text-market-down")}
        {stat("Breakeven", entry ? `$${entry.toFixed(2)}` : "n/a")}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !form.ticker}
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        <Save size={15} /> {saving ? "Saving..." : "Save Plan"}
      </button>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Saved Plans</h3>
        {saved.map((plan, index) => (
          <div key={plan.id ?? index} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm">
            <span className="w-24 font-semibold text-primary">{plan.ticker}</span>
            <span className="text-muted-foreground">Entry: ${plan.entry}</span>
            <span className="flex items-center gap-1 text-market-up">
              <TrendingUp size={13} />${plan.target}
            </span>
            <span className="flex items-center gap-1 text-market-down">
              <TrendingDown size={13} />${plan.stopLoss}
            </span>
            <span className="text-muted-foreground">Qty: {plan.quantity}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
