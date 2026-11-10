// 움직이지 않는 배경: 마룻바닥, 벽지, 창문, 족자, 러그, 그림자
import { makeCanvas, painter, rng, shade } from './pixel.js'
import { TILE, COLS, ROWS, WORLD_W, WORLD_H, WALL_ROWS, WINDOWS, SCROLLS, OBJECTS } from './map.js'

export function buildBackground() {
  const c = makeCanvas(WORLD_W, WORLD_H)
  const ctx = c.getContext('2d')
  const p = painter(ctx)
  const rand = rng(2026)
  const wallH = WALL_ROWS * TILE

  // ── 마룻바닥 ──
  const planks = ['#a8703f', '#b07a4a', '#9e6838', '#b5804f']
  for (let y = wallH; y < WORLD_H; y += 8) {
    let x = -Math.floor(rand() * 40)
    while (x < WORLD_W) {
      const len = 28 + Math.floor(rand() * 30)
      const col = planks[Math.floor(rand() * planks.length)]
      p(x, y, len, 8, col)
      p(x, y, len, 1, shade(col, 0.12))
      p(x, y + 7, len, 1, shade(col, -0.25))
      p(x + len - 1, y, 1, 8, shade(col, -0.3))
      if (rand() < 0.3) p(x + 6 + Math.floor(rand() * (len - 12)), y + 3, 2, 1, shade(col, -0.18))
      x += len
    }
  }

  // ── 뒷벽 ──
  p(0, 0, WORLD_W, wallH, '#4a2a33')
  for (let x = 0; x < WORLD_W; x += 8) p(x, 4, 3, wallH - 18, '#55303a')
  for (let x = 4; x < WORLD_W; x += 16) for (let y = 10; y < wallH - 16; y += 10) p(x + ((y / 10) % 2) * 8, y, 1, 1, '#a07a52')
  p(0, 0, WORLD_W, 4, '#6b3f24')
  p(0, 3, WORLD_W, 1, '#4a2a17')
  // 징두리 판벽
  p(0, wallH - 14, WORLD_W, 14, '#6b3f24')
  p(0, wallH - 14, WORLD_W, 1, '#8a5532')
  for (let x = 4; x < WORLD_W; x += 20) {
    p(x, wallH - 11, 16, 7, '#7a4a2b')
    p(x, wallH - 11, 16, 1, '#5a331d')
  }
  p(0, wallH - 3, WORLD_W, 3, '#3e2414')
  // 벽과 바닥 사이 그림자
  ctx.fillStyle = 'rgba(20,10,10,0.35)'
  ctx.fillRect(0, wallH, WORLD_W, 3)

  // ── 창문 ──
  for (const w of WINDOWS) {
    p(w.x - 3, w.y - 3, w.w + 6, w.h + 7, '#e8dcc8')
    p(w.x - 3, w.y - 3, w.w + 6, 1, '#fff6e6')
    const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h)
    g.addColorStop(0, '#16213d')
    g.addColorStop(1, '#2e4a73')
    ctx.fillStyle = g
    ctx.fillRect(w.x, w.y, w.w, w.h)
    // 먼 산과 소나무
    p(w.x, w.y + w.h - 8, w.w, 8, '#dfe8f3')
    for (let i = 0; i < w.w; i += 5) {
      const th = 4 + ((i * 7) % 5)
      p(w.x + i, w.y + w.h - 8 - th, 3, th, '#1d3a3a')
      p(w.x + i + 1, w.y + w.h - 9 - th, 1, 1, '#ffffff')
    }
    p(w.x + w.w / 2 - 1, w.y, 2, w.h, '#e8dcc8')
    p(w.x, w.y + w.h / 2 - 3, w.w, 2, '#e8dcc8')
    // 창틀 눈
    p(w.x - 4, w.y + w.h + 2, w.w + 8, 3, '#f5f8fc')
    // 커튼
    for (const cx of [w.x - 8, w.x + w.w + 2]) {
      p(cx, w.y - 5, 6, w.h + 12, '#8b2a35')
      p(cx + 1, w.y - 5, 1, w.h + 12, '#a63a46')
      p(cx + 4, w.y - 5, 1, w.h + 12, '#6e1f29')
      p(cx - 1, w.y + 14, 8, 2, '#d9b46a')
    }
    p(w.x - 10, w.y - 6, w.w + 20, 2, '#5a331d')
  }

  // ── 족자 ──
  for (const s of SCROLLS) {
    p(s.x - 1, s.y, 12, 2, '#5a331d')
    p(s.x, s.y + 2, 10, 26, '#efe2c4')
    p(s.x, s.y + 2, 10, 1, '#c8384f')
    p(s.x, s.y + 27, 10, 1, '#c8384f')
    p(s.x - 1, s.y + 28, 12, 2, '#5a331d')
    p(s.x + 4, s.y - 3, 2, 3, '#3a2116')
    ctx.fillStyle = '#1e1a1a'
    ctx.font = 'bold 9px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(s.text, s.x + 5, s.y + 15)
  }

  // ── 벽 위 가랜드 (전구는 동적으로) ──
  for (let x = 0; x < WORLD_W; x += 2) {
    const y = 6 + Math.round(Math.abs(Math.sin(x / 24)) * 4)
    p(x, y, 2, 2, x % 6 === 0 ? '#3f9a58' : '#2f7a45')
  }

  // ── 옆벽 & 아래벽 ──
  for (const x of [0, WORLD_W - TILE]) {
    const inner = x === 0 ? TILE - 4 : x
    p(x, wallH - 2, TILE, WORLD_H - wallH + 2, '#3a2420')
    p(inner, wallH - 2, 4, WORLD_H - wallH + 2, '#5a3a2a')
    for (let y = wallH + 6; y < WORLD_H; y += 24) p(x + 3, y, TILE - 8, 1, '#2a1a18')
  }
  ctx.fillStyle = 'rgba(20,10,10,0.25)'
  ctx.fillRect(TILE, wallH, 4, WORLD_H - wallH)
  ctx.fillRect(WORLD_W - TILE - 4, wallH, 4, WORLD_H - wallH)
  const bottomY = (ROWS - 1) * TILE
  p(0, bottomY + 4, WORLD_W, TILE - 4, '#3a2420')
  p(0, bottomY + 4, WORLD_W, 3, '#5a3a2a')
  // 문 & 발매트
  p(11 * TILE - 2, bottomY + 4, 2 * TILE + 4, TILE - 4, '#2a1a14')
  p(11 * TILE, bottomY + 4, 2 * TILE, 4, '#d9b46a')
  p(11 * TILE + 2, 14 * TILE + 3, 2 * TILE - 4, 10, '#7a5a3a')
  p(11 * TILE + 3, 14 * TILE + 4, 2 * TILE - 6, 8, '#9a7348')
  for (let x = 11 * TILE + 5; x < 13 * TILE - 5; x += 4) p(x, 14 * TILE + 7, 2, 2, '#c8384f')

  // ── 벽난로 앞 돌바닥 ──
  p(10 * TILE - 4, 4 * TILE, 4 * TILE + 8, 10, '#8a8379')
  for (let x = 10 * TILE - 4; x < 14 * TILE + 4; x += 12) p(x, 4 * TILE, 1, 10, '#6f685f')
  p(10 * TILE - 4, 4 * TILE + 9, 4 * TILE + 8, 1, '#5e574f')

  drawRug(p, 8 * TILE + 3, 6 * TILE + 2, 8 * TILE - 6, 7 * TILE - 2)
  drawRug(p, 17 * TILE + 2, 12 * TILE + 4, 5 * TILE, 3 * TILE - 6, ['#2f5a46', '#e8c170', '#24473a', '#3f7a5f'])

  // ── 가구 그림자 ──
  ctx.fillStyle = 'rgba(25,12,8,0.28)'
  for (const o of OBJECTS) {
    if (o.y < WALL_ROWS + 1 && o.type !== 'bench') continue
    ctx.beginPath()
    ctx.ellipse((o.x + o.w / 2) * TILE, (o.y + o.h) * TILE - 2, (o.w * TILE) / 2 + 1, 4, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  return c
}

function drawRug(p, x, y, w, h, pal = ['#a8323a', '#e8c170', '#7d1f2a', '#c24a4f']) {
  const [base, border, dark, light] = pal
  p(x + 2, y, w - 4, h, border)
  p(x, y + 2, w, h - 4, border)
  p(x + 3, y + 2, w - 6, h - 4, base)
  p(x + 2, y + 3, w - 4, h - 6, base)
  p(x + 5, y + 5, w - 10, h - 10, dark)
  p(x + 6, y + 6, w - 12, h - 12, base)
  // 마름모 무늬
  const cx = x + w / 2
  const cy = y + h / 2
  for (let i = 0; i < 14; i++) {
    p(cx - i, cy - 14 + i, 1, 1, light)
    p(cx + i, cy - 14 + i, 1, 1, light)
    p(cx - i, cy + 14 - i, 1, 1, light)
    p(cx + i, cy + 14 - i, 1, 1, light)
  }
  p(cx - 2, cy - 2, 4, 4, border)
  for (let xx = x + 10; xx < x + w - 10; xx += 8) {
    p(xx, y + 8, 2, 2, light)
    p(xx, y + h - 10, 2, 2, light)
  }
  // 술
  for (let xx = x + 4; xx < x + w - 4; xx += 3) {
    p(xx, y - 2, 1, 2, '#f3e9dc')
    p(xx, y + h, 1, 2, '#f3e9dc')
  }
}

// ───────────────────────────────────────────────
// 세로로 긴 화면(모바일)에서 방 위/아래에 보이는 확장 영역
// ───────────────────────────────────────────────
export const EXT_TOP = 96
export const EXT_BOTTOM = 128

/** 방 위쪽: 서까래와 청사초롱 */
export function buildCeiling() {
  const c = makeCanvas(WORLD_W, EXT_TOP)
  const ctx = c.getContext('2d')
  const p = painter(ctx)
  p(0, 0, WORLD_W, EXT_TOP, '#1a1014')
  for (let x = 8; x < WORLD_W; x += 48) {
    p(x, 0, 10, EXT_TOP, '#2e1a12')
    p(x, 0, 2, EXT_TOP, '#3e2414')
  }
  p(0, EXT_TOP - 14, WORLD_W, 14, '#4a2a17')
  p(0, EXT_TOP - 14, WORLD_W, 2, '#6b3f24')
  p(0, EXT_TOP - 2, WORLD_W, 2, '#2a1810')
  // 전구 줄
  const colors = ['#ff5a5a', '#ffd84a', '#6cc2ff', '#7cff9a', '#ff9ae0']
  for (let seg = 0; seg < WORLD_W; seg += 48) {
    for (let i = 0; i <= 48; i++) {
      const y = 46 + Math.sin((i / 48) * Math.PI) * 14
      p(seg + i, Math.round(y), 1, 1, '#2f4a32')
      if (i % 8 === 4) {
        const col = colors[((seg / 48) + i) % colors.length]
        glow(ctx, seg + i, y + 2, 6, col)
        p(seg + i - 1, Math.round(y) + 1, 2, 2, col)
      }
    }
  }
  // 청사초롱
  for (const x of [96, 288]) {
    p(x, 0, 1, 26, '#c9a86b')
    glow(ctx, x, 40, 34, '#ffb35a')
    p(x - 7, 26, 15, 3, '#c9a86b')
    p(x - 8, 29, 17, 10, '#2f5aa8')
    p(x - 8, 39, 17, 12, '#d6334a')
    p(x - 6, 31, 2, 18, 'rgba(255,240,200,0.35)')
    p(x - 7, 51, 15, 3, '#c9a86b')
    p(x - 1, 54, 3, 7, '#d6334a')
  }
  return c
}

function glow(ctx, x, y, r, col) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, col + '66')
  g.addColorStop(1, col + '00')
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

/** 방 아래쪽: 눈 쌓인 마당 (석등, 눈사람, 소나무) */
export function buildYard() {
  const c = makeCanvas(WORLD_W, EXT_BOTTOM)
  const ctx = c.getContext('2d')
  const p = painter(ctx)
  const rand = rng(99)
  p(0, 0, WORLD_W, EXT_BOTTOM, '#b9c6dc')
  for (let i = 0; i < 260; i++) p(Math.floor(rand() * WORLD_W), Math.floor(rand() * EXT_BOTTOM), 3, 1, rand() < 0.5 ? '#c9d5e8' : '#a9b7cf')
  // 처마 그림자
  ctx.fillStyle = 'rgba(30,30,60,0.35)'
  ctx.fillRect(0, 0, WORLD_W, 8)
  // 디딤돌 길
  for (let y = 10, i = 0; y < EXT_BOTTOM; y += 14, i++) {
    const x = 184 + ((i % 2) * 2 - 1) * 4
    p(x - 2, y, 20, 8, '#8a8f9c')
    p(x - 2, y, 20, 2, '#e8eef7')
  }
  // 발자국
  for (let y = 16; y < EXT_BOTTOM; y += 9) {
    p(168, y, 2, 3, '#9aa8c0')
    p(174, y + 4, 2, 3, '#9aa8c0')
  }
  // 석등
  for (const x of [150, 234]) {
    glow(ctx, x + 6, 26, 40, '#ffb35a')
    p(x, 44, 12, 6, '#8a8f9c')
    p(x + 3, 32, 6, 12, '#9aa0ab')
    p(x, 22, 12, 10, '#9aa0ab')
    p(x + 3, 25, 6, 5, '#ffd27a')
    p(x - 3, 17, 18, 5, '#7d838f')
    p(x - 3, 16, 18, 2, '#ffffff')
    p(x + 4, 12, 4, 4, '#7d838f')
  }
  // 눈사람
  const sx = 80
  p(sx, 60, 22, 18, '#f5f8fc')
  p(sx + 3, 44, 16, 16, '#f5f8fc')
  p(sx + 7, 50, 2, 2, '#2a1e24')
  p(sx + 13, 50, 2, 2, '#2a1e24')
  p(sx + 10, 53, 4, 2, '#e2763a')
  p(sx + 2, 59, 18, 3, '#c8384f')
  p(sx + 15, 61, 3, 6, '#c8384f')
  p(sx + 4, 40, 14, 4, '#2a1e24')
  p(sx + 7, 34, 8, 6, '#2a1e24')
  p(sx - 6, 64, 6, 1, '#6b3f24')
  p(sx + 22, 63, 7, 1, '#6b3f24')
  // 소나무
  for (const [tx, ty, s] of [[20, 20, 1], [44, 70, 0.8], [330, 30, 1.1], [360, 80, 0.9], [300, 96, 0.7]]) {
    const h = Math.round(44 * s)
    p(tx - 2, ty + h - 4, 4, 6, '#4a2a17')
    for (let y = 0; y < h - 4; y++) {
      const half = Math.round((y % 12) * 0.9 * s + y * 0.25 * s + 1)
      p(tx - half, ty + y, half * 2, 1, (y % 12) < 2 ? '#e8eef7' : y % 12 < 5 ? '#2f6a48' : '#1f4a34')
    }
  }
  // 울타리
  for (let x = 4; x < WORLD_W; x += 14) {
    if (x > 140 && x < 250) continue
    p(x, 100, 3, 18, '#6b4a33')
    p(x, 99, 3, 2, '#ffffff')
  }
  p(0, 105, 140, 2, '#6b4a33')
  p(252, 105, WORLD_W - 252, 2, '#6b4a33')
  // 밤 색조
  ctx.fillStyle = 'rgba(20,24,60,0.38)'
  ctx.fillRect(0, 0, WORLD_W, EXT_BOTTOM)
  for (const x of [156, 240]) glow(ctx, x, 26, 46, '#ffb35a')
  return c
}
