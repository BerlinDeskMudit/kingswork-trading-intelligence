import { useEffect, useState } from "react"
import { Sparkles, ShoppingCart, PlusCircle } from "lucide-react"
import { getMarketplaceStrategies, buyStrategy, publishStrategy, getMyPurchased } from "@/services/api.ts"
import { cn } from "@/lib/utils"

export default function MarketplacePanel() {
  const [strategies, setStrategies] = useState<any[]>([])
  const [purchased, setPurchased] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<Record<number, string>>({})
  const [showPublish, setShowPublish] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", signal_logic: "", price_usd: "9.99", is_free: false })

  const refresh = () => {
    setLoading(true)
    Promise.allSettled([
      getMarketplaceStrategies().then((d) => setStrategies(d.strategies || [])),
      getMyPurchased().then((d) => setPurchased((d.purchased || []).map((p: any) => p.strategy_id))),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const handleBuy = async (id: number) => {
    try {
      const res = await buyStrategy(id)
      setMsg((p) => ({ ...p, [id]: `✓ Purchased! Spent ${res.paper_cash_spent} paper cash` }))
      refresh()
    } catch (e: any) {
      setMsg((p) => ({ ...p, [id]: `✗ ${e?.response?.data?.detail || "Error"}` }))
    }
  }

  const handlePublish = async () => {
    if (!form.name || !form.signal_logic) return
    await publishStrategy({ ...form, price_usd: parseFloat(form.price_usd) || 0 }).catch(() => {})
    setShowPublish(false)
    setForm({ name: "", description: "", signal_logic: "", price_usd: "9.99", is_free: false })
    refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{strategies.length} strategies available</span>
        <button onClick={() => setShowPublish((p) => !p)}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90">
          <PlusCircle className="h-3.5 w-3.5" /> Publish Strategy
        </button>
      </div>

      {showPublish && (
        <div className="rounded-lg border border-white/10 bg-background/60 p-4 space-y-2">
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Strategy name" className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm outline-none" />
          <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description" className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm outline-none" />
          <textarea value={form.signal_logic} onChange={(e) => setForm((p) => ({ ...p, signal_logic: e.target.value }))}
            placeholder="Signal logic / rules..." rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none resize-none" />
          <div className="flex gap-2">
            <input value={form.price_usd} onChange={(e) => setForm((p) => ({ ...p, price_usd: e.target.value }))}
              placeholder="Price USD" type="number" className="h-8 w-24 rounded-md border border-input bg-background px-3 text-sm outline-none" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_free} onChange={(e) => setForm((p) => ({ ...p, is_free: e.target.checked }))} />
              Free
            </label>
            <button onClick={handlePublish} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90">Publish</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-sm text-center text-muted-foreground py-6">Loading...</p> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {strategies.map((s: any) => (
            <div key={s.id} className="rounded-lg border border-white/10 bg-background/60 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">by {s.author || "Anonymous"}</p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full", s.is_free ? "bg-green-500/20 text-green-400" : "bg-primary/20 text-primary")}>
                  {s.is_free ? "Free" : `$${s.price_usd}`}
                </span>
              </div>
              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.total_sales} sales</span>
                {purchased.includes(s.id) ? (
                  <span className="text-xs text-green-400">✓ Owned</span>
                ) : (
                  <button onClick={() => handleBuy(s.id)}
                    className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90">
                    <ShoppingCart className="h-3 w-3" /> Buy
                  </button>
                )}
              </div>
              {msg[s.id] && <p className="text-xs text-muted-foreground">{msg[s.id]}</p>}
            </div>
          ))}
          {!strategies.length && <p className="text-sm text-muted-foreground col-span-3 text-center py-6">No strategies yet. Publish the first one!</p>}
        </div>
      )}
    </div>
  )
}
