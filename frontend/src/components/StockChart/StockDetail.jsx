import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react'
import {
  getRealtime, getHistorical, getAnalysis, getSignals, runBacktest,
} from '../../services/api'
import { formatPrice, formatChange, formatPercent, formatVolume, signalColor, signalLabel } from '../../utils/formatters'
import StockChart from './StockChart'
import './StockDetail.css'

export default function StockDetail() {
  const { ticker } = useParams()
  const navigate = useNavigate()
  const [realtime, setRealtime] = useState(null)
  const [historical, setHistorical] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [signals, setSignals] = useState(null)
  const [backtestResult, setBacktestResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePeriod, setActivePeriod] = useState('1mo')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [rt, hist, an, sig] = await Promise.all([
        getRealtime(ticker),
        getHistorical(ticker, activePeriod),
        getAnalysis(ticker, activePeriod),
        getSignals(ticker, activePeriod),
      ])
      setRealtime(rt)
      setHistorical(Array.isArray(hist) ? hist : [])
      setAnalysis(an)
      setSignals(sig)
    } catch (e) {
      console.error('Failed to fetch stock data:', e)
    } finally {
      setLoading(false)
    }
  }, [ticker, activePeriod])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleBacktest = async () => {
    try {
      const result = await runBacktest(ticker, '6mo')
      setBacktestResult(result)
    } catch (e) {
      console.error('Backtest failed:', e)
    }
  }

  const price = realtime?.price || 0
  const change = realtime?.change || 0
  const positive = change >= 0
  const fusedSignal = signals?.fused_signal || {}
  const techSignal = signals?.technical || {}
  const mlSignal = signals?.ml || {}

  return (
    <div className="stock-detail">
      <button className="back-btn" onClick={() => navigate('/')}>
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="detail-header">
        <div>
          <h1>{ticker}</h1>
          <p className="company-name">{realtime?.longName || realtime?.shortName || ''}</p>
        </div>
        <div className="header-price">
          <span className="price">{formatPrice(price)}</span>
          <span className={`change ${positive ? 'up' : 'down'}`}>
            {change.toFixed(2)} ({realtime?.change_pct?.toFixed(2) || '0.00'}%)
          </span>
        </div>
        <button className="refresh-btn" onClick={fetchAll}>
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="detail-grid">
        <div className="detail-card price-card">
          <div className="card-header">
            <Activity size={16} />
            <span>Price Data</span>
          </div>
          <div className="price-metrics">
            {[
              { label: 'Open', value: formatPrice(realtime?.open) },
              { label: 'High', value: formatPrice(realtime?.high) },
              { label: 'Low', value: formatPrice(realtime?.low) },
              { label: 'Volume', value: formatVolume(realtime?.volume) },
              { label: 'Market Cap', value: realtime?.market_cap ? formatPrice(realtime?.market_cap) : 'N/A' },
              { label: 'P/E', value: realtime?.pe_ratio?.toFixed(2) || 'N/A' },
            ].map(({ label, value }) => (
              <div key={label} className="metric">
                <span className="label">{label}</span>
                <span className="value">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-card signals-card">
          <div className="card-header">
            <TrendingUp size={16} />
            <span>Trading Signals</span>
          </div>
          <div className="fused-signal" style={{ borderColor: signalColor(fusedSignal.signal) }}>
            <span className="signal-label">Fused</span>
            <span className="signal-value" style={{ color: signalColor(fusedSignal.signal) }}>
              {signalLabel(fusedSignal.signal)}
            </span>
            <span className="signal-conf">{(fusedSignal.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="signal-breakdown">
            <div className="signal-row">
              <span className="label">Technical</span>
              <span className="value" style={{ color: signalColor(techSignal?.signal) }}>
                {signalLabel(techSignal?.signal)}
              </span>
              <span className="conf">{((techSignal?.confidence || 0) * 100).toFixed(0)}%</span>
            </div>
            <div className="signal-row">
              <span className="label">ML Model</span>
              <span className="value" style={{ color: signalColor(mlSignal?.signal) }}>
                {signalLabel(mlSignal?.signal)}
              </span>
              <span className="conf">{((mlSignal?.confidence || 0) * 100).toFixed(0)}%</span>
            </div>
          </div>
          {techSignal?.details && (
            <div className="tech-details">
              <div className="card-header" style={{ marginTop: '0.75rem' }}>
                <span>Technical Indicators</span>
              </div>
              <div className="detail-grid-inline">
                {[
                  { label: 'RSI', value: techSignal.details.rsi?.toFixed(1) },
                  { label: 'ATR', value: techSignal.details.atr?.toFixed(2) },
                  { label: 'SMA 20', value: formatPrice(techSignal.details.sma_20) },
                  { label: 'SMA 50', value: formatPrice(techSignal.details.sma_50) },
                ].map(({ label, value }) => (
                  <div key={label} className="mini-metric">
                    <span className="label">{label}</span>
                    <span className="value">{value}</span>
                  </div>
                ))}
              </div>
              <div className="triggered-signals">
                {techSignal.details.signals_triggered?.map((s) => (
                  <span key={s} className="trigger-badge">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="detail-card backtest-card">
          <div className="card-header">
            <TrendingDown size={16} />
            <span>Backtest (6mo)</span>
            <button className="btn-small" onClick={handleBacktest}>
              Run
            </button>
          </div>
          {backtestResult?.result ? (
            <div className="backtest-results">
              {[
                { label: 'Return', value: `${backtestResult.result.total_return}%`, cls: backtestResult.result.total_return >= 0 ? 'gain' : 'loss' },
                { label: 'Sharpe', value: backtestResult.result.sharpe_ratio },
                { label: 'Max DD', value: `${backtestResult.result.max_drawdown}%`, cls: 'loss' },
                { label: 'Win Rate', value: `${backtestResult.result.win_rate}%` },
                { label: 'Trades', value: backtestResult.result.total_trades },
                { label: 'Profit Factor', value: backtestResult.result.profit_factor },
              ].map(({ label, value, cls }) => (
                <div key={label} className="metric">
                  <span className="label">{label}</span>
                  <span className={`value ${cls || ''}`}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">Click "Run" to backtest strategy</p>
          )}
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-header">
          <h2>Price Chart</h2>
          <div className="period-selector">
            {['5d', '1mo', '3mo', '6mo', '1y'].map((p) => (
              <button
                key={p}
                className={`period-btn ${activePeriod === p ? 'active' : ''}`}
                onClick={() => setActivePeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <StockChart data={historical} />
      </div>
    </div>
  )
}
