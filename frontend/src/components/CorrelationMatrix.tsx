import React, { useState } from 'react'
import axios from 'axios'

interface Props {
  tickers?: string[]
  matrix?: number[][]
}

function cellColor(val: number, isDiag: boolean): string {
  if (isDiag) return 'rgba(100,100,100,0.2)'
  if (val > 0.5) return `rgba(34,197,94,${Math.min(val, 1) * 0.7})`
  if (val < -0.5) return `rgba(239,68,68,${Math.min(Math.abs(val), 1) * 0.7})`
  return 'rgba(150,150,150,0.15)'
}

export default function CorrelationMatrix({
  tickers: initTickers = ['AAPL', 'MSFT', 'GOOGL'],
  matrix: initMatrix = [
    [1, 0.56, 0.48],
    [0.56, 1, 0.51],
    [0.48, 0.51, 1],
  ],
}: Props) {
  const [tickers, setTickers] = useState<string[]>(initTickers)
  const [matrix, setMatrix] = useState<number[][]>(initMatrix)
  const [input, setInput] = useState(initTickers.join(','))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('kingstop_token')
      const { data } = await axios.get('/api/v1/analytics/correlation', {
        params: { tickers: input.trim(), period: '1mo' },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setTickers(data.tickers)
      setMatrix(data.matrix)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <input
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="AAPL,MSFT,GOOGL"
        />
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm text-white"
        >
          {loading ? 'Loading…' : 'Load'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {tickers.length > 0 && matrix.length > 0 && (
        <div className="overflow-auto">
          <table className="text-xs border-collapse">
            <tbody>
              {tickers.map((row, i) => (
                <tr key={row}>
                  {tickers.map((col, j) => (
                    <td
                      key={col}
                      style={{ backgroundColor: cellColor(matrix[i]?.[j] ?? 0, i === j) }}
                      className="border border-gray-700 px-2 py-1 text-center text-white min-w-[60px]"
                    >
                      {i === j ? <span className="font-bold">{row}</span> : (matrix[i]?.[j] ?? 0).toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
