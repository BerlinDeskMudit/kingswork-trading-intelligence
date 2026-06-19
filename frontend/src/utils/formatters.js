export function formatPrice(price) {
  if (price == null || isNaN(price)) return '$0.00'
  return '$' + Number(price).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatChange(change) {
  if (change == null || isNaN(change)) return { text: '0.00', positive: true }
  const positive = change >= 0
  return {
    text: (positive ? '+' : '') + change.toFixed(2),
    positive,
  }
}

export function formatPercent(pct) {
  if (pct == null || isNaN(pct)) return { text: '0.00%', positive: true }
  const positive = pct >= 0
  return {
    text: (positive ? '+' : '') + pct.toFixed(2) + '%',
    positive,
  }
}

export function formatVolume(vol) {
  if (vol == null || isNaN(vol)) return '0'
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B'
  if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M'
  if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K'
  return vol.toString()
}

export function formatMarketCap(cap) {
  if (cap == null || isNaN(cap)) return 'N/A'
  if (cap >= 1e12) return '$' + (cap / 1e12).toFixed(2) + 'T'
  if (cap >= 1e9) return '$' + (cap / 1e9).toFixed(2) + 'B'
  if (cap >= 1e6) return '$' + (cap / 1e6).toFixed(2) + 'M'
  return '$' + cap.toLocaleString()
}

export function signalColor(signal) {
  switch (signal) {
    case 'STRONG_BUY':
    case 'BUY':
      return 'var(--signal-buy)'
    case 'STRONG_SELL':
    case 'SELL':
      return 'var(--signal-sell)'
    default:
      return 'var(--signal-neutral)'
  }
}

export function signalLabel(signal) {
  switch (signal) {
    case 'STRONG_BUY': return 'Strong Buy'
    case 'BUY': return 'Buy'
    case 'SELL': return 'Sell'
    case 'STRONG_SELL': return 'Strong Sell'
    default: return 'Neutral'
  }
}

export function generateClientId() {
  return 'client_' + Math.random().toString(36).substring(2, 10)
}
