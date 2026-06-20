import { useEffect, useRef, useState } from 'react'

interface WSMessage {
  price?: number
  change_pct?: number
  signal?: string
}

interface WebSocketState {
  price: number | null
  changePct: number | null
  signal: string | null
  connected: boolean
}

const CLIENT_ID = Math.random().toString(36).slice(2)

export function useWebSocket(ticker: string) {
  const [state, setState] = useState<WebSocketState>({
    price: null,
    changePct: null,
    signal: null,
    connected: false,
  })
  const wsRef = useRef<WebSocket | null>(null)
  const tickerRef = useRef<string>(ticker)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmounted = useRef(false)

  const send = (data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }

  const connect = (currentTicker: string) => {
    if (unmounted.current) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/${CLIENT_ID}`)
    wsRef.current = ws

    ws.onopen = () => {
      setState(s => ({ ...s, connected: true }))
      ws.send(JSON.stringify({ action: 'subscribe', ticker: currentTicker }))
    }

    ws.onmessage = (e) => {
      try {
        const msg: WSMessage = JSON.parse(e.data)
        setState(s => ({
          ...s,
          price: msg.price ?? s.price,
          changePct: msg.change_pct ?? s.changePct,
          signal: msg.signal ?? s.signal,
        }))
      } catch {}
    }

    ws.onclose = () => {
      setState(s => ({ ...s, connected: false }))
      if (!unmounted.current) {
        reconnectTimer.current = setTimeout(() => connect(tickerRef.current), 3000)
      }
    }

    ws.onerror = () => ws.close()
  }

  // Initial connect
  useEffect(() => {
    unmounted.current = false
    connect(ticker)
    return () => {
      unmounted.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Ticker change: unsubscribe old, subscribe new
  useEffect(() => {
    if (tickerRef.current !== ticker) {
      send({ action: 'unsubscribe', ticker: tickerRef.current })
      tickerRef.current = ticker
      send({ action: 'subscribe', ticker })
    }
  }, [ticker])

  return { price: state.price, changePct: state.changePct, signal: state.signal, connected: state.connected }
}
