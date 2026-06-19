import React from 'react'

interface HeatmapRow {
  ticker: string
  name: string
  change_pct: number
  sector?: string
  signal?: string
}

const SECTOR_MAP: Record<string, string> = {
  AAPL: 'Technology', MSFT: 'Technology', GOOGL: 'Technology',
  META: 'Technology', NVDA: 'Technology',
  TSLA: 'Consumer', AMZN: 'Consumer',
  JPM: 'Financial', V: 'Financial', BAC: 'Financial',
  JNJ: 'Healthcare', PFE: 'Healthcare',
  XOM: 'Energy', CVX: 'Energy',
  'RELIANCE.NS': 'Energy', 'TCS.NS': 'Technology',
  'INFY.NS': 'Technology', 'HDFCBANK.NS': 'Financial',
  'WIPRO.NS': 'Technology', 'ICICIBANK.NS': 'Financial',
}

function cellClass(pct: number) {
  if (pct > 1) return 'bg-green-500/70'
  if (pct > 0) return 'bg-green-500/30'
  if (pct < -1) return 'bg-red-500/70'
  return 'bg-red-500/30'
}

export default function HeatmapView({ rows }: { rows: HeatmapRow[] }) {
  const grouped = rows.reduce<Record<string, HeatmapRow[]>>((acc, row) => {
    const sector = row.sector ?? SECTOR_MAP[row.ticker] ?? 'Other'
    ;(acc[sector] ??= []).push(row)
    return acc
  }, {})

  return (
    <div className="p-4 space-y-4">
      {Object.entries(grouped).map(([sector, stocks]) => (
        <div key={sector}>
          <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">{sector}</h3>
          <div className="flex flex-wrap gap-2">
            {stocks.map(s => (
              <div
                key={s.ticker}
                className={`${cellClass(s.change_pct)} rounded p-2 min-w-[80px] text-center cursor-default`}
                title={s.name}
              >
                <div className="text-xs font-bold text-white">{s.ticker}</div>
                <div className="text-xs text-white/90">
                  {s.change_pct >= 0 ? '+' : ''}{s.change_pct.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
