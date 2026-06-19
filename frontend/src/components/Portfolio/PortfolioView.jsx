import React, { useEffect, useState } from 'react'
import { PieChart, Plus, DollarSign, Activity, Wallet } from 'lucide-react'
import { listPortfolios, createPortfolio, getPortfolio, executeTrade, getDemoWallet } from '../../services/api'
import { formatPrice, formatVolume } from '../../utils/formatters'
import './PortfolioView.css'

export default function PortfolioView() {
  const [portfolios, setPortfolios] = useState([])
  const [activePortfolio, setActivePortfolio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCash, setNewCash] = useState('100000')
  const [tradeForm, setTradeForm] = useState({ ticker: '', side: 'BUY', quantity: 1, price: '' })

  useEffect(() => {
    async function fetch() {
      try {
        const [list, wallet] = await Promise.all([
          listPortfolios(),
          getDemoWallet(),
        ])
        setPortfolios(list)
        if (wallet) {
          setActivePortfolio(wallet)
        } else if (list.length > 0) {
          setActivePortfolio(await getPortfolio(list[0].id))
        }
      } catch (e) {
        console.error('Failed to load portfolios:', e)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const handleCreate = async () => {
    try {
      const pf = await createPortfolio(newName, parseFloat(newCash))
      setPortfolios([...portfolios, pf])
      const detail = await getPortfolio(pf.id)
      setActivePortfolio(detail)
      setShowCreate(false)
      setNewName('')
    } catch (e) {
      console.error('Failed to create portfolio:', e)
    }
  }

  const handleTrade = async () => {
    if (!activePortfolio) return
    try {
      await executeTrade(activePortfolio.id, {
        ticker: tradeForm.ticker.toUpperCase(),
        side: tradeForm.side,
        quantity: parseInt(tradeForm.quantity),
        price: parseFloat(tradeForm.price),
      })
      const detail = await getPortfolio(activePortfolio.id)
      setActivePortfolio(detail)
      setTradeForm({ ticker: '', side: 'BUY', quantity: 1, price: '' })
    } catch (e) {
      console.error('Trade failed:', e)
    }
  }

  const loadPortfolio = async (id) => {
    const detail = await getPortfolio(id)
    setActivePortfolio(detail)
  }

  if (loading) {
    return (
      <div className="portfolio-loading">
        <Activity size={32} className="spin" />
        <p>Loading portfolio...</p>
      </div>
    )
  }

  return (
    <div className="portfolio-view">
      <div className="portfolio-header">
        <div>
          <h1>Wallet</h1>
          <p className="portfolio-subtitle">Demo wallet starts with {formatPrice(100000)} in paper cash</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <Plus size={16} />
          New Portfolio
        </button>
      </div>

      {showCreate && (
        <div className="create-form">
          <input
            placeholder="Portfolio name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Initial cash"
            value={newCash}
            onChange={(e) => setNewCash(e.target.value)}
          />
          <button className="btn-primary" onClick={handleCreate}>Create</button>
        </div>
      )}

      {portfolios.length === 0 ? (
        <div className="empty-state">
          <PieChart size={48} />
          <p>No portfolios yet. Create one to start trading.</p>
        </div>
      ) : (
        <div className="portfolio-layout">
          <div className="portfolio-sidebar">
            {portfolios.map((pf) => (
              <div
                key={pf.id}
                className={`pf-item ${activePortfolio?.id === pf.id ? 'active' : ''}`}
                onClick={() => loadPortfolio(pf.id)}
              >
                <span className="pf-name">
                  {pf.name}
                  {pf.name === 'Demo Wallet' ? <span className="demo-badge">Demo</span> : null}
                </span>
                <span className="pf-value">{formatPrice(pf.cash || 0)}</span>
              </div>
            ))}
          </div>

          {activePortfolio && (
            <div className="portfolio-detail">
              <div className="pf-summary">
                <div className="pf-stat">
                  {activePortfolio.is_demo ? <Wallet size={18} /> : <DollarSign size={18} />}
                  <div>
                    <span className="label">Cash</span>
                    <span className="value">{formatPrice(activePortfolio.cash)}</span>
                  </div>
                </div>
                <div className="pf-stat">
                  <PieChart size={18} />
                  <div>
                    <span className="label">Total Value</span>
                    <span className="value">{formatPrice(activePortfolio.total_value)}</span>
                  </div>
                </div>
                <div className="pf-stat">
                  <Activity size={18} />
                  <div>
                    <span className="label">Positions</span>
                    <span className="value">{(activePortfolio.positions || []).length}</span>
                  </div>
                </div>
              </div>

              <div className="trade-form">
                <h3>Execute Trade</h3>
                <div className="trade-inputs">
                  <input
                    placeholder="Ticker"
                    value={tradeForm.ticker}
                    onChange={(e) => setTradeForm({ ...tradeForm, ticker: e.target.value })}
                  />
                  <select
                    value={tradeForm.side}
                    onChange={(e) => setTradeForm({ ...tradeForm, side: e.target.value })}
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={tradeForm.quantity}
                    onChange={(e) => setTradeForm({ ...tradeForm, quantity: e.target.value })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={tradeForm.price}
                    onChange={(e) => setTradeForm({ ...tradeForm, price: e.target.value })}
                  />
                  <button className="btn-primary" onClick={handleTrade}>Submit</button>
                </div>
              </div>

              <div className="positions-section">
                <h3>Positions</h3>
                {(activePortfolio.positions || []).length === 0 ? (
                  <p className="empty-text">No open positions</p>
                ) : (
                  <div className="positions-grid">
                    <div className="positions-header">
                      <span>Ticker</span>
                      <span>Qty</span>
                      <span>Avg Entry</span>
                      <span>Current</span>
                      <span>Value</span>
                      <span>Unrealized PnL</span>
                    </div>
                    {activePortfolio.positions.map((pos) => {
                      const pnl = pos.unrealized_pnl || (pos.current_price - pos.avg_entry_price) * pos.quantity
                      return (
                        <div key={pos.ticker} className="position-row">
                          <span className="ticker">{pos.ticker}</span>
                          <span>{pos.quantity}</span>
                          <span>{formatPrice(pos.avg_entry_price)}</span>
                          <span>{formatPrice(pos.current_price)}</span>
                          <span>{formatPrice(pos.value)}</span>
                          <span className={pnl >= 0 ? 'gain' : 'loss'}>
                            {formatPrice(pnl)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="trades-section">
                <h3>Recent Trades</h3>
                {(activePortfolio.trades || []).length === 0 ? (
                  <p className="empty-text">No trades yet</p>
                ) : (
                  <div className="trades-list">
                    {activePortfolio.trades.map((t) => (
                      <div key={t.id} className="trade-row">
                        <span className={`trade-side ${t.side.toLowerCase()}`}>{t.side}</span>
                        <span className="trade-ticker">{t.ticker}</span>
                        <span>{t.quantity} @ {formatPrice(t.price)}</span>
                        {t.pnl != null && (
                          <span className={t.pnl >= 0 ? 'gain' : 'loss'}>
                            PnL: {formatPrice(t.pnl)}
                          </span>
                        )}
                        <span className="trade-date">{t.executed_at?.split('T')[0]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
