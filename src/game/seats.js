// 앉을 수 있는 가구: 폭신한 안락의자, 흔들의자, 빈백, 소파, 창가 벤치
// 각 가구는 '뒤 레이어'(캐릭터보다 먼저)와 '앞 레이어'(캐릭터 위에 덮임)로 나뉩니다.
import { makeCanvas, painter, outline, shade, mirror } from './pixel.js'
import { TILE } from './map.js'

const OUT = '#2a1813'
const WOOD = '#8a5532'
const WOOD_D = '#5a331d'
const WOOD_L = '#b07a48'
const CREAM = '#f3e6cb'

function canvas(w, h, fn) {
  const c = makeCanvas(w, h)
  fn(painter(c.getContext('2d')))
  return outline(c, OUT)
}

/** 모서리가 둥근 사각형 */
function blob(p, x, y, w, h, color, r = 2) {
  for (let i = 0; i < h; i++) {
    let inset = 0
    if (i < r) inset = r - i
    else if (i >= h - r) inset = i - (h - r - 1)
    p(x + inset, y + i, w - inset * 2, 1, color)
  }
}

/** 폭신한 천 질감: 위쪽 밝게, 아래쪽 어둡게 */
function plush(p, x, y, w, h, col, r = 2) {
  blob(p, x, y, w, h, col, r)
  blob(p, x + 1, y, w - 2, Math.max(1, Math.floor(h / 4)), shade(col, 0.18), Math.max(0, r - 1))
  p(x + r, y + h - 2, w - r * 2, 1, shade(col, -0.18))
}

/** 체크무늬 담요 */
function plaid(p, x, y, w, h, base = CREAM, line = '#c8384f') {
  p(x, y, w, h, base)
  for (let i = 1; i < w; i += 4) p(x + i, y, 1, h, line)
  for (let j = 2; j < h; j += 4) p(x, y + j, w, 1, line)
  for (let i = 0; i < w; i += 2) p(x + i, y + h, 1, 1, base) // 술
}

function tufts(p, x, y, w, h, col) {
  const d = shade(col, -0.28)
  for (let yy = y; yy < y + h; yy += 4) for (let xx = x + ((yy - y) / 4) % 2 * 2; xx < x + w; xx += 4) p(xx, yy, 1, 1, d)
}

const flip = (layers) =>
  layers.map((l) => ({ ...l, canvas: mirror(l.canvas), ox: TILE - (l.ox + l.canvas.width) }))

// ───────────────────── 안락의자 ─────────────────────
function armchairDown(o) {
  const col = o.color
  const back = canvas(24, 26, (p) => {
    plush(p, 2, 0, 20, 17, col, 4)
    tufts(p, 6, 4, 12, 9, col)
    plush(p, 4, 14, 16, 8, shade(col, 0.1), 2)
    if (o.throw) {
      plaid(p, 14, 1, 7, 10, CREAM, o.throw)
      p(14, 11, 7, 1, shade(CREAM, -0.15))
    }
  })
  const front = canvas(26, 16, (p) => {
    p(6, 9, 14, 4, shade(col, -0.25))
    p(6, 9, 14, 1, shade(col, -0.1))
    plush(p, 0, 0, 7, 14, col, 3)
    plush(p, 19, 0, 7, 14, col, 3)
    p(1, 1, 5, 1, shade(col, 0.3))
    p(20, 1, 5, 1, shade(col, 0.3))
    p(2, 14, 2, 2, WOOD_D)
    p(22, 14, 2, 2, WOOD_D)
  })
  return [
    { canvas: back, ox: -4, oy: -12 },
    { canvas: front, ox: -5, oy: 2, sort: 4 },
  ]
}

function armchairSide(o) {
  const col = o.color
  const back = canvas(26, 26, (p) => {
    plush(p, 0, 0, 8, 23, col, 3)
    tufts(p, 2, 4, 4, 14, col)
    plush(p, 5, 6, 18, 6, col, 2)
    plush(p, 6, 11, 17, 10, shade(col, 0.1), 2)
    if (o.throw) {
      plaid(p, 1, 2, 5, 14, CREAM, o.throw)
    }
    p(7, 23, 2, 3, WOOD_D)
    p(20, 23, 2, 3, WOOD_D)
  })
  const front = canvas(26, 9, (p) => {
    plush(p, 4, 0, 20, 7, col, 3)
    p(5, 1, 18, 1, shade(col, 0.3))
  })
  const layers = [
    { canvas: back, ox: -5, oy: -10 },
    { canvas: front, ox: -5, oy: 8, sort: 4 },
  ]
  return o.dir === 'left' ? flip(layers) : layers
}

// ───────────────────── 흔들의자 ─────────────────────
function rockingChair(o) {
  const back = canvas(24, 28, (p) => {
    // 둥근 등받이 살
    p(3, 0, 18, 3, WOOD)
    p(3, 0, 18, 1, WOOD_L)
    p(2, 1, 2, 22, WOOD)
    p(20, 1, 2, 22, WOOD)
    for (const x of [6, 9, 12, 15, 18]) p(x, 3, 1, 13, WOOD_L)
    // 걸쳐 둔 뜨개 담요
    plaid(p, 4, 2, 9, 11, '#e9d3a8', '#6a8f5a')
    // 패치워크 방석
    plush(p, 3, 15, 18, 7, o.color, 2)
    p(8, 16, 4, 4, shade(o.color, 0.25))
    p(14, 17, 3, 3, '#f2c14e')
  })
  const front = canvas(28, 14, (p) => {
    // 팔걸이
    p(0, 0, 5, 3, WOOD)
    p(0, 0, 5, 1, WOOD_L)
    p(23, 0, 5, 3, WOOD)
    p(23, 0, 5, 1, WOOD_L)
    p(2, 3, 2, 7, WOOD)
    p(24, 3, 2, 7, WOOD)
    // 흔들 다리
    for (let x = 0; x < 28; x++) {
      const y = 10 + Math.round(((x - 13.5) / 13.5) ** 2 * -2.5)
      p(x, y + 1, 1, 2, WOOD_D)
    }
  })
  return [
    { canvas: back, ox: -4, oy: -14 },
    { canvas: front, ox: -6, oy: 3, sort: 4 },
  ]
}

// ───────────────────── 빈백 ─────────────────────
function beanbag(o) {
  const col = o.color
  const back = canvas(24, 18, (p) => {
    plush(p, 0, 2, 24, 16, col, 5)
    blob(p, 4, 0, 16, 6, col, 3)
    p(6, 1, 8, 1, shade(col, 0.3))
    p(5, 8, 14, 1, shade(col, -0.15))
  })
  const front = canvas(26, 9, (p) => {
    plush(p, 0, 0, 26, 8, shade(col, 0.05), 3)
    p(4, 1, 6, 1, shade(col, 0.3))
  })
  return [
    { canvas: back, ox: -4, oy: -4 },
    { canvas: front, ox: -5, oy: 9, sort: 4 },
  ]
}

// ───────────────────── 소파 (벽난로를 바라봄) ─────────────────────
function sofaUp(o) {
  const w = o.w * TILE
  const col = o.color
  const back = canvas(w + 10, 16, (p) => {
    blob(p, 2, 0, w + 6, 16, shade(col, -0.25), 3)
    for (let x = 6; x < w + 2; x += 16) plush(p, x, 1, 14, 8, shade(col, 0.1), 2)
    // 등 쪽 쿠션
    plush(p, 5, 0, 9, 7, '#f2c14e', 2)
    plush(p, w - 3, 0, 9, 7, '#e9d3a8', 2)
    plush(p, 0, 3, 7, 13, col, 3)
    plush(p, w + 3, 3, 7, 13, col, 3)
  })
  const front = canvas(w + 10, 16, (p) => {
    plush(p, 1, 0, w + 8, 13, col, 3)
    tufts(p, 6, 3, w - 2, 8, col)
    // 등받이에 걸쳐 둔 담요
    plaid(p, w - 20, 0, 16, 12, CREAM, '#c8384f')
    p(w - 20, 12, 16, 1, shade(CREAM, -0.2))
    p(3, 13, 2, 3, WOOD_D)
    p(w + 5, 13, 2, 3, WOOD_D)
  })
  return [
    { canvas: back, ox: -5, oy: 0 },
    { canvas: front, ox: -5, oy: 6, sort: 4 },
  ]
}

// ───────────────────── 책상 의자 ─────────────────────
function chairUp(o) {
  const back = canvas(16, 12, (p) => {
    p(2, 2, 12, 9, WOOD_L)
    plush(p, 3, 2, 10, 7, o.color || '#c8384f', 2)
    p(2, 10, 2, 2, WOOD_D)
    p(12, 10, 2, 2, WOOD_D)
  })
  const front = canvas(16, 14, (p) => {
    p(2, 0, 12, 3, WOOD)
    p(2, 0, 12, 1, WOOD_L)
    for (const x of [3, 7, 11]) p(x, 3, 2, 7, WOOD)
    p(2, 10, 12, 2, WOOD)
    p(2, 12, 2, 2, WOOD_D)
    p(12, 12, 2, 2, WOOD_D)
  })
  return [
    { canvas: back, ox: 0, oy: 2 },
    { canvas: front, ox: 0, oy: 5, sort: 4 },
  ]
}

// ───────────────────── 창가 벤치 ─────────────────────
function bench(o) {
  const w = o.w * TILE
  const c = canvas(w, 19, (p) => {
    p(1, 0, w - 2, 7, shade(o.color, -0.3))
    plush(p, 2, 0, 11, 8, '#f2c14e', 3)
    p(6, 3, 3, 2, '#ffe39a')
    plush(p, w - 13, 0, 11, 8, '#e9d3a8', 3)
    p(w - 9, 3, 3, 2, '#ffffff')
    plush(p, 1, 7, w - 2, 6, o.color, 2)
    p(1, 12, w - 2, 7, WOOD)
    for (let x = 4; x < w - 2; x += 8) p(x, 13, 5, 5, WOOD_L)
    // 늘어뜨린 뜨개 담요
    plaid(p, 4, 9, 10, 8, '#e9d3a8', '#6a8f5a')
  })
  return [{ canvas: c, ox: 0, oy: TILE - 19 }]
}

const SEAT_BUILDERS = { armchairDown, armchairSide, rockingChair, beanbag, sofaUp, chairUp, bench }

export function buildSeat(o) {
  const b = SEAT_BUILDERS[o.type]
  return b ? { layers: b(o) } : null
}

/** 캐릭터가 앉았을 때 스프라이트 위치 보정 (px) */
export const SIT_OFFSET = {
  armchairDown: { x: 0, y: 1 },
  armchairSide: { x: 0, y: 0 },
  rockingChair: { x: 0, y: 1 },
  beanbag: { x: 0, y: 3 },
  sofaUp: { x: 0, y: 0 },
  chairUp: { x: 0, y: 0 },
  bench: { x: 0, y: 0 },
}
