// WebSocket 연결 (자동 재접속). 서버가 없으면 '혼자 모드'로 계속 이용할 수 있습니다.

function defaultUrl() {
  const envUrl = import.meta.env.VITE_WS_URL
  if (envUrl) return envUrl
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/ws`
}

/**
 * @param {{ getHello: () => object, onMessage: (msg: any) => void, onStatus: (s: 'connecting'|'online'|'offline') => void }} opts
 */
export function createConnection({ getHello, onMessage, onStatus }) {
  let ws = null
  let closed = false
  let retry = 0
  let timer = null
  let queue = []

  const open = () => {
    if (closed) return
    onStatus('connecting')
    try {
      ws = new WebSocket(defaultUrl())
    } catch {
      schedule()
      return
    }
    ws.onopen = () => {
      retry = 0
      ws.send(JSON.stringify({ t: 'hello', ...getHello() }))
    }
    ws.onmessage = (ev) => {
      let msg
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }
      if (msg.t === 'welcome') {
        onStatus('online')
        for (const m of queue) ws.send(JSON.stringify(m))
        queue = []
      }
      onMessage(msg)
    }
    ws.onclose = () => {
      ws = null
      if (!closed) {
        onStatus('offline')
        schedule()
      }
    }
    ws.onerror = () => ws?.close()
  }

  const schedule = () => {
    clearTimeout(timer)
    const delay = Math.min(15000, 1000 * 2 ** retry++)
    timer = setTimeout(open, delay)
  }

  open()

  return {
    send(msg) {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
      else if (msg.t === 'pose') queue = [msg] // 재접속 시 마지막 자세만 전달
    },
    close() {
      closed = true
      clearTimeout(timer)
      ws?.close()
    },
  }
}
