import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react'
import { getCurrentSignals, getMarketOverview } from '../../services/api'
import { formatPrice, signalColor, signalLabel } from '../../utils/formatters'
import './SignalsPanel.css'

export default function SignalsPanel() {
  const [signals, setSignals] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchSignals() {
      try {
        const [sigData, overview] = await Promise.all([
          getCurrentSignals(),
          getMarketOverview(),
        ])
        const enriched = {}
        for (const [ticker, s] of Object.entries(sigData)) {
          enriched[ticker] = {
            ...s,
            ...(overview.data?.[ticker] || {}),
          }
        }
        setSignals(enriched)
      } catch (e) {
        console.error('Failed to fetch signals:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchSignals()
    const interval = setInterval(fetchSignals, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="signals-loading">
        <Activity size={32} className="spin" />
        <p>Loading signals...</p>
      </div>
    )
  }

  const tickers = Object.keys(signals)
  const buySignals = tickers.filter(t => ['BUY', 'STRONG_BUY'].includes(signals[t]?.signal))
  const sellSignals = tickers.filter(t => ['SELL', 'STRONG_SELL'].includes(signals[t]?.signal))
  const neutralSignals = tickers.filter(t => !['BUY', 'STRONG_BUY', 'SELL', 'STRONG_SELL'].includes(signals[t]?.signal))

  return (
    <div className="signals-panel">
      <div className="signals-header">
        <h1>Trading Signals</h1>
        <p className="signals-subtitle">Real-time signal fusion from technical + ML models</p>
      </div>

      <div className="signals-stats">
        <div className="sig-stat buy-stat">
          <TrendingUp size={18} />
          <div>
            <span className="sig-stat-label">Buy Signals</span>
            <span className="sig-stat-value">{buySignals.length}</span>
          </div>
        </div>
        <div className="sig-stat neutral-stat">
          <Minus size={18} />
          <div>
            <span className="sig-stat-label">Neutral</span>
            <span className="sig-stat-value">{neutralSignals.length}</span>
          </div>
        </div>
        <div className="sig-stat sell-stat">
          <TrendingDown size={18} />
          <div>
            <span className="sig-stat-label">Sell Signals</span>
            <span className="sig-stat-value">{sellSignals.length}</span>
          </div>
        </div>
      </div>

      <div className="signals-list">
        <div className="signals-group">
          <h3>
            <TrendingUp size={16} color="var(--accent-green)" />
            Buy Opportunities
          </h3>
          {buySignals.length === 0 && <p className="empty-group">No buy signals</p>}
          {buySignals.map(ticker => (
            <SignalCard key={ticker} ticker={ticker} data={signals[ticker]} />
          ))}
        </div>

        <div className="signals-group">
          <h3>
            <Minus size={16} color="var(--text-muted)" />
            Neutral
          </h3>
          {neutralSignals.length === 0 && <p className="empty-group">No neutral signals</p>}
          {neutralSignals.map(ticker => (
            <SignalCard key={ticker} ticker={ticker} data={signals[ticker]} />
          ))}
        </div>

        <div className="signals-group">
          <h3>
            <TrendingDown size={16} color="var(--accent-red)" />
            Sell Warnings
          </h3>
          {sellSignals.length === 0 && <p className="empty-group">No sell signals</p>}
          {sellSignals.map(ticker => (
            <SignalCard key={ticker} ticker={ticker} data={signals[ticker]} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SignalCard({ ticker, data }) {
  const navigate = useNavigate()
  const signal = data.signal || 'NEUTRAL'
  const confidence = data.confidence || 0

  return (
    <div className="signal-card" onClick={() => navigate(`/stock/${ticker}`)}>
      <div className="signal-card-header">
        <h4>{ticker}</h4>
        <span className="signal-badge" style={{ background: signalColor(signal) }}>
          {signalLabel(signal)}
        </span>
      </div>
      <div className="signal-card-body">
        <div className="signal-price">{formatPrice(data.price)}</div>
        <div className="signal-confidence">
          <Brain size={14} />
          <span>{(confidence * 100).toFixed(0)}% confidence</span>
        </div>
      </div>
    </div>
  )
}
