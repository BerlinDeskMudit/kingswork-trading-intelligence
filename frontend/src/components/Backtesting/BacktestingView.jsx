import React, { useEffect, useState } from 'react'
import {
  Activity,
  BrainCircuit,
  Play,
  RotateCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getModes, runBacktest } from '../../services/api'
import { formatPrice, signalColor, signalLabel } from '../../utils/formatters'
import './BacktestingView.css'

const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META']
const PERIODS = ['3mo', '6mo', '1y', '2y']

function formatMetric(value, suffix = '') {
  if (value == null || Number.isNaN(Number(value))) return '--'
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`
}

function BacktestTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="backtest-tooltip">
      <p>{label}</p>
      <strong>{formatPrice(payload[0].value)}</strong>
    </div>
  )
}

export default function BacktestingView() {
  const [ticker, setTicker] = useState('AAPL')
  const [period, setPeriod] = useState('6mo')
  const [modeInfo, setModeInfo] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function boot() {
      setLoading(true)
      setError('')
      try {
        const [modes, backtest] = await Promise.all([
          getModes(),
          runBacktest('AAPL', '6mo'),
        ])
        if (!mounted) return
        setModeInfo(modes)
        setResult(backtest)
      } catch (e) {
        if (mounted) setError(e?.response?.data?.detail || e.message || 'Backtest failed')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    boot()
    return () => {
      mounted = false
    }
  }, [])

  const handleRun = async () => {
    setLoading(true)
    setError('')
    try {
      const backtest = await runBacktest(ticker, period)
      setResult(backtest)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Backtest failed')
    } finally {
      setLoading(false)
    }
  }

  const metrics = result?.result
  const equity = result?.equity_curve || []
  const trades = result?.trades || []
  const signalEntries = Object.entries(result?.signals_summary || {})
  const model = result?.model || modeInfo?.backtest?.model
  const latestSignal = result?.latest_signal || { signal: 'NEUTRAL', confidence: 0 }
  const totalReturn = metrics?.total_return || 0
  const finalCapital = metrics?.final_capital || modeInfo?.wallet?.initial_cash || 100000

  return (
    <div className="backtesting-view">
      <div className="backtesting-header">
        <div>
          <h1>Backtesting</h1>
          <div className="mode-line">
            <span className="mode-dot" />
            <span>{model?.name || 'Preloaded Ensemble v1'}</span>
          </div>
        </div>

        <div className="backtest-controls">
          <label>
            <span>Ticker</span>
            <select value={ticker} onChange={(e) => setTicker(e.target.value)}>
              {TICKERS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Period</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <button className="run-button" onClick={handleRun} disabled={loading}>
            {loading ? <RotateCw size={16} className="spin" /> : <Play size={16} />}
            Run
          </button>
        </div>
      </div>

      {error ? <div className="backtest-error">{error}</div> : null}
      {result?.warning ? <div className="backtest-warning">{result.warning}</div> : null}

      <div className="backtest-summary">
        <div className="summary-card">
          <Wallet size={18} />
          <div>
            <span className="summary-label">Starting Cash</span>
            <span className="summary-value">{formatPrice(metrics?.initial_capital || 100000)}</span>
          </div>
        </div>
        <div className="summary-card">
          <TrendingUp size={18} />
          <div>
            <span className="summary-label">Final Capital</span>
            <span className="summary-value">{formatPrice(finalCapital)}</span>
          </div>
        </div>
        <div className="summary-card">
          <Activity size={18} />
          <div>
            <span className="summary-label">Total Return</span>
            <span className={`summary-value ${totalReturn >= 0 ? 'gain' : 'loss'}`}>
              {formatMetric(totalReturn, '%')}
            </span>
          </div>
        </div>
        <div className="summary-card">
          <BrainCircuit size={18} />
          <div>
            <span className="summary-label">Model Rows</span>
            <span className="summary-value">{formatMetric(model?.training_rows)}</span>
          </div>
        </div>
      </div>

      <div className="backtest-grid">
        <section className="equity-panel">
          <div className="panel-header">
            <div>
              <h2>Equity Curve</h2>
              <span>{result?.ticker || ticker} - {result?.period || period}</span>
            </div>
            <div
              className="signal-chip"
              style={{ borderColor: signalColor(latestSignal.signal), color: signalColor(latestSignal.signal) }}
            >
              {signalLabel(latestSignal.signal)}
              <span>{Math.round((latestSignal.confidence || 0) * 100)}%</span>
            </div>
          </div>

          {equity.length ? (
            <ResponsiveContainer width="100%" height={330}>
              <AreaChart data={equity} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2e42" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#8b8fa3', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#2a2e42' }}
                />
                <YAxis
                  tick={{ fill: '#8b8fa3', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${Number(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<BacktestTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#equityGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="backtest-empty">
              {loading ? <RotateCw size={22} className="spin" /> : <span>No equity data</span>}
            </div>
          )}
        </section>

        <aside className="metrics-panel">
          <div className="panel-header compact">
            <h2>Metrics</h2>
            <span>{result?.data_source || 'model'}</span>
          </div>
          <div className="metric-list">
            {[
              ['Annualized Return', formatMetric(metrics?.annualized_return, '%'), metrics?.annualized_return >= 0 ? 'gain' : 'loss'],
              ['Sharpe Ratio', formatMetric(metrics?.sharpe_ratio)],
              ['Max Drawdown', formatMetric(metrics?.max_drawdown, '%'), 'loss'],
              ['Win Rate', formatMetric(metrics?.win_rate, '%')],
              ['Trades', formatMetric(metrics?.total_trades)],
              ['Profit Factor', metrics?.profit_factor == null ? '--' : formatMetric(metrics.profit_factor)],
            ].map(([label, value, cls]) => (
              <div key={label} className="metric-row">
                <span>{label}</span>
                <strong className={cls || ''}>{value}</strong>
              </div>
            ))}
          </div>

          <div className="signals-block">
            <h3>Signals</h3>
            {signalEntries.length ? signalEntries.map(([signal, count]) => (
              <div key={signal} className="signal-row">
                <span style={{ color: signalColor(signal) }}>{signalLabel(signal)}</span>
                <strong>{count}</strong>
              </div>
            )) : <p className="muted">No signals</p>}
          </div>
        </aside>
      </div>

      <section className="trades-panel">
        <div className="panel-header compact">
          <h2>Simulated Trades</h2>
          <span>{trades.length}</span>
        </div>
        {trades.length ? (
          <div className="trades-table">
            <div className="trades-head">
              <span>Entry</span>
              <span>Exit</span>
              <span>Shares</span>
              <span>Entry Price</span>
              <span>Exit Price</span>
              <span>PnL</span>
            </div>
            {trades.slice(0, 8).map((trade, index) => (
              <div key={`${trade.date}-${index}`} className="trade-line">
                <span>{String(trade.date || '').split('T')[0]}</span>
                <span>{String(trade.exit_date || '').split('T')[0] || '--'}</span>
                <span>{trade.shares}</span>
                <span>{formatPrice(trade.price)}</span>
                <span>{formatPrice(trade.exit_price)}</span>
                <span className={(trade.pnl || 0) >= 0 ? 'gain' : 'loss'}>{formatPrice(trade.pnl)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="backtest-empty small">
            {loading ? <RotateCw size={20} className="spin" /> : <span>No simulated trades</span>}
          </div>
        )}
      </section>
    </div>
  )
}
