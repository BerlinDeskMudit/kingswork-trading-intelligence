import { useEffect, useState } from "react"
import { BarChart3, RefreshCw } from "lucide-react"
import { getOptionsChain } from "@/services/api.ts"
import { cn } from "@/lib/utils"

export default function OptionsChainPanel({ ticker }: { ticker: string }) {
  const [chain, setChain] = useState<any[]>([])
  const [spot, setSpot] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    getOptionsChain(ticker)
      .then((d) => { setChain(d.chain || []); setSpot(d.spot || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [ticker])

  return (
    <div className="rounded-lg border border-white/10 bg-card/70 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Options Chain — {ticker}</span>
          {spot > 0 && <span className="text-xs text-muted-foreground">Spot: ${spot.toFixed(2)}</span>}
        </div>
        <button onClick={load} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading options chain...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-y border-white/10 text-muted-foreground">
                <th className="px-3 py-2 text-left">Call Bid</th>
                <th className="px-3 py-2 text-left">Call Ask</th>
                <th className="px-3 py-2 text-left">Call IV</th>
                <th className="px-3 py-2 text-left">Call Δ</th>
                <th className="px-3 py-2 text-center font-bold text-foreground">Strike</th>
                <th className="px-3 py-2 text-right">Put Δ</th>
                <th className="px-3 py-2 text-right">Put IV</th>
                <th className="px-3 py-2 text-right">Put Bid</th>
                <th className="px-3 py-2 text-right">Put Ask</th>
              </tr>
            </thead>
            <tbody>
              {chain.map((row) => {
                const atm = Math.abs(row.strike - spot) / spot < 0.025
                return (
                  <tr
                    key={row.strike}
                    className={cn(
                      "border-b border-white/10",
                      atm ? "bg-primary/10 font-semibold" : "hover:bg-muted/20"
                    )}
                  >
                    <td className="px-3 py-2 text-green-400">{row.call_bid}</td>
                    <td className="px-3 py-2 text-green-400">{row.call_ask}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.call_iv}%</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.call_delta}</td>
                    <td className="px-3 py-2 text-center font-mono">{row.strike}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{row.put_delta}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{row.put_iv}%</td>
                    <td className="px-3 py-2 text-right text-red-400">{row.put_bid}</td>
                    <td className="px-3 py-2 text-right text-red-400">{row.put_ask}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
