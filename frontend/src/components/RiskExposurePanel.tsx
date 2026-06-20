import { useEffect, useState } from "react"
import axios from "axios"
import { AlertTriangle } from "lucide-react"
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface SectorData {
  sector: string
  value: number
  pct: number
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
]

const demoExposure: SectorData[] = [
  { sector: "Technology", value: 43250, pct: 43.3 },
  { sector: "Financial", value: 21800, pct: 21.8 },
  { sector: "Consumer", value: 14750, pct: 14.8 },
  { sector: "Energy", value: 10900, pct: 10.9 },
  { sector: "Healthcare", value: 9300, pct: 9.2 },
]

function toSectorData(payload: unknown): SectorData[] {
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { sectors?: unknown })?.sectors)
      ? (payload as { sectors: unknown[] }).sectors
      : []

  const normalized = raw
    .map((item) => {
      const row = item as Partial<SectorData>
      return {
        sector: String(row.sector || "Other"),
        value: Number(row.value || 0),
        pct: Number(row.pct || 0),
      }
    })
    .filter((item) => item.sector && Number.isFinite(item.value) && Number.isFinite(item.pct))

  return normalized.length ? normalized : demoExposure
}

export default function RiskExposurePanel({ portfolioId }: { portfolioId: number }) {
  const [data, setData] = useState<SectorData[]>(demoExposure)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("kingstop_token")
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined

    setLoading(true)
    setNotice(null)
    axios
      .get(`/api/v1/analytics/sector-exposure/${portfolioId}`, { headers })
      .then((res) => setData(toSectorData(res.data)))
      .catch(() => {
        setData(demoExposure)
        setNotice("Showing sample exposure until portfolio analytics are available.")
      })
      .finally(() => setLoading(false))
  }, [portfolioId])

  const highExposure = data.filter((item) => item.pct > 40)

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-card/70 p-4 shadow-ink">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sector Exposure</h2>
          {notice ? <p className="mt-1 text-xs text-primary">{notice}</p> : null}
        </div>
        {loading ? <span className="text-xs text-muted-foreground">Refreshing...</span> : null}
      </div>

      {highExposure.map((item) => (
        <div
          key={item.sector}
          className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary"
        >
          <AlertTriangle size={16} />
          <span>
            <strong>{item.sector}</strong> is {item.pct.toFixed(1)}% of your portfolio; consider diversifying.
          </span>
        </div>
      ))}

      <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 160)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <XAxis
            type="number"
            unit="%"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="sector"
            width={100}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => `${value.toFixed(1)}%`}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              color: "hsl(var(--foreground))",
            }}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={item.sector} className="flex items-center gap-3 text-sm">
            <span className="w-28 truncate text-foreground">{item.sector}</span>
            <span className="w-20 text-right text-muted-foreground">${item.value.toLocaleString()}</span>
            <div className="h-2 flex-1 rounded-full bg-muted">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${Math.min(item.pct, 100)}%`, backgroundColor: COLORS[index % COLORS.length] }}
              />
            </div>
            <span className="w-12 text-right font-medium text-foreground">{item.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
