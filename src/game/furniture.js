// 가구 스프라이트 (모두 코드로 그리는 픽셀 아트)
import { makeCanvas, painter, outline, rng, pick, shade } from './pixel.js'
import { TILE } from './map.js'
import { buildSeat } from './seats.js'

const OUT = '#2a1813'
const BOOK_PALETTE = [
  '#c8384f', '#e2763a', '#f2c14e', '#3f8f5a', '#2f6e8a', '#3a5a8b', '#6a4c8b', '#8b3a3a',
  '#d9c7a3', '#5b7f4a', '#a8565c', '#7f5539', '#e8dcc8', '#4a6fb5',
]
const WOOD = '#7a4a2b'
const WOOD_D = '#5a331d'
const WOOD_L = '#9c6539'

function canvas(w, h, fn, withOutline = true) {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  fn(painter(ctx), ctx)
  return withOutline ? outline(c, OUT) : c
}

/** 책장 안 한 칸을 책으로 채움 */
function fillBooks(p, rand, x0, x1, top, height) {
  let x = x0
  while (x < x1) {
    const r = rand()
    if (r < 0.06 && x < x1 - 6) {
      // 작은 화분/촛대
      const kind = pick(rand, ['jar', 'plant'])
      if (kind === 'jar') {
        p(x + 1, top + height - 4, 3, 4, '#c9d6df')
        p(x + 1, top + height - 4, 3, 1, '#e8f0f5')
      } else {
        p(x + 1, top + height - 3, 4, 3, '#b5653b')
        p(x, top + height - 7, 2, 4, '#4f9a5a')
        p(x + 3, top + height - 8, 2, 5, '#3f8f5a')
      }
      x += 6
      continue
    }
    if (r < 0.1) {
      x += 2 // 빈틈
      continue
    }
    const w = 2 + Math.floor(rand() * 3)
    const h = Math.max(4, height - Math.floor(rand() * 4))
    const color = pick(rand, BOOK_PALETTE)
    const bw = Math.min(w, x1 - x)
    if (bw <= 0) break
    p(x, top + height - h, bw, h, color)
    p(x, top + height - h, 1, h, shade(color, 0.2))
    if (h > 5) p(x, top + height - h + 2, bw, 1, shade(color, -0.35))
    if (h > 7 && rand() < 0.5) p(x, top + height - 3, bw, 1, '#f2d27a')
    x += bw
  }
}

function shelf(o) {
  const w = o.w * TILE
  const h = 56
  const rand = rng(o.seed)
  const c = canvas(w, h, (p) => {
    p(0, 0, w, 4, WOOD_L)
    p(0, 3, w, 1, WOOD_D)
    p(0, 4, 3, h - 4, WOOD)
    p(w - 3, 4, 3, h - 4, WOOD)
    p(3, 4, w - 6, h - 8, '#3a2116')
    const rows = [[4, 11], [17, 11], [30, 11], [43, 9]]
    rows.forEach(([top, hh], i) => {
      fillBooks(p, rand, 3, w - 3, top, hh)
      if (i < rows.length - 1) {
        p(3, top + hh, w - 6, 1, WOOD_L)
        p(3, top + hh + 1, w - 6, 1, WOOD_D)
      }
    })
    p(0, h - 4, w, 4, WOOD_D)
    p(1, h - 4, w - 2, 1, WOOD)
    // 이름표
    p(w / 2 - 6, 0, 12, 3, '#d9b46a')
  })
  return { layers: [{ canvas: c, ox: 0, oy: TILE - h }] }
}

function fireplace(o) {
  const w = o.w * TILE
  const h = 56
  const c = canvas(w, h, (p) => {
    const brick = '#9a4b3a'
    const mortar = '#b97a64'
    // 굴뚝 벽
    p(4, 0, w - 8, 22, brick)
    for (let y = 0; y < 22; y += 4) {
      p(4, y, w - 8, 1, mortar)
      for (let x = 4 + ((y / 4) % 2) * 4; x < w - 4; x += 8) p(x, y, 1, 4, mortar)
    }
    // 리스
    const cx = w / 2
    const cy = 10
    for (let a = 0; a < Math.PI * 2; a += 0.18) {
      const x = Math.round(cx + Math.cos(a) * 6)
      const y = Math.round(cy + Math.sin(a) * 6)
      p(x - 1, y - 1, 3, 3, a % 0.7 < 0.2 ? '#4f9a5a' : '#2f7a45')
    }
    for (const [x, y] of [[cx - 5, cy - 2], [cx + 4, cy + 1], [cx - 2, cy + 5], [cx + 2, cy - 5]]) p(x, y, 2, 2, '#e23b4a')
    p(cx - 3, cy + 5, 6, 3, '#d6334a')
    p(cx - 1, cy + 7, 2, 3, '#d6334a')
    // 선반
    p(0, 22, w, 4, '#6b3f24')
    p(0, 22, w, 1, '#8a5532')
    p(2, 26, w - 4, 1, '#4a2a17')
    // 돌 테두리
    p(4, 27, w - 8, h - 27, '#8a8379')
    for (let y = 27; y < h; y += 6) {
      p(4, y, w - 8, 1, '#6f685f')
      for (let x = 4 + ((y / 6) % 2) * 6; x < w - 4; x += 12) p(x, y, 1, 6, '#6f685f')
    }
    p(4, 27, w - 8, 1, '#a9a296')
    // 아궁이
    p(18, 32, w - 36, 2, '#1a0f0c')
    p(16, 34, w - 32, h - 34, '#1a0f0c')
    p(18, 36, w - 36, h - 40, '#2a1510')
    // 장작
    p(20, h - 6, w - 40, 3, '#5a3420')
    p(22, h - 8, 10, 2, '#6b3f24')
    p(w - 32, h - 8, 10, 2, '#6b3f24')
    // 화로 받침
    p(14, h - 3, w - 28, 3, '#3a3534')
    // 가랜드
    for (let x = 1; x < w - 1; x += 2) {
      const y = 26 + Math.round(Math.sin(x / 5) * 1.5)
      p(x, y, 2, 2, '#2f7a45')
      if (x % 8 === 3) p(x, y + 1, 1, 1, '#e23b4a')
    }
    // 양말
    for (const sx of [8, w - 14]) {
      p(sx, 28, 6, 3, '#f3e9dc')
      p(sx, 31, 5, 7, '#c8384f')
      p(sx + 2, 36, 5, 3, '#c8384f')
      p(sx + 1, 33, 3, 1, '#ffffff')
    }
    // 촛대
    for (const sx of [6, w - 9]) {
      p(sx, 14, 3, 8, '#f3e9dc')
      p(sx, 14, 1, 8, '#ffffff')
      p(sx - 1, 21, 5, 1, '#c9a86b')
    }
  })
  return {
    layers: [{ canvas: c, ox: 0, oy: TILE - h }],
    fire: { x: 16, y: 34 - (h - TILE), w: w - 32, h: h - 34 },
    candles: [{ x: 7, y: 13 - (h - TILE) }, { x: w - 8, y: 13 - (h - TILE) }],
  }
}

function sideTable() {
  const c = canvas(14, 20, (p) => {
    p(1, 10, 12, 4, WOOD_L)
    p(1, 13, 12, 1, WOOD_D)
    p(6, 14, 2, 5, WOOD)
    p(3, 18, 8, 2, WOOD_D)
    // 촛대
    p(5, 3, 3, 7, '#f3e9dc')
    p(5, 3, 1, 7, '#ffffff')
    p(4, 9, 5, 1, '#c9a86b')
  })
  return { layers: [{ canvas: c, ox: 1, oy: TILE - 20 }], candles: [{ x: 7, y: 1 + TILE - 20 }] }
}

function lampTable() {
  const c = canvas(14, 30, (p) => {
    p(1, 20, 12, 4, WOOD_L)
    p(1, 23, 12, 1, WOOD_D)
    p(6, 24, 2, 4, WOOD)
    p(3, 28, 8, 2, WOOD_D)
    // 램프
    p(6, 11, 2, 9, '#c9a86b')
    p(4, 18, 6, 2, '#c9a86b')
    p(2, 2, 10, 9, '#f2d27a')
    p(3, 1, 8, 1, '#f2d27a')
    p(2, 9, 10, 2, '#d9a84a')
  })
  return { layers: [{ canvas: c, ox: 1, oy: TILE - 30 }] }
}

function floorLamp() {
  const c = canvas(14, 44, (p) => {
    p(6, 12, 2, 28, '#3a3030')
    p(3, 40, 8, 3, '#3a3030')
    p(1, 2, 12, 10, '#f2d27a')
    p(3, 1, 8, 1, '#f2d27a')
    p(1, 10, 12, 2, '#d9a84a')
    for (let x = 2; x < 12; x += 3) p(x, 12, 1, 1, '#d9a84a')
  })
  return { layers: [{ canvas: c, ox: 1, oy: TILE - 44 }] }
}

function teaTable(o) {
  const w = o.w * TILE
  const c = canvas(w, 18, (p) => {
    p(0, 6, w, 7, WOOD_L)
    p(0, 6, w, 1, '#b57a48')
    p(0, 12, w, 2, WOOD_D)
    p(2, 14, 2, 4, WOOD_D)
    p(w - 4, 14, 2, 4, WOOD_D)
    // 찻주전자
    p(4, 2, 8, 6, '#e8dcc8')
    p(6, 0, 4, 2, '#e8dcc8')
    p(12, 4, 3, 1, '#e8dcc8')
    p(5, 4, 6, 1, '#5aa1e3')
    // 찻잔
    p(17, 6, 3, 3, '#f3e9dc')
    p(17, 6, 3, 1, '#9a5a3a')
    p(23, 7, 3, 3, '#f3e9dc')
    p(23, 7, 3, 1, '#9a5a3a')
    // 곶감 접시
    p(14, 10, 8, 2, '#e8dcc8')
    p(15, 9, 2, 2, '#e2763a')
    p(18, 9, 2, 2, '#e2763a')
    // 초
    p(27, 1, 3, 7, '#f3e9dc')
  })
  return { layers: [{ canvas: c, ox: 0, oy: TILE - 18 }], candles: [{ x: 28, y: -1 + TILE - 18 }] }
}

function desk(o) {
  const w = o.w * TILE
  const c = canvas(w, 30, (p) => {
    p(0, 10, w, 8, WOOD_L)
    p(0, 10, w, 1, '#b57a48')
    p(0, 18, w, 12, WOOD)
    p(3, 20, 12, 4, WOOD_D)
    p(w - 15, 20, 12, 4, WOOD_D)
    p(8, 21, 2, 1, '#d9b46a')
    p(w - 10, 21, 2, 1, '#d9b46a')
    p(0, 28, 3, 2, WOOD_D)
    p(w - 3, 28, 3, 2, WOOD_D)
    // 펼친 책
    p(14, 11, 16, 6, '#f5ecd7')
    p(21, 11, 2, 6, '#d9c7a3')
    for (let y = 12; y < 16; y += 2) {
      p(15, y, 5, 1, '#b8a888')
      p(24, y, 5, 1, '#b8a888')
    }
    // 벼루와 붓
    p(3, 12, 7, 4, '#3a3534')
    p(4, 13, 3, 2, '#1e1a1a')
    p(10, 9, 1, 6, '#9a6a3a')
    p(10, 15, 1, 1, '#1e1a1a')
    // 책탑
    p(32, 6, 8, 4, '#3a5a8b')
    p(31, 3, 9, 3, '#c8384f')
    p(33, 0, 7, 3, '#f2c14e')
    // 램프
    p(42, 2, 2, 8, '#c9a86b')
    p(39, 0, 8, 4, '#3f8f5a')
    p(40, 0, 6, 1, '#6cc287')
  })
  return { layers: [{ canvas: c, ox: 0, oy: TILE - 30 }] }
}

function pile(o) {
  const rand = rng(o.seed)
  const count = 3 + Math.floor(rand() * 3)
  const extra = o.top === 'cat' ? 8 : o.top ? 7 : 0
  const h = count * 3 + extra + 1
  const c = canvas(16, h, (p) => {
    let y = h - 3
    for (let i = 0; i < count; i++) {
      const bw = 10 + Math.floor(rand() * 4)
      const bx = 1 + Math.floor(rand() * (15 - bw))
      const col = pick(rand, BOOK_PALETTE)
      p(bx, y, bw, 3, col)
      p(bx, y + 1, bw, 1, '#f5ecd7')
      p(bx, y, 1, 3, shade(col, -0.3))
      y -= 3
    }
    y += 3
    if (o.top === 'mug') {
      p(5, y - 6, 5, 6, '#e8dcc8')
      p(10, y - 5, 2, 3, '#e8dcc8')
      p(6, y - 6, 3, 1, '#7a4b2a')
    } else if (o.top === 'candle') {
      p(6, y - 6, 3, 6, '#f3e9dc')
      p(6, y - 6, 1, 6, '#ffffff')
    } else if (o.top === 'cat') {
      p(3, y - 6, 10, 6, '#3a3534')
      p(3, y - 8, 2, 2, '#3a3534')
      p(8, y - 8, 2, 2, '#3a3534')
      p(5, y - 4, 1, 1, '#f2c14e')
      p(12, y - 3, 3, 2, '#3a3534')
    }
  })
  const res = { layers: [{ canvas: c, ox: 0, oy: TILE - h }] }
  if (o.top === 'candle') res.candles = [{ x: 7, y: TILE - count * 3 - 8 }]
  return res
}

function gift(o) {
  const c = canvas(14, 12, (p) => {
    p(1, 3, 12, 9, o.color)
    p(0, 2, 14, 3, shade(o.color, 0.15))
    p(6, 2, 2, 10, o.ribbon)
    p(0, 3, 14, 1, o.ribbon)
    p(3, 0, 3, 2, o.ribbon)
    p(8, 0, 3, 2, o.ribbon)
  })
  return { layers: [{ canvas: c, ox: 1, oy: TILE - 13 }] }
}

function plant() {
  const c = canvas(16, 26, (p) => {
    p(3, 18, 10, 7, '#b5653b')
    p(2, 17, 12, 2, '#c9774a')
    p(4, 24, 8, 2, '#8a4a2b')
    // 소나무 분재
    p(7, 9, 2, 9, '#6b3f24')
    p(1, 7, 10, 4, '#2f7a45')
    p(6, 2, 9, 4, '#2f7a45')
    p(2, 12, 6, 3, '#3f9a58')
    p(7, 2, 3, 1, '#4fae68')
    p(2, 7, 3, 1, '#4fae68')
    p(4, 6, 2, 1, '#ffffff')
    p(10, 1, 3, 1, '#ffffff')
  })
  return { layers: [{ canvas: c, ox: 0, oy: TILE - 26 }] }
}

function tree(o) {
  const w = o.w * TILE
  const h = 68
  const cx = w / 2
  const lights = []
  const tiers = [
    [8, 26, 3, 13],
    [18, 42, 5, 18],
    [32, 60, 7, 23],
  ]
  const c = canvas(w, h, (p) => {
    // 줄기 & 트리 스커트
    p(cx - 3, 58, 6, 6, '#6b3f24')
    p(cx - 16, 62, 32, 5, '#c8384f')
    p(cx - 16, 62, 32, 1, '#f3e9dc')
    for (let x = cx - 14; x < cx + 16; x += 6) p(x, 64, 2, 2, '#f3e9dc')
    for (const [top, bottom, h0, h1] of tiers) {
      for (let y = top; y <= bottom; y++) {
        const t = (y - top) / (bottom - top)
        const half = Math.round(h0 + (h1 - h0) * t)
        const jag = y >= bottom - 1 ? ((y + Math.floor(cx)) % 2) * 1 : 0
        p(cx - half, y, half * 2, 1, y >= bottom - 2 ? '#235c35' : '#2f7a45')
        p(cx - half, y, Math.max(1, Math.round(half * 0.5)), 1, y >= bottom - 2 ? '#235c35' : '#3f9a58')
        if (jag) p(cx - half - 1, y, 1, 1, '#235c35')
      }
      // 눈 쌓임
      for (let i = -2; i <= 2; i++) p(cx + i * 4 - 1, top + 2 + Math.abs(i), 2, 1, '#e8f0f5')
    }
    // 반짝이 줄
    for (let i = 0; i < 26; i++) {
      const t = i / 25
      p(Math.round(cx - 14 + t * 30), Math.round(22 + t * 14), 1, 1, '#ffd84a')
      p(Math.round(cx + 18 - t * 38), Math.round(38 + t * 16), 1, 1, '#ffd84a')
    }
    // 장식 공
    const balls = [
      [cx - 6, 20, '#e23b4a'], [cx + 6, 24, '#5aa1e3'], [cx - 12, 34, '#ffd84a'], [cx + 2, 32, '#e23b4a'],
      [cx + 13, 38, '#ffd84a'], [cx - 18, 52, '#5aa1e3'], [cx - 5, 46, '#e85d75'], [cx + 9, 50, '#e23b4a'],
      [cx + 18, 57, '#ffd84a'], [cx - 10, 57, '#e23b4a'], [cx + 1, 56, '#5aa1e3'],
    ]
    for (const [x, y, col] of balls) {
      p(x, y, 3, 3, col)
      p(x, y, 1, 1, '#ffffff')
    }
    // 별
    p(cx - 1, 0, 2, 8, '#ffd84a')
    p(cx - 4, 3, 8, 2, '#ffd84a')
    p(cx - 2, 2, 4, 4, '#ffe88a')
  })
  // 깜빡이는 전구 위치
  const rand = rng(77)
  for (const [top, bottom, h0, h1] of tiers) {
    for (let i = 0; i < 7; i++) {
      const y = top + 3 + Math.floor(rand() * (bottom - top - 4))
      const t = (y - top) / (bottom - top)
      const half = h0 + (h1 - h0) * t - 2
      lights.push({ x: Math.round(cx + (rand() * 2 - 1) * half), y: y + TILE * o.h - h, phase: rand() * 6 })
    }
  }
  return { layers: [{ canvas: c, ox: 0, oy: TILE * o.h - h }], treeLights: lights, star: { x: cx, y: 4 + TILE * o.h - h } }
}

const BUILDERS = {
  shelf, fireplace, sideTable, lampTable, floorLamp, teaTable, desk, pile, gift, plant, tree,
}

export function buildFurniture(o) {
  const seat = buildSeat(o)
  if (seat) return seat
  const b = BUILDERS[o.type]
  if (!b) throw new Error(`unknown furniture ${o.type}`)
  return b(o)
}
