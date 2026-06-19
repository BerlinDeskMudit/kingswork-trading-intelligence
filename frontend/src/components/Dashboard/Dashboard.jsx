import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3 } from 'lucide-react'
import { getMarketOverview } from '../../services/api'
import { formatPrice, formatPercent, formatVolume, signalColor, signalLabel } from '../../utils/formatters'
import './Dashboard.css'

const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM', 'V', 'JNJ']

export default function Dashboard() {
  const [marketData, setMarketData] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getMarketOverview()
        setMarketData(result.data || {})
      } catch (e) {
        console.error('Failed to fetch market overview:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Activity size={32} className="spin" />
        <p>Loading market data...</p>
      </div>
    )
  }

  const tickers = Object.keys(marketData).length > 0 ? Object.keys(marketData) : TICKERS

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Market Overview</h1>
        <p className="dashboard-subtitle">Real-time stock data & trading signals</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <DollarSign size={20} />
          <div>
            <span className="stat-label">Tracked</span>
            <span className="stat-value">{tickers.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <TrendingUp size={20} />
          <div>
            <span className="stat-label">Gainers</span>
            <span className="stat-value gain">
              {Object.values(marketData).filter((s) => (s.change || 0) > 0).length}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <TrendingDown size={20} />
          <div>
            <span className="stat-label">Losers</span>
            <span className="stat-value loss">
              {Object.values(marketData).filter((s) => (s.change || 0) < 0).length}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <BarChart3 size={20} />
          <div>
            <span className="stat-label">Signals Active</span>
            <span className="stat-value">
              {Object.values(marketData).filter((s) => s.signal && s.signal !== 'N/A').length}
            </span>
          </div>
        </div>
      </div>

      <div className="stock-grid">
        {tickers.map((ticker) => {
          const stock = marketData[ticker] || {}
          const change = stock.change || 0
          const changePct = stock.change_pct || 0
          const positive = change >= 0
          const price = stock.price || 0
          const signal = stock.signal || 'N/A'
          const features = stock.features || {}

          return (
            <div
              key={ticker}
              className="stock-card"
              onClick={() => navigate(`/stock/${ticker}`)}
            >
              <div className="stock-card-header">
                <h3>{ticker}</h3>
                <span
                  className="signal-badge"
                  style={{ background: signalColor(signal) }}
                >
                  {signalLabel(signal)}
                </span>
              </div>
              <div className="stock-card-price">
                <span className="price">{formatPrice(price)}</span>
                <span className={`change ${positive ? 'up' : 'down'}`}>
                  {change.toFixed(2)} ({changePct.toFixed(2)}%)
                </span>
              </div>
              <div className="stock-card-details">
                <div className="detail">
                  <span className="label">Volume</span>
                  <span className="value">{formatVolume(stock.volume)}</span>
                </div>
                <div className="detail">
                  <span className="label">Mkt Cap</span>
                  <span className="value">{stock.market_cap ? formatPrice(stock.market_cap) : 'N/A'}</span>
                </div>
                {features.volatility ? (
                  <div className="detail">
                    <span className="label">Volatility</span>
                    <span className="value">{(features.volatility * 100).toFixed(2)}%</span>
                  </div>
                ) : null}
              </div>
              {stock.change_pct && (
                <div className={`stock-card-bar ${positive ? 'up' : 'down'}`}>
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.min(Math.abs(stock.change_pct) * 10, 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
