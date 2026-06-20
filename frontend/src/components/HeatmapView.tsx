interface HeatmapRow {
  ticker: string
  name: string
  change_pct: number
  sector?: string
  signal?: string
}

const SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology",
  MSFT: "Technology",
  GOOGL: "Technology",
  META: "Technology",
  NVDA: "Technology",
  TSLA: "Consumer",
  AMZN: "Consumer",
  JPM: "Financial",
  V: "Financial",
  BAC: "Financial",
  JNJ: "Healthcare",
  PFE: "Healthcare",
  XOM: "Energy",
  CVX: "Energy",
  "RELIANCE.NS": "Energy",
  "TCS.NS": "Technology",
  "INFY.NS": "Technology",
  "HDFCBANK.NS": "Financial",
  "WIPRO.NS": "Technology",
  "ICICIBANK.NS": "Financial",
}

const demoRows: HeatmapRow[] = [
  { ticker: "NVDA", name: "NVIDIA Corp.", change_pct: 4.32, sector: "Technology" },
  { ticker: "MSFT", name: "Microsoft", change_pct: 0.76, sector: "Technology" },
  { ticker: "AAPL", name: "Apple Inc.", change_pct: 1.87, sector: "Technology" },
  { ticker: "TSLA", name: "Tesla Inc.", change_pct: -0.82, sector: "Consumer" },
  { ticker: "AMZN", name: "Amazon.com", change_pct: 0.95, sector: "Consumer" },
  { ticker: "JPM", name: "JPMorgan Chase", change_pct: -0.24, sector: "Financial" },
  { ticker: "JNJ", name: "Johnson & Johnson", change_pct: 0.34, sector: "Healthcare" },
  { ticker: "XOM", name: "Exxon Mobil", change_pct: -1.12, sector: "Energy" },
]

function cellClass(pct: number) {
  if (pct > 1) return "bg-market-up/70"
  if (pct > 0) return "bg-market-up/30"
  if (pct < -1) return "bg-market-down/70"
  return "bg-market-down/30"
}

function normalizeRows(rows: HeatmapRow[] | undefined): HeatmapRow[] {
  if (!Array.isArray(rows) || rows.length === 0) return demoRows

  const normalized = rows
    .map((row) => ({
      ...row,
      ticker: String(row.ticker || "").toUpperCase(),
      name: row.name || row.ticker || "Unknown",
      change_pct: Number(row.change_pct || 0),
    }))
    .filter((row) => row.ticker && Number.isFinite(row.change_pct))

  return normalized.length ? normalized : demoRows
}

export default function HeatmapView({ rows }: { rows?: HeatmapRow[] }) {
  const grouped = normalizeRows(rows).reduce<Record<string, HeatmapRow[]>>((acc, row) => {
    const sector = row.sector ?? SECTOR_MAP[row.ticker] ?? "Other"
    ;(acc[sector] ??= []).push(row)
    return acc
  }, {})

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-card/70 p-4 shadow-ink">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Market Heatmap</h2>
        <p className="mt-1 text-xs text-muted-foreground">Demo rows remain visible when live market data is unavailable.</p>
      </div>

      {Object.entries(grouped).map(([sector, stocks]) => (
        <div key={sector}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{sector}</h3>
          <div className="flex flex-wrap gap-2">
            {stocks.map((stock) => (
              <div
                key={stock.ticker}
                className={`${cellClass(stock.change_pct)} min-w-[86px] cursor-default rounded-md border border-white/10 p-2 text-center`}
                title={stock.name}
              >
                <div className="text-xs font-bold text-foreground">{stock.ticker}</div>
                <div className="text-xs text-foreground/90">
                  {stock.change_pct >= 0 ? "+" : ""}
                  {stock.change_pct.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
