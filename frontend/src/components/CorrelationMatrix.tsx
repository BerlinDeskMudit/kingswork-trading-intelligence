import { useState } from "react"
import axios from "axios"

interface Props {
  tickers?: string[]
  matrix?: number[][]
}

const demoTickers = ["AAPL", "MSFT", "GOOGL", "NVDA", "JPM"]
const demoMatrix = [
  [1, 0.56, 0.48, 0.62, 0.21],
  [0.56, 1, 0.51, 0.58, 0.24],
  [0.48, 0.51, 1, 0.46, 0.18],
  [0.62, 0.58, 0.46, 1, 0.16],
  [0.21, 0.24, 0.18, 0.16, 1],
]

function cellColor(value: number, isDiagonal: boolean): string {
  if (isDiagonal) return "hsl(var(--primary) / 0.16)"
  if (value > 0.5) return `rgb(34 197 94 / ${Math.min(value, 1) * 0.45})`
  if (value < -0.5) return `rgb(239 68 68 / ${Math.min(Math.abs(value), 1) * 0.45})`
  return "hsl(var(--muted) / 0.55)"
}

function normalizeMatrix(payload: unknown) {
  const tickers = Array.isArray((payload as { tickers?: unknown })?.tickers)
    ? ((payload as { tickers: unknown[] }).tickers.map(String).filter(Boolean) as string[])
    : []
  const matrix = Array.isArray((payload as { matrix?: unknown })?.matrix)
    ? ((payload as { matrix: unknown[] }).matrix as number[][])
    : []

  if (!tickers.length || !matrix.length) {
    return { tickers: demoTickers, matrix: demoMatrix }
  }

  return { tickers, matrix }
}

export default function CorrelationMatrix({ tickers: initTickers = demoTickers, matrix: initMatrix = demoMatrix }: Props) {
  const [tickers, setTickers] = useState<string[]>(initTickers)
  const [matrix, setMatrix] = useState<number[][]>(initMatrix)
  const [input, setInput] = useState(initTickers.join(","))
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setNotice(null)
    try {
      const token = localStorage.getItem("kingstop_token")
      const { data } = await axios.get("/api/v1/analytics/correlation", {
        params: { tickers: input.trim(), period: "1mo" },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const normalized = normalizeMatrix(data)
      setTickers(normalized.tickers)
      setMatrix(normalized.matrix)
    } catch {
      setTickers(demoTickers)
      setMatrix(demoMatrix)
      setNotice("Showing sample correlations until market history is available.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-card/70 p-4 shadow-ink">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Correlation Matrix</h2>
        {notice ? <p className="mt-1 text-xs text-primary">{notice}</p> : null}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="AAPL,MSFT,GOOGL,NVDA,JPM"
        />
        <button
          onClick={load}
          disabled={loading}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load"}
        </button>
      </div>

      <div className="overflow-auto">
        <table className="border-collapse text-xs">
          <tbody>
            {tickers.map((row, rowIndex) => (
              <tr key={row}>
                {tickers.map((col, colIndex) => {
                  const value = Number(matrix[rowIndex]?.[colIndex] ?? 0)
                  const safeValue = Number.isFinite(value) ? value : 0
                  return (
                    <td
                      key={col}
                      style={{ backgroundColor: cellColor(safeValue, rowIndex === colIndex) }}
                      className="min-w-[60px] border border-white/10 px-2 py-1 text-center text-foreground"
                    >
                      {rowIndex === colIndex ? <span className="font-bold text-primary">{row}</span> : safeValue.toFixed(2)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
