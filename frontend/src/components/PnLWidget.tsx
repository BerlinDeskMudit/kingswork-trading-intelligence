import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"
import { getPnLHistory, getWallet } from "@/services/api.ts"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"

export default function PnLWidget({ portfolioId }: { portfolioId?: number }) {
  const [curve, setCurve] = useState<any[]>([])
  const [wallet, setWallet] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      getWallet().then((d) => setWallet(d.wallet)),
      portfolioId
        ? getPnLHistory(portfolioId).then((d) => setCurve(d.pnl_history || []))
        : Promise.resolve(),
    ]).finally(() => setLoading(false))
  }, [portfolioId])

  const latestPnl = curve.length ? curve[curve.length - 1].pnl : 0
  const up = latestPnl >= 0

  const unrealizedPnl = wallet?.positions?.reduce(
    (sum: number, p: any) => sum + (p.unrealized_pnl || 0),
    0
  ) ?? 0

  const totalValue = wallet?.total_value ?? 0
  const initialCash = 100000
  const totalPnlPct = ((totalValue - initialCash) / initialCash) * 100

  return (
    <div className="rounded-lg border border-white/10 bg-card/70 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">Real-time P&L</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/10 bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Portfolio Value</p>
          <p className="mt-1 text-lg font-bold">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Unrealized P&L</p>
          <p className={cn("mt-1 text-lg font-bold", unrealizedPnl >= 0 ? "text-green-400" : "text-red-400")}>
            {unrealizedPnl >= 0 ? "+" : ""}${unrealizedPnl.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Total Return</p>
          <p className={cn("mt-1 text-lg font-bold flex items-center gap-1", up ? "text-green-400" : "text-red-400")}>
            {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%
          </p>
        </div>
      </div>

      {curve.length > 1 ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={up ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={up ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                formatter={(v: number) => [`$${v.toFixed(2)}`, "P&L"]}
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke={up ? "#22c55e" : "#ef4444"}
                fill="url(#pnlGradient)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Loading P&L data...</p>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">Make trades to see P&L chart.</p>
      )}

      {wallet?.positions?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Open Positions</p>
          <div className="space-y-1">
            {wallet.positions.map((p: any) => (
              <div key={p.ticker} className="flex justify-between text-sm">
                <span className="font-medium">{p.ticker} <span className="text-muted-foreground text-xs">×{p.quantity}</span></span>
                <span className={cn("font-mono", (p.unrealized_pnl ?? 0) >= 0 ? "text-green-400" : "text-red-400")}>
                  {(p.unrealized_pnl ?? 0) >= 0 ? "+" : ""}${(p.unrealized_pnl ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
