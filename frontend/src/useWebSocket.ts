import { useEffect, useRef, useCallback } from 'react'
import type { WSMessage } from './types'

type MessageHandler = (msg: WSMessage) => void

export function useWebSocket(
  path: string | null,
  onMessage: MessageHandler,
  onConnect?: () => void,
  onDisconnect?: () => void,
) {
  const wsRef = useRef<WebSocket | null>(null)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!path || !mountedRef.current) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${protocol}//${host}${path}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      onConnect?.()
      // Keep-alive ping every 25s
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 25000)
    }

    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      if (event.data === 'pong') return
      try {
        const msg: WSMessage = JSON.parse(event.data)
        onMessage(msg)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      if (pingRef.current) clearInterval(pingRef.current)
      onDisconnect?.()
      // Reconnect after 3s
      reconnectRef.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [path, onMessage, onConnect, onDisconnect])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (pingRef.current) clearInterval(pingRef.current)
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return wsRef
}
