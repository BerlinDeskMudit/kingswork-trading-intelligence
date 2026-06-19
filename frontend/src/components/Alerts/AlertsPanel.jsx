import React, { useEffect, useState } from 'react'
import { Bell, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { getAlertRules, createAlertRule, deleteAlertRule, getAlertHistory } from '../../services/api'
import './AlertsPanel.css'

const CONDITION_LABELS = {
  PRICE_ABOVE: 'Price Above',
  PRICE_BELOW: 'Price Below',
  VOLUME_SPIKE: 'Volume Spike',
  SIGNAL_BUY: 'Buy Signal',
  SIGNAL_SELL: 'Sell Signal',
  RSI_OVERSOLD: 'RSI Oversold',
  RSI_OVERBOUGHT: 'RSI Overbought',
  CROSS_MA: 'MA Cross',
}

export default function AlertsPanel() {
  const [rules, setRules] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '',
    ticker: '',
    condition: 'PRICE_ABOVE',
    threshold: '',
    severity: 'MEDIUM',
  })

  useEffect(() => {
    async function fetch() {
      try {
        const [r, a] = await Promise.all([getAlertRules(), getAlertHistory()])
        setRules(r || [])
        setAlerts(a || [])
      } catch (e) {
        console.error('Failed to load alerts:', e)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const handleCreate = async () => {
    try {
      const rule = await createAlertRule({
        ...form,
        ticker: form.ticker.toUpperCase(),
        threshold: form.threshold ? parseFloat(form.threshold) : null,
      })
      setRules([...rules, rule])
      setShowCreate(false)
      setForm({ name: '', ticker: '', condition: 'PRICE_ABOVE', threshold: '', severity: 'MEDIUM' })
    } catch (e) {
      console.error('Failed to create rule:', e)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteAlertRule(id)
      setRules(rules.filter((r) => r.id !== id))
    } catch (e) {
      console.error('Failed to delete rule:', e)
    }
  }

  if (loading) {
    return (
      <div className="alerts-loading">
        <Bell size={32} className="spin" />
        <p>Loading alerts...</p>
      </div>
    )
  }

  return (
    <div className="alerts-panel">
      <div className="alerts-header">
        <h1>Alerts</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <Plus size={16} />
          New Alert Rule
        </button>
      </div>

      {showCreate && (
        <div className="create-rule-form">
          <input
            placeholder="Rule name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Ticker"
            value={form.ticker}
            onChange={(e) => setForm({ ...form, ticker: e.target.value })}
          />
          <select
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
          >
            {Object.entries(CONDITION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Threshold"
            value={form.threshold}
            onChange={(e) => setForm({ ...form, threshold: e.target.value })}
          />
          <select
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <button className="btn-primary" onClick={handleCreate}>Save Rule</button>
        </div>
      )}

      <div className="alerts-grid">
        <div className="rules-section">
          <h3>Alert Rules ({rules.length})</h3>
          {rules.length === 0 ? (
            <p className="empty-text">No rules configured. Create one to get started.</p>
          ) : (
            <div className="rules-list">
              {rules.map((rule) => (
                <div key={rule.id} className="rule-card">
                  <div className="rule-info">
                    <h4>{rule.name}</h4>
                    <p className="rule-desc">
                      {rule.ticker} — {CONDITION_LABELS[rule.condition] || rule.condition}
                      {rule.threshold ? ` @ ${rule.threshold}` : ''}
                    </p>
                    <span className={`severity-badge ${rule.severity?.toLowerCase()}`}>
                      {rule.severity}
                    </span>
                  </div>
                  <button className="btn-icon" onClick={() => handleDelete(rule.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="history-section">
          <h3>Alert History ({alerts.length})</h3>
          {alerts.length === 0 ? (
            <p className="empty-text">No alerts triggered yet</p>
          ) : (
            <div className="alerts-list">
              {alerts.map((alert) => (
                <div key={alert.id} className="alert-item">
                  <AlertTriangle size={16} className={`severity-${alert.severity?.toLowerCase()}`} />
                  <div className="alert-content">
                    <p className="alert-message">{alert.message}</p>
                    <div className="alert-meta">
                      <span className={`severity-badge ${alert.severity?.toLowerCase()}`}>
                        {alert.severity}
                      </span>
                      <span className="alert-date">
                        {alert.triggered_at?.split('T')[0]} {alert.triggered_at?.split('T')[1]?.split('.')[0]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
