import { useEffect, useRef, useCallback, useState } from 'react'

export function useWebSocket(clientId) {
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState([])
  const listenersRef = useRef(new Map())
  const reconnectTimeoutRef = useRef(null)

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${protocol}//${host}/ws/${clientId}`

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        setConnected(true)
      }

      ws.onclose = () => {
        setConnected(false)
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          setMessages((prev) => [...prev.slice(-99), msg])

          const type = msg.type
          if (listenersRef.current.has(type)) {
            listenersRef.current.get(type).forEach((cb) => cb(msg))
          }
          if (listenersRef.current.has('*')) {
            listenersRef.current.get('*').forEach((cb) => cb(msg))
          }
        } catch (e) {
          console.error('WS parse error:', e)
        }
      }

      wsRef.current = ws
    } catch (e) {
      console.error('WS connection error:', e)
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }
  }, [clientId])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const subscribe = useCallback((ticker) => {
    send({ action: 'subscribe', ticker })
  }, [send])

  const unsubscribe = useCallback((ticker) => {
    send({ action: 'unsubscribe', ticker })
  }, [send])

  const on = useCallback((type, callback) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set())
    }
    listenersRef.current.get(type).add(callback)
    return () => listenersRef.current.get(type)?.delete(callback)
  }, [])

  return { connected, messages, send, subscribe, unsubscribe, on }
}
