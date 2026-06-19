import { useEffect, useState } from "react"
import { Clock, RefreshCw } from "lucide-react"
import { getMultiTimeframe } from "@/services/api.ts"
import { cn } from "@/lib/utils"

function signalColor(s?: string) {
  if (!s) return "text-muted-foreground"
  if (s.includes("BUY")) return "text-green-400"
  if (s.includes("SELL")) return "text-red-400"
  return "text-yellow-400"
}

export default function MultiTimeframePanel({ ticker }: { ticker: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    getMultiTimeframe(ticker)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [ticker])

  const confluenceColor = data?.confluence === "BULLISH"
    ? "text-green-400" : data?.confluence === "BEARISH"
      ? "text-red-400" : "text-yellow-400"

  return (
    <div className="rounded-lg border border-white/10 bg-card/70 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Multi-Timeframe — {ticker}</span>
        </div>
        <div className="flex items-center gap-3">
          {data?.confluence && (
            <span className={cn("text-xs font-semibold uppercase", confluenceColor)}>
              {data.confluence} confluence
            </span>
          )}
          <button onClick={load} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
      ) : data?.timeframes ? (
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(data.timeframes).map(([label, tf]: [string, any]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-background/60 p-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={cn("text-xl font-bold", signalColor(tf.signal))}>{tf.signal}</p>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((tf.confidence || 0) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{Math.round((tf.confidence || 0) * 100)}% confidence</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">No data available.</p>
      )}
    </div>
  )
}
