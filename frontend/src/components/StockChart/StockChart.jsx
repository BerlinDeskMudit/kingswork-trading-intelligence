import React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="tooltip-date">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: ${Number(entry.value).toFixed(2)}
        </p>
      ))}
    </div>
  )
}

export default function StockChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No chart data available</p>
      </div>
    )
  }

  const priceKey = data[0]?.close !== undefined ? 'close' :
    data[0]?.Close !== undefined ? 'Close' : 'price'
  const dateKey = data[0]?.date !== undefined ? 'date' :
    data[0]?.Date !== undefined ? 'Date' : 'timestamp'
  const volumeKey = data[0]?.volume !== undefined ? 'volume' :
    data[0]?.Volume !== undefined ? 'Volume' : null

  const chartData = data.map((d) => ({
    date: d[dateKey]?.split('T')[0] || d[dateKey],
    price: Number(d[priceKey]) || 0,
    volume: volumeKey ? (Number(d[volumeKey]) || 0) : undefined,
    open: Number(d.open || d.Open || 0),
    high: Number(d.high || d.High || 0),
    low: Number(d.low || d.Low || 0),
  }))

  const prices = chartData.map(d => d.price)
  const minPrice = Math.min(...prices) * 0.995
  const maxPrice = Math.max(...prices) * 1.005

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2e42" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#8b8fa3', fontSize: 11 }}
            axisLine={{ stroke: '#2a2e42' }}
            tickLine={false}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fill: '#8b8fa3', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#priceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
