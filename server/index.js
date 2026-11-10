// 겨울 서재 실시간 서버
// - 정적 파일(dist) 서빙 + WebSocket(/ws) 으로 방 안 사람들의 위치/자세/대화를 중계합니다.
// - 한 방(호실)에는 최대 5명. 가득 차면 자동으로 다음 호실로 안내합니다.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { WebSocketServer } from 'ws'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '../dist')
const PORT = Number(process.env.PORT || 8787)
const ROOM_CAPACITY = 5
const MAX_ROOMS = 200
const MAP_W = 24
const MAP_H = 16
const CHARACTER_IDS = new Set(['doryeong', 'nangja', 'monk', 'tiger', 'rabbit', 'snowkid'])
const POSES = new Set(['stand', 'sit', 'read', 'think'])
const DIRS = new Set(['down', 'up', 'left', 'right'])

/** @type {Map<number, Map<string, any>>} roomNo -> (id -> player) */
const rooms = new Map()

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/health') {
    const summary = [...rooms.entries()].map(([no, r]) => ({ room: no, people: r.size }))
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, capacity: ROOM_CAPACITY, rooms: summary }))
    return
  }
  serveStatic(url.pathname, res)
})

function serveStatic(pathname, res) {
  if (!fs.existsSync(DIST)) {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('겨울 서재 서버가 실행 중입니다. (개발 중에는 vite 개발 서버로 접속하세요)')
    return
  }
  let file = path.normalize(path.join(DIST, decodeURIComponent(pathname)))
  if (!file.startsWith(DIST)) {
    res.writeHead(403)
    res.end()
    return
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html')
  const ext = path.extname(file)
  const headers = { 'content-type': MIME[ext] || 'application/octet-stream' }
  if (file.includes(`${path.sep}assets${path.sep}`)) headers['cache-control'] = 'public, max-age=31536000, immutable'
  res.writeHead(200, headers)
  fs.createReadStream(file).pipe(res)
}

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4 * 1024 })

function pickRoom(preferred) {
  if (preferred && rooms.has(preferred) && rooms.get(preferred).size < ROOM_CAPACITY) return preferred
  for (let no = 1; no <= MAX_ROOMS; no++) {
    const r = rooms.get(no)
    if (!r || r.size < ROOM_CAPACITY) return no
  }
  return null
}

function broadcast(roomNo, msg, exceptId) {
  const room = rooms.get(roomNo)
  if (!room) return
  const data = JSON.stringify(msg)
  for (const p of room.values()) {
    if (p.id !== exceptId && p.ws.readyState === 1) p.ws.send(data)
  }
}

function publicPlayer(p) {
  return { id: p.id, name: p.name, charId: p.charId, x: p.x, y: p.y, dir: p.dir, pose: p.pose }
}

function cleanName(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .trim()
    .slice(0, 10) || '나그네'
}

const clampInt = (v, min, max) => Math.max(min, Math.min(max, Math.round(Number(v) || 0)))

wss.on('connection', (ws) => {
  /** @type {any} */
  let me = null
  let lastChat = 0
  ws.isAlive = true
  ws.on('pong', () => (ws.isAlive = true))

  const send = (msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg))

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }
    if (!msg || typeof msg !== 'object') return

    if (msg.t === 'hello' && !me) {
      const roomNo = pickRoom(Number(msg.room) || null)
      if (!roomNo) {
        send({ t: 'full' })
        ws.close()
        return
      }
      if (!rooms.has(roomNo)) rooms.set(roomNo, new Map())
      const room = rooms.get(roomNo)
      me = {
        id: randomUUID().slice(0, 8),
        ws,
        room: roomNo,
        name: cleanName(msg.name),
        charId: CHARACTER_IDS.has(msg.charId) ? msg.charId : 'doryeong',
        x: clampInt(msg.x ?? 11, 0, MAP_W - 1),
        y: clampInt(msg.y ?? 14, 0, MAP_H - 1),
        dir: DIRS.has(msg.dir) ? msg.dir : 'up',
        pose: POSES.has(msg.pose) ? msg.pose : 'stand',
      }
      room.set(me.id, me)
      send({
        t: 'welcome',
        id: me.id,
        room: roomNo,
        capacity: ROOM_CAPACITY,
        players: [...room.values()].filter((p) => p.id !== me.id).map(publicPlayer),
      })
      broadcast(roomNo, { t: 'join', player: publicPlayer(me) }, me.id)
      return
    }
    if (!me) return

    switch (msg.t) {
      case 'move': {
        me.x = clampInt(msg.x, 0, MAP_W - 1)
        me.y = clampInt(msg.y, 0, MAP_H - 1)
        if (DIRS.has(msg.dir)) me.dir = msg.dir
        me.pose = 'stand'
        broadcast(me.room, { t: 'move', id: me.id, x: me.x, y: me.y, dir: me.dir }, me.id)
        break
      }
      case 'pose': {
        if (!POSES.has(msg.pose)) return
        me.pose = msg.pose
        if (DIRS.has(msg.dir)) me.dir = msg.dir
        if (msg.x != null) me.x = clampInt(msg.x, 0, MAP_W - 1)
        if (msg.y != null) me.y = clampInt(msg.y, 0, MAP_H - 1)
        broadcast(me.room, { t: 'pose', id: me.id, pose: me.pose, dir: me.dir, x: me.x, y: me.y }, me.id)
        break
      }
      case 'chat': {
        const now = Date.now()
        if (now - lastChat < 800) return
        lastChat = now
        const text = String(msg.text ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80)
        if (!text) return
        broadcast(me.room, { t: 'chat', id: me.id, text }, me.id)
        break
      }
      case 'emote': {
        const emote = String(msg.emote ?? '').slice(0, 4)
        if (!emote) return
        broadcast(me.room, { t: 'emote', id: me.id, emote }, me.id)
        break
      }
    }
  })

  ws.on('close', () => {
    if (!me) return
    const room = rooms.get(me.room)
    if (room) {
      room.delete(me.id)
      broadcast(me.room, { t: 'leave', id: me.id })
      if (room.size === 0) rooms.delete(me.room)
    }
    me = null
  })
})

// 끊긴 연결 정리
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate()
      continue
    }
    ws.isAlive = false
    ws.ping()
  }
}, 25000)
wss.on('close', () => clearInterval(heartbeat))

server.listen(PORT, () => {
  console.log(`[winter-library] http://localhost:${PORT}  (ws: /ws, 방당 ${ROOM_CAPACITY}명)`)
})
