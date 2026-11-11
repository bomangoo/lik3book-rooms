// 게임 엔진: 상태 갱신, 입력, 렌더링 (React 와 분리)
import { makeCanvas } from './pixel.js'
import { getSprite, ANCHOR_X, ANCHOR_Y } from './characters.js'
import { buildFurniture } from './furniture.js'
import { SIT_OFFSET } from './seats.js'
import { iconCanvas } from './icons.js'
import { buildBackground, buildCeiling, buildYard, EXT_TOP, EXT_BOTTOM } from './background.js'
import { findPath, nearestWalkable } from './pathfind.js'
import {
  TILE, WORLD_W, WORLD_H, OBJECTS, WINDOWS, LIGHTS, SPAWN_TILES,
  isWalkable, getSeat, approachTiles,
} from './map.js'

const SPEED = 62 // px/s
const WALK_FRAMES = ['walkA', 'stand', 'walkB', 'stand']
const KEY_DIRS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
}
const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

const FIRE_LINES = ['따뜻하다…', '장작 타는 소리가 좋다', '손끝까지 녹는다', '타닥타닥…']
const TREE_LINES = ['반짝반짝…', '메리 크리스마스!', '소원을 하나 빌어볼까', '별이 예쁘다']

const tileCenter = (x, y) => [x * TILE + TILE / 2, y * TILE + 13]

function dirToward(fx, fy, tx, ty) {
  const dx = tx - fx
  const dy = ty - fy
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

export class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ profile: {name: string, charId: string}, onAction?: Function, onNet?: Function, onSelfChange?: Function }} opts
   */
  constructor(canvas, { profile, onAction, onNet, onSelfChange }) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.onAction = onAction || (() => {})
    this.onNet = onNet || (() => {})
    this.onSelfChange = onSelfChange || (() => {})
    this.world = makeCanvas(WORLD_W, WORLD_H)
    this.wctx = this.world.getContext('2d')
    this.light = makeCanvas(WORLD_W, WORLD_H)
    this.lctx = this.light.getContext('2d')
    this.bg = buildBackground()
    this.ceiling = buildCeiling()
    this.yard = buildYard()
    this.yardFlakes = Array.from({ length: 70 }, () => ({ x: Math.random() * WORLD_W, y: -EXT_TOP + Math.random() * (WORLD_H + EXT_TOP + EXT_BOTTOM), s: 6 + Math.random() * 10, ph: Math.random() * 6 }))
    this.furniture = OBJECTS.map((o) => ({ o, ...buildFurniture(o) }))
    this.flakes = WINDOWS.map((w) =>
      Array.from({ length: 22 }, () => ({ x: Math.random() * w.w, y: Math.random() * w.h, s: 4 + Math.random() * 7, ph: Math.random() * 6 })),
    )
    this.sparks = []
    this.marker = null
    this.keys = new Set()
    this.players = new Map()
    this.time = 0
    this.cam = { x: 0, y: 0, scale: 1 }
    this.dpr = 1

    const [sx, sy] = SPAWN_TILES[Math.floor(Math.random() * SPAWN_TILES.length)]
    this.me = this.addPlayer({ id: 'me', name: profile.name, charId: profile.charId, x: sx, y: sy, dir: 'up', pose: 'stand' }, true)

    this._loop = this._loop.bind(this)
    this._onKeyDown = this._onKeyDown.bind(this)
    this._onKeyUp = this._onKeyUp.bind(this)
    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
  }

  // ─────────────── 생명주기 ───────────────
  start() {
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    window.addEventListener('blur', () => this.keys.clear())
    this.canvas.addEventListener('pointerdown', this._onPointerDown)
    this.canvas.addEventListener('pointermove', this._onPointerMove)
    this._ro = new ResizeObserver(() => this.resize())
    this._ro.observe(this.canvas)
    this.resize()
    this._last = performance.now()
    this._raf = requestAnimationFrame(this._loop)
  }

  stop() {
    cancelAnimationFrame(this._raf)
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    this.canvas.removeEventListener('pointerdown', this._onPointerDown)
    this.canvas.removeEventListener('pointermove', this._onPointerMove)
    this._ro?.disconnect()
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr))
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr))
    // 화면을 가득 채우도록 배율 결정 → 남는 부분은 카메라가 따라감.
    // 세로로 긴 화면에서는 너무 확대되지 않도록 최소 12칸 너비를 보장하고,
    // 위/아래 남는 공간은 서까래(천장)와 눈 쌓인 마당으로 채웁니다.
    const { width: sw, height: sh } = this.canvas
    const cover = Math.max(sw / WORLD_W, sh / WORLD_H)
    const minTiles = sw / (12 * TILE)
    this.cam.scale = Math.min(cover, Math.max(minTiles, sh / (WORLD_H + EXT_TOP + EXT_BOTTOM)))
  }

  _loop(now) {
    const dt = Math.min(0.05, (now - this._last) / 1000)
    this._last = now
    this.time += dt
    this.update(dt)
    this.render()
    this._raf = requestAnimationFrame(this._loop)
  }

  // ─────────────── 플레이어 ───────────────
  addPlayer(p, isMe = false) {
    const [px, py] = tileCenter(p.x, p.y)
    const e = {
      id: p.id, name: p.name, charId: p.charId, isMe,
      tx: p.x, ty: p.y, px, py, step: null, path: [],
      dir: p.dir || 'down', pose: p.pose || 'stand', walkT: 0,
      bubble: null, emote: null, seat: getSeat(p.x, p.y),
    }
    this.players.set(p.id, e)
    return e
  }

  removePlayer(id) {
    if (id !== 'me') this.players.delete(id)
  }

  clearRemotes() {
    for (const id of [...this.players.keys()]) if (id !== 'me') this.players.delete(id)
  }

  remoteMove(id, x, y, dir) {
    const e = this.players.get(id)
    if (!e) return
    e.pose = 'stand'
    e.seat = null
    const last = e.path.length ? e.path[e.path.length - 1] : e.step || [e.tx, e.ty]
    if (Math.abs(last[0] - x) + Math.abs(last[1] - y) > 2 || e.path.length > 6) {
      e.path = []
      e.step = null
      e.tx = x
      e.ty = y
      ;[e.px, e.py] = tileCenter(x, y)
      e.dir = dir
      return
    }
    e.path.push([x, y])
  }

  remotePose(id, pose, dir, x, y) {
    const e = this.players.get(id)
    if (!e) return
    if (pose !== 'stand' && x != null) {
      e.path = []
      e.step = null
      e.tx = x
      e.ty = y
      ;[e.px, e.py] = tileCenter(x, y)
    }
    e.pose = pose
    e.dir = dir || e.dir
    e.seat = getSeat(e.tx, e.ty)
  }

  showBubble(id, text, ms = 6000, thought = false) {
    const e = this.players.get(id)
    if (e) e.bubble = { text, until: this.time + ms / 1000, thought }
  }

  showEmote(id, emote) {
    const e = this.players.get(id)
    if (e) e.emote = { text: emote, until: this.time + 2.5 }
  }

  /** 내 상태(접속 시 서버에 알릴 정보) */
  snapshot() {
    const m = this.me
    return { x: m.tx, y: m.ty, dir: m.dir, pose: m.pose }
  }

  // ─────────────── 내 행동 ───────────────
  say(text) {
    this.showBubble('me', text)
    this.onNet({ t: 'chat', text })
  }

  emote(emote) {
    this.showEmote('me', emote)
    this.onNet({ t: 'emote', emote })
  }

  setPose(pose) {
    const m = this.me
    if (m.step || m.path.length) {
      m.path = []
    }
    m.pose = pose
    this.onNet({ t: 'pose', pose, dir: m.dir, x: m.tx, y: m.ty })
    this._emitSelf()
  }

  standUp() {
    const m = this.me
    const wasSeat = m.seat
    m.pose = 'stand'
    m.seat = null
    this.onNet({ t: 'pose', pose: 'stand', dir: m.dir, x: m.tx, y: m.ty })
    if (wasSeat && !isWalkable(m.tx, m.ty)) {
      const goals = [[m.tx, m.ty + 1], [m.tx, m.ty - 1], [m.tx - 1, m.ty], [m.tx + 1, m.ty]].filter(([x, y]) => isWalkable(x, y))
      const prefer = goals.sort((a, b) => (a[1] > m.ty ? -1 : 0) - (b[1] > m.ty ? -1 : 0))[0]
      if (prefer) m.path = [prefer]
    }
    this._emitSelf()
  }

  _emitSelf() {
    const m = this.me
    this.onSelfChange({ pose: m.pose, seated: !!m.seat })
  }

  _seatTaken(seat) {
    for (const e of this.players.values()) {
      if (e.isMe) continue
      if (e.tx === seat.x && e.ty === seat.y && e.pose !== 'stand') return true
    }
    return false
  }

  walkTo(goals, pending = null) {
    const m = this.me
    if (m.pose !== 'stand' || m.seat) {
      m.pose = 'stand'
      m.seat = null
      this.onNet({ t: 'pose', pose: 'stand', dir: m.dir, x: m.tx, y: m.ty })
      this._emitSelf()
    }
    const from = m.step || [m.tx, m.ty]
    const path = findPath(from[0], from[1], goals)
    if (!path) return false
    m.path = path
    m.pending = pending
    if (!path.length && !m.step) this._arrive()
    return true
  }

  _arrive() {
    const m = this.me
    const act = m.pending
    m.pending = null
    if (!act) return
    if (act.type === 'sit') {
      if (this._seatTaken(act.seat)) {
        this.showBubble('me', '누가 먼저 앉았네요', 2500, true)
        this.standUp()
        return
      }
      m.seat = act.seat
      m.dir = act.seat.dir
      m.pose = 'sit'
      this.onNet({ t: 'pose', pose: 'sit', dir: m.dir, x: m.tx, y: m.ty })
      this._emitSelf()
      this.onAction('sit', act.seat)
      return
    }
    const o = act.object
    // 오브젝트 쪽을 바라보기
    let best = null
    let bestD = Infinity
    for (let yy = o.y; yy < o.y + o.h; yy++) {
      for (let xx = o.x; xx < o.x + o.w; xx++) {
        const d = Math.abs(xx - m.tx) + Math.abs(yy - m.ty)
        if (d < bestD) {
          bestD = d
          best = [xx, yy]
        }
      }
    }
    if (best) m.dir = dirToward(m.tx, m.ty, best[0], best[1])
    this.onNet({ t: 'pose', pose: 'stand', dir: m.dir, x: m.tx, y: m.ty })
    if (act.type === 'fire') {
      this.showBubble('me', FIRE_LINES[Math.floor(Math.random() * FIRE_LINES.length)], 3000, true)
      this._burst(o.x * TILE + 32, o.y * TILE - 2, ['#ffdf6b', '#ff9a3c'])
    } else if (act.type === 'tree') {
      this.showBubble('me', TREE_LINES[Math.floor(Math.random() * TREE_LINES.length)], 3000, true)
      this._burst(o.x * TILE + 24, o.y * TILE - 30, ['#ffd84a', '#ffffff', '#e85d75', '#5aa1e3'])
    }
    this.onAction(act.type, o)
  }

  _burst(x, y, colors) {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2
      const v = 10 + Math.random() * 30
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 15, life: 0.8 + Math.random() * 0.6, c: colors[i % colors.length] })
    }
  }

  // ─────────────── 입력 ───────────────
  // 키보드: 방향키(이동) + Space/Enter(상호작용·메뉴) + Esc(일어나기)
  _onKeyDown(ev) {
    if (this.inputLocked) return
    if (ev.target instanceof HTMLElement && ev.target.closest('input, textarea, [contenteditable], dialog, .modal')) return
    if (KEY_DIRS[ev.code]) {
      this.keys.add(ev.code)
      if (!ev.repeat) this.tapDir = KEY_DIRS[ev.code] // 짧게 눌러도 한 칸은 움직이도록
      ev.preventDefault()
    } else if (ev.code === 'Space' || ev.code === 'Enter' || ev.code === 'NumpadEnter') {
      ev.preventDefault()
      if (!ev.repeat) this._primary()
    } else if (ev.code === 'Escape') {
      if (this.me.seat || this.me.pose !== 'stand') {
        ev.preventDefault()
        this.standUp()
      }
    }
  }

  /** Space: 앞에 있는 물건과 상호작용, 없으면(또는 앉아 있으면) 행동 메뉴 */
  _primary() {
    const m = this.me
    if (m.step || m.path.length) return
    if (!m.seat && this._interactFacing()) return
    this.onAction('menu', { seated: !!m.seat })
  }

  /** React 쪽 메뉴/창이 열려 있는 동안 이동 입력을 막음 */
  setInputLocked(locked) {
    this.inputLocked = locked
    if (locked) {
      this.keys.clear()
      this.tapDir = null
    }
  }

  _onKeyUp(ev) {
    this.keys.delete(ev.code)
  }

  _interactFacing() {
    const m = this.me
    const [dx, dy] = DELTA[m.dir]
    const fx = m.tx + dx
    const fy = m.ty + dy
    const o = OBJECTS.find((ob) => ob.interact && fx >= ob.x && fx < ob.x + ob.w && fy >= ob.y && fy < ob.y + ob.h)
    if (!o) return false
    this._interactObject(o, fx, fy)
    return true
  }

  _interactObject(o, tx, ty) {
    if (o.interact === 'seat') {
      const clicked = o.seats.find((s) => s.x === tx && s.y === ty && !this._seatTaken(s))
      const m = this.me
      const free = o.seats
        .filter((s) => !this._seatTaken(s))
        .sort((a, b) => Math.abs(a.x - m.tx) + Math.abs(a.y - m.ty) - (Math.abs(b.x - m.tx) + Math.abs(b.y - m.ty)))
      const raw = clicked || free[0]
      const seat = raw && getSeat(raw.x, raw.y)
      if (!seat) {
        this.showBubble('me', '빈자리가 없어요', 2500, true)
        return
      }
      if (m.seat && m.seat.x === seat.x && m.seat.y === seat.y) return
      this.walkTo([[seat.x, seat.y]], { type: 'sit', seat })
      return
    }
    this.walkTo(approachTiles(o), { type: o.interact, object: o })
  }

  _toWorld(ev) {
    const r = this.canvas.getBoundingClientRect()
    const sx = (ev.clientX - r.left) * this.dpr
    const sy = (ev.clientY - r.top) * this.dpr
    return [this.cam.x + sx / this.cam.scale, this.cam.y + sy / this.cam.scale]
  }

  _hitObject(wx, wy) {
    let best = null
    for (const f of this.furniture) {
      if (!f.o.interact) continue
      for (const l of f.layers) {
        const x = f.o.x * TILE + l.ox
        const y = f.o.y * TILE + l.oy
        if (wx >= x && wx < x + l.canvas.width && wy >= y && wy < y + l.canvas.height) {
          const sort = (f.o.y + f.o.h) * TILE + (l.sort || 0)
          if (!best || sort > best.sort) best = { o: f.o, sort }
        }
      }
    }
    return best?.o || null
  }

  _onPointerDown(ev) {
    if (ev.button !== undefined && ev.button !== 0) return
    const [wx, wy] = this._toWorld(ev)
    const tx = Math.floor(wx / TILE)
    const ty = Math.floor(wy / TILE)
    const hit = this._hitObject(wx, wy)
    if (hit) {
      this._interactObject(hit, tx, ty)
      this.marker = { x: wx, y: wy, t: this.time, kind: 'object' }
      return
    }
    let goal = isWalkable(tx, ty) ? [tx, ty] : nearestWalkable(tx, ty)
    if (!goal) return
    if (this.walkTo([goal])) {
      const [mx, my] = tileCenter(goal[0], goal[1])
      this.marker = { x: mx, y: my, t: this.time, kind: 'floor' }
    }
  }

  _onPointerMove(ev) {
    if (ev.pointerType === 'touch') return
    const [wx, wy] = this._toWorld(ev)
    this.canvas.style.cursor = this._hitObject(wx, wy) ? 'pointer' : 'default'
  }

  // ─────────────── 갱신 ───────────────
  update(dt) {
    const m = this.me
    // 키보드 이동
    if (!m.step && !m.path.length) {
      const code = [...this.keys].reverse().find((k) => KEY_DIRS[k])
      const held = code ? KEY_DIRS[code] : this.tapDir
      this.tapDir = null
      if (held) {
        const dir = held
        if (m.pose !== 'stand' || m.seat) this.standUp()
        const [dx, dy] = DELTA[dir]
        const nx = m.tx + dx
        const ny = m.ty + dy
        m.dir = dir
        m.pending = null
        if (isWalkable(nx, ny)) m.path = [[nx, ny]]
      }
    }

    for (const e of this.players.values()) {
      if (!e.step && e.path.length) {
        e.step = e.path.shift()
        e.dir = dirToward(e.tx, e.ty, e.step[0], e.step[1])
        if (e.isMe) this.onNet({ t: 'move', x: e.step[0], y: e.step[1], dir: e.dir })
      }
      if (e.step) {
        const [gx, gy] = tileCenter(e.step[0], e.step[1])
        const speed = SPEED * (e.isMe ? 1 : 1 + e.path.length * 0.35)
        const dx = gx - e.px
        const dy = gy - e.py
        const d = Math.hypot(dx, dy)
        const move = speed * dt
        e.walkT += dt
        if (d <= move) {
          e.px = gx
          e.py = gy
          e.tx = e.step[0]
          e.ty = e.step[1]
          e.step = null
          if (!e.path.length) {
            e.walkT = 0
            if (e.isMe) this._arrive()
          }
        } else {
          e.px += (dx / d) * move
          e.py += (dy / d) * move
        }
      }
      if (e.bubble && this.time > e.bubble.until) e.bubble = null
      if (e.emote && this.time > e.emote.until) e.emote = null
    }

    // 창밖 눈
    WINDOWS.forEach((w, i) => {
      for (const f of this.flakes[i]) {
        f.y += f.s * dt
        f.x += Math.sin(this.time * 1.3 + f.ph) * 3 * dt
        if (f.y > w.h) {
          f.y = -1
          f.x = Math.random() * w.w
        }
      }
    })
    // 불티
    if (Math.random() < dt * 4) {
      const fp = this.furniture.find((f) => f.fire)
      const fx = fp.o.x * TILE + fp.fire.x + 4 + Math.random() * (fp.fire.w - 8)
      this.sparks.push({ x: fx, y: fp.o.y * TILE + fp.fire.y + fp.fire.h - 10, vx: (Math.random() - 0.5) * 6, vy: -14 - Math.random() * 10, life: 0.9, c: '#ffb347', ember: true })
    }
    for (const s of this.sparks) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      if (!s.ember) s.vy += 30 * dt
      s.life -= dt
    }
    this.sparks = this.sparks.filter((s) => s.life > 0)

    // 카메라
    const viewW = this.canvas.width / this.cam.scale
    const viewH = this.canvas.height / this.cam.scale
    const tx = Math.max(0, Math.min(WORLD_W - viewW, m.px - viewW / 2))
    const ty = viewH > WORLD_H
      ? Math.min(Math.max((WORLD_H - viewH) / 2, -EXT_TOP), WORLD_H + EXT_BOTTOM - viewH)
      : Math.max(0, Math.min(WORLD_H - viewH, m.py - 12 - viewH / 2))
    for (const f of this.yardFlakes) {
      f.y += f.s * dt
      f.x += Math.sin(this.time + f.ph) * 4 * dt
      if (f.y > WORLD_H + EXT_BOTTOM) {
        f.y = -EXT_TOP
        f.x = Math.random() * WORLD_W
      }
    }
    const k = this._camReady ? Math.min(1, dt * 5) : 1
    this.cam.x += (tx - this.cam.x) * k
    this.cam.y += (ty - this.cam.y) * k
    this._camReady = true
  }

  // ─────────────── 렌더링 ───────────────
  render() {
    const g = this.wctx
    const t = this.time
    g.imageSmoothingEnabled = false
    g.drawImage(this.bg, 0, 0)
    this._drawWindowSnow(g)
    this._drawWallLights(g)

    // y 정렬 그리기
    const list = []
    for (const f of this.furniture) {
      for (const l of f.layers) {
        list.push({
          sort: (f.o.y + f.o.h) * TILE + (l.sort ?? (f.o.seats ? -8 : 0)),
          draw: () => g.drawImage(l.canvas, f.o.x * TILE + l.ox + this._rock(f.o), f.o.y * TILE + l.oy),
        })
      }
    }
    for (const e of this.players.values()) list.push({ sort: e.py, draw: () => this._drawPlayer(g, e) })
    list.sort((a, b) => a.sort - b.sort)
    for (const d of list) d.draw()

    this._drawFlames(g, t)
    this._drawSparks(g)
    this._drawMarker(g)
    this._drawLighting(g, t)

    // 화면으로 확대
    const ctx = this.ctx
    const { scale, x: cx, y: cy } = this.cam
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#120c14'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.drawImage(this.world, -cx * scale, -cy * scale, WORLD_W * scale, WORLD_H * scale)
    if (cy < 0) ctx.drawImage(this.ceiling, -cx * scale, (-EXT_TOP - cy) * scale, WORLD_W * scale, EXT_TOP * scale)
    const viewH = this.canvas.height / scale
    if (cy + viewH > WORLD_H) {
      ctx.drawImage(this.yard, -cx * scale, (WORLD_H - cy) * scale, WORLD_W * scale, EXT_BOTTOM * scale)
      // 마당에 내리는 눈
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      const px = Math.max(1, scale * 0.9)
      for (const f of this.yardFlakes) {
        if (f.y < WORLD_H) continue
        ctx.fillRect((f.x - cx) * scale, (f.y - cy) * scale, f.s > 12 ? px * 2 : px, f.s > 12 ? px * 2 : px)
      }
    }
    this._drawOverlay(ctx)
  }

  _poseSprite(e) {
    const moving = !!e.step
    const seated = !!e.seat
    let body = 'stand'
    if (moving) body = WALK_FRAMES[Math.floor(e.walkT * 8) % 4]
    else if (seated) body = 'sit'
    const extra = {}
    if (e.pose === 'read') extra.book = true
    if (e.pose === 'think') extra.eyes = 'closed'
    return { body, extra }
  }

  /** 누군가 앉은 흔들의자는 천천히 흔들림 */
  _rock(o) {
    if (o.type !== 'rockingChair') return 0
    const seat = o.seats[0]
    for (const e of this.players.values()) {
      if (e.seat && e.seat.x === seat.x && e.seat.y === seat.y) return Math.round(Math.sin(this.time * 1.6))
    }
    return 0
  }

  _drawPlayer(g, e) {
    const { body, extra } = this._poseSprite(e)
    const sprite = getSprite(e.charId, e.dir, body, extra)
    const bob = body === 'walkA' || body === 'walkB' ? -1 : 0
    const off = e.seat ? SIT_OFFSET[e.seat.object.type] || { x: 0, y: 0 } : { x: 0, y: 0 }
    const sitOff = off.y
    const rockX = e.seat ? this._rock(e.seat.object) : 0
    if (!e.seat) {
      g.fillStyle = 'rgba(20,10,10,0.3)'
      g.beginPath()
      g.ellipse(Math.round(e.px), Math.round(e.py) + 1, 6, 2, 0, 0, Math.PI * 2)
      g.fill()
    }
    g.drawImage(sprite, Math.round(e.px - ANCHOR_X + off.x + rockX), Math.round(e.py - ANCHOR_Y + bob + sitOff))
  }

  _drawWindowSnow(g) {
    g.fillStyle = '#ffffff'
    WINDOWS.forEach((w, i) => {
      g.save()
      g.beginPath()
      g.rect(w.x, w.y, w.w, w.h)
      g.clip()
      for (const f of this.flakes[i]) g.fillRect(Math.round(w.x + f.x), Math.round(w.y + f.y), f.s > 8 ? 2 : 1, f.s > 8 ? 2 : 1)
      // 달
      if (i === 1) {
        g.fillStyle = '#fff6d0'
        g.fillRect(w.x + 4, w.y + 3, 4, 4)
        g.fillRect(w.x + 3, w.y + 4, 6, 2)
        g.fillStyle = '#ffffff'
      }
      g.restore()
    })
  }

  _drawWallLights(g) {
    const colors = ['#ff5a5a', '#ffd84a', '#6cc2ff', '#7cff9a', '#ff9ae0']
    for (let x = 6, i = 0; x < WORLD_W; x += 12, i++) {
      const y = 6 + Math.round(Math.abs(Math.sin(x / 24)) * 4) + 2
      const on = Math.sin(this.time * 2 + i * 1.7) > -0.3
      g.fillStyle = on ? colors[i % colors.length] : '#5a4040'
      g.fillRect(x, y, 2, 2)
    }
  }

  _drawFlames(g, t) {
    for (const f of this.furniture) {
      const bx = f.o.x * TILE
      const by = f.o.y * TILE
      if (f.fire) {
        const { x, y, w, h } = f.fire
        const base = by + y + h - 6
        for (let i = 0; i < w - 6; i += 2) {
          const n = Math.sin(t * 9 + i * 0.9) * 0.5 + Math.sin(t * 13.7 + i * 2.3) * 0.3 + 0.8
          const center = 1 - Math.abs(i - (w - 6) / 2) / ((w - 6) / 2)
          const fh = Math.max(2, Math.round((5 + center * 13) * n))
          const fx = bx + x + 3 + i
          g.fillStyle = '#d8432a'
          g.fillRect(fx, base - fh, 2, fh)
          g.fillStyle = '#ff9a3c'
          g.fillRect(fx, base - Math.round(fh * 0.7), 2, Math.round(fh * 0.7))
          g.fillStyle = '#ffdf6b'
          g.fillRect(fx, base - Math.round(fh * 0.4), 2, Math.round(fh * 0.4))
        }
        g.fillStyle = '#ff7b2f'
        g.fillRect(bx + x + 6, base, w - 12, 2)
      }
      for (const c of f.candles || []) {
        const flick = Math.sin(t * 15 + c.x) > 0.2 ? 1 : 0
        g.fillStyle = '#ff9a3c'
        g.fillRect(bx + c.x - 1, by + c.y - 1 - flick, 1, 3)
        g.fillStyle = '#ffe88a'
        g.fillRect(bx + c.x - 1 + 1, by + c.y - 2 - flick, 1, 3)
        g.fillRect(bx + c.x - 1, by + c.y, 2, 1)
      }
      if (f.treeLights) {
        const colors = ['#ff5a5a', '#ffd84a', '#6cc2ff', '#7cff9a', '#ff9ae0']
        f.treeLights.forEach((l, i) => {
          const v = Math.sin(t * 2.5 + l.phase)
          g.fillStyle = v > 0 ? colors[i % colors.length] : '#2a4a32'
          g.fillRect(bx + l.x, by + l.y, 1, 1)
          if (v > 0.6) {
            g.globalAlpha = 0.5
            g.fillRect(bx + l.x - 1, by + l.y, 3, 1)
            g.fillRect(bx + l.x, by + l.y - 1, 1, 3)
            g.globalAlpha = 1
          }
        })
        const s = f.star
        const pulse = (Math.sin(t * 3) + 1) / 2
        g.globalAlpha = 0.3 + pulse * 0.4
        g.fillStyle = '#fff6b0'
        g.fillRect(bx + s.x - 6, by + s.y - 1, 12, 1)
        g.fillRect(bx + s.x, by + s.y - 7, 1, 13)
        g.globalAlpha = 1
      }
    }
  }

  _drawSparks(g) {
    for (const s of this.sparks) {
      g.globalAlpha = Math.max(0, Math.min(1, s.life))
      g.fillStyle = s.c
      g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1)
    }
    g.globalAlpha = 1
  }

  _drawMarker(g) {
    const mk = this.marker
    if (!mk) return
    const age = this.time - mk.t
    if (age > 0.6) {
      this.marker = null
      return
    }
    const r = 2 + age * 8
    g.globalAlpha = 1 - age / 0.6
    g.strokeStyle = mk.kind === 'object' ? '#ffd84a' : '#ffffff'
    g.lineWidth = 1
    g.beginPath()
    g.ellipse(mk.x, mk.y, r, r * 0.5, 0, 0, Math.PI * 2)
    g.stroke()
    g.globalAlpha = 1
  }

  _drawLighting(g, t) {
    const l = this.lctx
    l.globalCompositeOperation = 'source-over'
    l.clearRect(0, 0, WORLD_W, WORLD_H)
    l.fillStyle = 'rgba(16,10,34,0.5)'
    l.fillRect(0, 0, WORLD_W, WORLD_H)
    l.globalCompositeOperation = 'destination-out'
    const flicker = 1 + Math.sin(t * 11) * 0.03 + Math.sin(t * 17.3) * 0.025
    for (const s of LIGHTS) {
      const r = s.kind === 'fire' ? s.r * flicker : s.kind === 'candle' ? s.r * (1 + Math.sin(t * 15 + s.x) * 0.05) : s.r
      const grad = l.createRadialGradient(s.x, s.y, 0, s.x, s.y, r)
      const strength = s.kind === 'window' ? 0.45 : 1
      grad.addColorStop(0, `rgba(0,0,0,${strength})`)
      grad.addColorStop(0.5, `rgba(0,0,0,${strength * 0.6})`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      l.fillStyle = grad
      l.fillRect(s.x - r, s.y - r, r * 2, r * 2)
    }
    g.drawImage(this.light, 0, 0)
    // 따뜻한 빛 번짐
    g.globalCompositeOperation = 'lighter'
    for (const s of LIGHTS) {
      if (s.kind === 'window') continue
      const r = (s.kind === 'fire' ? s.r * 0.75 * flicker : s.r * 0.6)
      const a = s.kind === 'fire' ? 0.2 : 0.12
      const [cr, cg, cb] = s.color
      const grad = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, r)
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`)
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
      g.fillStyle = grad
      g.fillRect(s.x - r, s.y - r, r * 2, r * 2)
    }
    g.globalCompositeOperation = 'source-over'
  }

  _drawOverlay(ctx) {
    const { scale, x: cx, y: cy } = this.cam
    const fs = Math.max(11 * this.dpr, Math.min(15 * this.dpr, scale * 3.6))
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const sorted = [...this.players.values()].sort((a, b) => a.py - b.py)
    for (const e of sorted) {
      const sx = (e.px - cx) * scale
      const footY = (e.py - cy) * scale
      const headY = (e.py - ANCHOR_Y + 6 - cy) * scale
      // 이름표
      ctx.font = `${fs}px Jua, "Gowun Dodum", sans-serif`
      const label = e.name
      const tw = ctx.measureText(label).width
      const ny = footY + fs * 1.0
      roundRect(ctx, sx - tw / 2 - fs * 0.45, ny - fs * 0.62, tw + fs * 0.9, fs * 1.24, fs * 0.4)
      ctx.fillStyle = e.isMe ? 'rgba(120,50,20,0.78)' : 'rgba(25,16,28,0.68)'
      ctx.fill()
      ctx.fillStyle = e.isMe ? '#ffe6a8' : '#f5ecd7'
      ctx.fillText(label, sx, ny + fs * 0.05)

      // 상태 아이콘
      let topY = headY - fs * 0.4
      if (!e.bubble && (e.pose === 'read' || e.pose === 'think' || e.emote)) {
        const icon = iconCanvas(e.emote?.text || (e.pose === 'read' ? 'book' : 'thought'))
        if (icon) {
          const bob = Math.sin(this.time * 2.4 + e.px) * fs * 0.15
          const size = Math.round(fs * 1.7)
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(icon, Math.round(sx - size / 2), Math.round(topY - size - fs * 0.1 + bob), size, size)
        }
      }
      // 말풍선
      if (e.bubble) this._drawBubble(ctx, sx, topY, e.bubble, fs)
    }
  }

  _drawBubble(ctx, x, bottom, bubble, fs) {
    const maxW = fs * 12
    ctx.font = `${bubble.thought ? 'italic ' : ''}${fs}px "Gowun Batang", serif`
    const lines = wrapText(ctx, bubble.text, maxW)
    const lh = fs * 1.3
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + fs * 1.2
    const h = lines.length * lh + fs * 0.6
    const left = Math.max(4, Math.min(this.canvas.width - w - 4, x - w / 2))
    const top = bottom - h - fs * 0.5
    const life = bubble.until - this.time
    ctx.globalAlpha = Math.min(1, life * 2)
    roundRect(ctx, left, top, w, h, fs * 0.6)
    ctx.fillStyle = bubble.thought ? 'rgba(255,248,232,0.86)' : 'rgba(255,252,244,0.96)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(60,35,30,0.55)'
    ctx.lineWidth = Math.max(1, fs * 0.08)
    ctx.stroke()
    // 꼬리
    ctx.beginPath()
    if (bubble.thought) {
      ctx.arc(x, top + h + fs * 0.3, fs * 0.16, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.moveTo(x - fs * 0.3, top + h - 1)
      ctx.lineTo(x, top + h + fs * 0.4)
      ctx.lineTo(x + fs * 0.3, top + h - 1)
      ctx.fill()
    }
    ctx.fillStyle = '#3a2620'
    lines.forEach((l, i) => ctx.fillText(l, left + w / 2, top + fs * 0.3 + lh * (i + 0.5)))
    ctx.globalAlpha = 1
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx, text, maxW) {
  const lines = []
  let line = ''
  for (const ch of [...text]) {
    const test = line + ch
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = ch
    } else line = test
  }
  if (line) lines.push(line)
  return lines.slice(0, 4)
}
